# Website cloner failure analysis

Updated: 2026-10-24

## Incident summary

The GSAP clone originally tested at `https://gsap.com/scroll/` and a later clone of `https://openart.ai/` both used project folder `projects/gsap-059a853c`. The folder metadata now identifies it as OpenArt. A later GSAP homepage clone exists separately at `projects/gsap-9b09848a` (`https://gsap.com/`). The latest screenshot is from that homepage clone, not the earlier `/scroll/` page.

Two independent defects explain the reports:

1. The clone action wrote into whichever project happened to be active, even when the URL field named a different website. It changed that project's `sourceUrl` and replaced its package. There was no URL identity check or overwrite warning.
2. For non-Spline sites, the preview injected a Playwright-recorded hero MP4 under the original live DOM. The video contains the hero's text and controls too, so it can visibly double the tagline and buttons while the original JavaScript also animates the page.

The first GSAP repair fixed module aliases and verified `window.gsap` plus 28 ScrollTriggers for `/scroll/`. That confirmed script execution, but it did not prove screenshot fidelity or verify the later homepage URL. The earlier completion statement overstated what those checks established.

## Evidence from this incident

| Observation | Evidence | Conclusion |
| --- | --- | --- |
| The original GSAP project folder was reused for OpenArt | `projects/gsap-059a853c/project.json` has `name: OpenArt`, `sourceUrl: https://openart.ai/`; its last job is the OpenArt clone. | Clone routing trusted the selected project over the URL identity. |
| A separate homepage clone was created later | `projects/gsap-9b09848a/project.json` has `name: GSAP`, `sourceUrl: https://gsap.com/`; its completed job has 471 referenced local assets. | This is the project shown in the latest screenshot. It is not the prior `/scroll/` clone. |
| The local package includes an editor-injected MP4 hero | Its `index.html` contains `html-editor-motion-replay` CSS/script and points to `assets/hero-motion.mp4`. The injection puts the video behind the live page content. | Duplicate hero content is expected when the recording and live DOM contain the same text/buttons. |
| The old check was insufficient | It checked GSAP presence and trigger count, but not the homepage, duplicate overlays, visual comparison, all requests, or scroll states against the source. | Runtime initialization alone is not an acceptance test for a faithful clone. |

## Fixes made in the cloner

- A clone URL that does not match an existing project's source URL now selects a matching project or creates a separate project automatically. This prevents a changed URL from silently replacing the active project's website.
- The clone API rejects a request when the project already has a package for a different normalized URL. The response explains that a separate project is required.
- Recorded motion remains a separate reference artifact. It is no longer injected below the live preview DOM or into the editor import, which caused duplicate text and controls.
- Clone API errors are shown in the UI instead of being reduced to a generic HTTP status.

## Remaining cloner weaknesses to address

1. **Non-transactional package writes.** A retry removes the package's asset directory before the new clone is complete. A failed run can leave the last good package incomplete. Future change: write into a per-job staging directory and atomically promote it after validation; keep the previous package until promotion succeeds.
2. **Incomplete browser network capture.** Static HTML extraction misses assets loaded later by JavaScript, CSS imports, lazy loading, and interaction states. The Playwright worker currently saves the rendered HTML and Spline scene/WASM responses, but does not package every successful same-origin response.
3. **Asset rewriting is heuristic.** Prefix aliases and string replacement can still fail with duplicate basenames, runtime-generated URLs, import maps, workers, service workers, CSS modules, source maps, or URLs assembled by JavaScript.
4. **External and protected resources.** Cross-origin requests, authentication, bot protections (including observed 403s), APIs, and server-rendered routes cannot be cloned from public HTML alone.
5. **Animation evidence is too shallow.** A page load plus one pointer sweep and a small scroll sample does not capture timeline progress, sticky/pinned states, delayed motion, hover/focus/click triggers, reduced-motion variants, or responsive breakpoints.
6. **Visual acceptance is missing.** The pipeline does not yet compare source and local screenshots at matched viewport, scroll, pointer, and elapsed-time states or gate completion on a visual threshold. The source capture and local package preview are distinct paths and must both be tested.
7. **The editor import path has different capabilities from preview.** GrapesJS does not automatically reproduce every script-driven page runtime merely by importing body markup and CSS. Preview fidelity and editor editability must be reported separately.
8. **Project selection state is user-visible but weakly coupled to the URL field.** The UI needs to keep the selected project name/source beside the clone URL and make project switching explicit, even with the new automatic protection.

