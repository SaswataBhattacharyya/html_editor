---
name: runtime-site-cloning
description: Clone and debug interactive websites whose UI depends on JavaScript modules, CSS assets, WebGL, WASM, or browser-loaded media; verify the local package against source behavior instead of treating a screenshot as a clone.
---

# Runtime-heavy website cloning

Use this skill when a page captures correctly but its local package is unstyled, stuck on a loading message, missing a canvas/model, or loses interactive behavior. Keep the user's goal to study and edit a local copy; do not claim pixel-perfect or complete cloning unless the checks support it.

## Workflow

1. Inspect the source capture and existing package before changing anything. Preserve the project identity and use a separate project when the source URL differs.
2. Use Playwright on the source to record the final URL, viewport, console/page errors, failed requests, response status/content type, screenshot, and a small set of relevant interactions (load, wait, pointer, scroll, and the primary app action). Distinguish page chrome from a screenshot/video replay.
3. Follow the browser's dependency graph: HTML references, CSS `url()`/`@import`, modulepreload and module imports, dynamic chunks, fonts, images, model files, WASM, workers, and resources fetched only after interaction. Preserve the original directory hierarchy and module-relative filenames. Rewrite references to safe paths inside the package; do not flatten names if that breaks relative imports or runtime paths. Do not rewrite arbitrary substrings in JavaScript bundles: URL text can be a namespace, regex, code, or unrelated origin. Localize observed requests at the request boundary or parse URL literals with a syntax-aware tool.
4. Treat authentication, cross-origin/CORS APIs, service-worker behavior, server-side data, and protected assets as explicit limitations. Do not bypass access controls. A recorded video can document motion but is not a substitute for the live interface.
5. Open the package through the local HTTP server (not `file://`) and repeat the same viewport/interactions in Playwright. Check console errors, failed/local requests, loaded styles/scripts, canvas/model readiness, and visible app state. Compare source/local screenshots at matched sizes and states.
6. Make the smallest shared cloner fix that addresses the evidence. Add a regression check for path preservation and runtime readiness where practical, then re-run the target clone and nearby supported clone paths.

## Acceptance and reporting

- Report separately what works in the preview, what is editable in the editor, and what remains external/server-dependent.
- Do not call a clone successful merely because HTML, a screenshot, or an MP4 was saved.
- Keep request traces and clone warnings with the project so missing resources can be diagnosed later.
- Preserve the last usable package on failed refreshes; do not overwrite another site's project because it happens to be selected.

## Repository implementation notes

The local cloner is implemented in `server.mjs`; source-page capture is `tools/browser_clone.py`. HTML and CSS dependencies must be mirrored under package-relative paths so `.assets/...`, `styles/...`, relative module imports, and CSS fonts/media continue resolving. Playwright records successful same-origin runtime responses (including JSON manifests, dynamic chunks, previews, models, and media) under their source paths. The server localizes observed requests through a fetch/XHR bridge while leaving application scripts unchanged. Runtime capture is limited to resources requested during the browser capture window and exercised interactions; extend probes for lazy, route-specific, or user-triggered content. Source-side HTTP errors and failed requests are retained as diagnostics so upstream defects are not misattributed to the clone.

## ActionForge case: missing CSS and runtime assets

- The prior clone flattened CSS and module files into `assets/` while leaving source-relative imports such as `styles/base.css` and `.assets/app-*.js` unchanged. It also only crawled HTML references, so the animation manifest and files fetched by app JavaScript were absent.
- Preserve URL directory paths and module filenames; crawl CSS `url()` and `@import`; capture successful same-origin Playwright responses to package-relative files; localize observed dynamic fetch/XHR requests without text-editing bundled scripts.
- Follow same-origin static and dynamic ES module imports from captured JavaScript bundles. User actions often import code lazily (for example, export encoders when Download is clicked); request-time capture alone will miss those modules until the corresponding action is exercised.
- Verify both styles and actual app readiness in local Chromium. The source's browser request trace is the reference for dynamic manifest/model/preview URLs; a saved screenshot alone does not establish that the local app works.
- ActionForge's first local replay still lacked its 3D rig because broad path rewriting changed Three.js's `http://www.w3.org/1999/xhtml` string used by `createElementNS`. Keeping scripts byte-for-byte intact restored the WebGL canvas and mannequin.
- Selecting a clip fetched its animation GLB only on demand. The source capture samples a safe clip selection (`Dance Loop`), fetches the conditional mannequin thumbnail, and records failed requests/HTTP errors. The ActionForge adapter materializes every rig, prop, and clip GLB listed in the captured manifest so any clip can play or export offline; validate multiple selections and an export action.
- The export button dynamically imports a separate GLB writer chunk on demand. Package the same-origin module dependency graph and verify that selecting a clip produces a real browser download; checking the preview alone will not expose a missing export dependency.