## Model-selection guidance

A stronger reasoning model can help classify the page and propose adapters, but it cannot retrieve blocked resources or make a static clone equivalent to a private backend. Evaluate candidate models on a fixed set of saved source traces and expected diagnoses, not on persuasive explanations alone.

Score each candidate on:

- Correctly distinguishing native page JavaScript, video replay, WebGL/Spline scenes, and server-side behavior.
- Finding mismatched project identity and destructive overwrite risks before editing files.
- Mapping runtime network requests back to page assets with correct MIME, URL, and dependency relationships.
- Designing repeatable scroll, pointer, hover, click, timing, viewport, and reduced-motion probes.
- Explaining evidence and uncertainty, including when exact reproduction is impossible.
- Producing small, testable patches and following the project's safety constraints.

Required benchmark cases should include GSAP `/scroll/`, GSAP homepage, Spline homepage, a page with lazy-loaded media, a page with a protected 403 resource, a page with duplicate basenames, and a site that uses a canvas/WebGL scene. For each, retain source/local screenshots and request traces at fixed browser sizes and interaction states. Choose a model only after blind scoring of these cases and a regression pass on previously supported clones.

## Acceptance checks for this incident

- Existing GSAP and OpenArt folders were read back after the run: `gsap-9b09848a` is `https://gsap.com/`; `gsap-059a853c` remains `https://openart.ai/`.
- A cross-site POST into the populated OpenArt project returned HTTP 409 and named both source URLs; its manifest remained OpenArt.
- Playwright UI test with a dummy `https://fresh-site.example/` while OpenArt was active intercepted a create-project request and then a clone request for the newly returned project ID. The active project changed to that new ID; no real dummy-site clone was started.
- Fresh GSAP homepage job `1791813485146-91341523` completed with 471 local assets. The package no longer contains the injected replay style/script or `.html-editor-motion-video` element.
- Headless Chromium at 1440×900 found one `h1` (“Animate Anything”), `window.gsap === true`, 44 ScrollTriggers, and no injected replay nodes. At `scrollY=700`, GSAP-managed element transforms were present. The screenshot was visually inspected; the headline and tagline no longer duplicate.
- The browser still reports the GSAP community-header fetch blocked by CORS (`/community/index.php?...controller=api`). Google Analytics also attempts a request that aborts in local preview. These are external runtime dependencies, not local static-asset failures; they are recorded as limitations, not suppressed.
- This run validates the homepage, not a new `/scroll/` clone. The prior `/scroll/` run's 28-trigger result is historical evidence only and needs a separate fresh regression run before claiming that route is currently verified.

## Fixes made during this run

- Clone requests now normalize source URLs, choose an existing project only when the source URL matches, and otherwise create a separate workspace.
- The server rejects cross-site writes to an already-populated project with HTTP 409.
- Playwright motion video remains a reference artifact; it is not composited into the live clone or editor canvas. This prevents doubled copy when the source DOM already contains animated text/buttons.
- Clone startup errors now show the actual API failure instead of falsely saying every failure means the backend is unreachable.

## ActionForge app clone (2026-10-24)

The user provided `https://actionforge.app/` and compared the styled, interactive source app with a local page that had default browser styles and a nonfunctional viewport. This was a different failure from the older GSAP motion issue: the static crawler missed runtime dependencies, and a later generic JavaScript rewrite corrupted Three.js initialization.

### Findings and fixes

- Preserved source path hierarchy for HTML/CSS/static assets, then added Playwright capture of successful same-origin browser responses. This recovered `styles/base.css`, `styles/library.css`, the animation-library manifest, preview media, fonts, and the mannequin rig/model assets.
- Added a fetch/XHR request bridge for captured same-origin resources. Removed arbitrary bundle-string rewriting: it had changed Three.js's `http://www.w3.org/1999/xhtml` namespace passed to `document.createElementNS`, which prevented the rendering canvas from being created. Keeping JavaScript files unchanged restored the app's WebGL viewport.
- Added an ActionForge capture probe that selects the safe `Dance Loop` clip. This triggers its lazily fetched animation GLB, which initial page-load capture misses. Source captures now include HTTP errors and failed requests in the browser report.

### Playwright evidence

- Refreshed project `actionforge-a334df2b` from the ActionForge URL; final completed clone job `1792835128958-9c068b11`, 52 packaged assets, source browser capture completed.
- Local Chromium at 1440×1000 renders both stylesheets (81 and 823 CSS rules), the dark ActionForge UI, the 85-clip animation library, and a live WebGL canvas (733×842); no page exceptions or failed network requests.
- Visually inspected final screenshot `/tmp/actionforge-local-final.png`: mannequin is rendered in the central viewport, thumbnails populate the clip browser, and the full application chrome is styled.
- The final source trace records 49 successful runtime responses / 3.76 MB, including conditional `mannequin.webp` and `dance_loop.glb` (72,336 bytes). The capture probe selects the safe `Dance Loop` clip to trigger its lazy-loaded GLB.
- Final local Playwright checks found no page errors or failed requests; selecting `Dance Loop` exercised its GLB successfully. The only remaining HTTP 404 is `assets/animation-library/animals/list.json`, which the source capture also recorded as 404. It is an upstream issue, not a clone omission.

### Limits and follow-up

- This is a local reproduction of the public app shell and observed assets; account APIs, saved projects, imports/exports that depend on service endpoints, and unobserved animation assets still depend on the source backend or additional interaction probes.
- Do not claim exact parity. Compare source and local screenshots at matching viewport/state and retain source/local request errors. Add probes for other named clips or app routes when those are part of the user's target workflow.
- The reusable repository skill is `skills/runtime-site-cloning/SKILL.md`. It requires tracing network dependencies, testing actual runtime readiness and interactions, preserving JS bundles, and distinguishing source failures from clone failures.

### ActionForge lazy clip and export regression (2026-10-24)

The next ActionForge check showed two more layers that the earlier “Dance Loop works” verification did not cover:

1. Every clip card loads its GLB only when selected. The first package captured the mannequin and one sampled clip, so selecting `Chest Open` or another unsampled animation requested a missing local file and showed a 404 overlay.
2. The Download action dynamically imports an ES module chunk only after the button is clicked. Even after all clip GLBs were present, the export failed because that chunk had not been requested during browser capture.

The cloner now reads the public ActionForge library manifest and packages all referenced clip, rig, and prop GLBs. It also follows same-origin static and dynamic ES module imports from captured scripts, retaining the source paths so the runtime bridge can localize the requests. The final clone job `1792836235156-ba62f0a1` completed with 152 local assets; the package contains all 94 manifest-listed GLB records with none missing, and the lazy export chunk `scripts/chunk-SNZBGXSF.js` is present.

Local Playwright exercised all 85 animation cards. It observed 88 successful GLB responses across 86 unique URLs; `idle_loop` was already loaded by initial app startup, so its subsequent click correctly reused the loaded model and emitted no new request. No GLB 404s or page exceptions occurred. Selecting `Chest Open` and clicking Download produced `chest_open_anim_only.glb` (153,864 bytes) with no Playwright errors. The only known 404 remains the source-origin `animals/list.json` request, which is not required by the 85-clip library.

This incident reinforces the review rule: validate representative lazy interactions and one real export, not only initial render and one animation. More generally, user-triggered dynamic imports need dependency-graph capture as well as runtime request capture. The cloner report now updates its final asset count and warnings after browser assets are added.
