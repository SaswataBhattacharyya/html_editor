# Codex handoff: authenticated 3D website-clone capture

## Scope already implemented in this branch

- Opt-in "Use interactive login" in `index.html`, clone orchestration in `js/workbench.js`.
- `server.mjs`: interactive capture before anonymous static crawling; localhost-only sign-in continuation endpoint; model entries in manifest; default localhost binding and Docker override.
- `tools/browser_clone.py`: visible Chromium with one-time continue signal (no Playwright storage-state file), same-origin network capture, recognized cross-origin 3D responses, GLB magic validation, best-effort canvas detection and query redaction.
- UI lists captured 3D files for local download.
- Captured **network model files only**; no generic Three.js scene graph export / WebGL buffer reconstruction.

Do not delete existing cloner behavior or silently switch existing public clone behavior.

## Do this first

1. `git fetch origin feature/authenticated-3d-clone && git checkout feature/authenticated-3d-clone`.
2. Read `skills/runtime-site-cloning/SKILL.md`, `plan/cloner_failure_analysis.md`, `README.md`.
3. Run `node --check server.mjs`, `node --check js/workbench.js`, `python3 -m py_compile tools/browser_clone.py`.
4. Install local dependencies: `npm install`; `python3 -m pip install playwright`; `python3 -m playwright install chromium`; start with `npm start`. Ensure `HTML_EDITOR_HOST` is unset or set to `127.0.0.1`.
5. Fix any syntax, import, runtime or local-display problems. **Avoid writing actual passwords, cookies, storage_state or auth headers to project manifests, reports, logs or Git.**

## Local acceptance fixtures and integration tests

Create controlled local test websites (NOT live third-party accounts) for:

A. Public page loading a valid `.glb` via fetch/XHR after page load; ensure existing public clone still runs, captures 3D, and lists a downloadable file with `glTF` magic.
B. Login-protected page with simple cookie-based login and a GLB request only after authentication. Start interactive clone, let user log in in the visible browser, then click **Continue after login**. Check HTML, screenshot, asset, manifest, model count and local preview. Verify no cookies or tokens are exported. Test rejecting continuation before/after the correct job state.
C. Login redirects (`/login` to `/dashboard`, plus optional subdomain redirect); ensure asset resolution and final source URL work.
D. Model loaded only after clicking a nondestructive UI control; user can click it in the browser before pressing Continue.
E. Cross-origin model served by a local test CDN. Confirm it is downloaded under `assets/external-models/`, listed in manifest and that preview can resolve it through fetch/XHR mapping. Test a model URL with a signed query string (redacted from reports), different 3D URLs with the same basename, invalid GLB magic and oversized files.
F. `.gltf` referencing external `.bin` and textures; evaluate what is missing. Add a narrow dependency-aware downloader if it is needed, with explicit permission and resource limits.
G. Canvas-only Three.js scene with no GLB network request: report 'canvas detected, no exportable model captured' instead of falsely claiming it exported GLB.
H. Regression clones of GSAP homepage, ActionForge animation viewer and Spline scene if accessible and authorized; compare rendered DOM, GLB selection/export, CSS/JS loading, console errors, screenshot fidelity, and original clone-to-editor import.

## Review and fix these known high-risk issues

- **Interactive browser spawn:** Playwright `headless=False` needs a display; handle absent DISPLAY/X11, Windows, macOS and no-GUI Docker. Show actionable errors, never hang.
- **Authentication lifecycle:** timeout, user closing browser, user pressing Continue early, stale signal, multiple jobs, OAuth popup/redirect, browser crash; ensure jobs correctly transition `queued -> awaiting-login -> running -> completed/failed`.
- **Captured asset integrity:** verify that authenticated files are not overwritten by anonymous requests. Missing private assets must become warnings rather than silent broken links. Handle redirects, relative URL resolution, CSS, XHR/fetch, signed URLs and CDN models.
- **Security:** local-only mode, no credential/token leakage in reports, browser state, URLs, errors or downloaded ZIPs. **Captured HTML, screenshots and authenticated API responses can contain sensitive data**; warn users and isolate previews. Consider disabling unsafe outgoing requests/scripts in imported HTML.
- **Snapshot and package:** ensure `rendered.html`, `index.html`, `runtime-assets.json` and `manifest.json` agree. Check filename collisions, duplicate response paths, nested assets, manifest asset counts and MIME types. Handle failed-clone transactional staging to protect the last good package.
- **3D quality:** inspect a GLB in Blender; check mesh, UVs, textures, skeleton and animations. If they were not present in the source bytes, don't claim to have recovered them.
- **No generic live scene extraction yet:** optional next step only for accessible, authorized Three.js scenes, via version-compatible `GLTFExporter` with limitations. Do not bypass paywalls, authentication or DRM.

## Optional second phase: multiple authenticated pages

Current flow captures the **one current page** in the interactive browser. For user-selected additional pages, add an explicit URL/path list scoped to the signed-in origin and navigate with the same ephemeral browser context. Do not indiscriminately crawl authenticated links or trigger destructive actions. Store pages separately and preserve routes in the package manifest.

## Definition of done

- All integration tests pass locally with evidence; main clone workflow remains intact.
- User can open a visible browser, sign in by themselves, navigate to an authorized page, click Continue and get its network-loaded 3D files listed with working downloads.
- A local clone displays the expected web content and compatible GLB-loaded 3D scene. Clearly report when full WebGL extraction is unsupported.
- Screenshots/console/network traces compared for source vs clone, with no unapproved external network side effects.
- Apply and commit fixes to this feature branch; send a detailed summary of tested platforms, passing/failing cases, edited files and any remaining restrictions. Open or update PR for review; **do not merge directly into main**.

## Validation progress (2026-11-01)

- Checked out `feature/authenticated-3d-clone` and reviewed this handoff, the runtime cloning skill, the failure analysis, README, and the implementation already present on the branch.
- Added Playwright-backed local coverage for extensionless cross-origin GLB responses, rejection of unrelated binary data, download path safety, GLB signature checking, size limits, and query-string redaction. Four tests pass using `/snap/bin/chromium`.
- Authenticated capture now discards ordinary fetch/XHR response bodies and retains only validated 3D payloads. Authenticated refreshes back up an existing usable package and restore it if cloning fails. Canvas-only captures are explicitly reported as lacking an exportable model.
- Playwright smoke check against the host editor passed: clone URL and interactive-login controls were present, Continue was hidden before a job, and there were no frontend page errors.
- Blender is not installed in the current host environment, so Blender import validation remains pending.
- The initial Meshy job (`1793540866053-84b928c6`) was stopped before login because it predated the final privacy changes.
- The next job (`1793541209336-d340bdf3`) failed after its browser window closed while waiting for login. The wait now converts Playwright’s `TargetClosedError` into a clear “Login browser was closed” failure; a regression test covers this lifecycle case.
- Meshy authenticated capture completed on host port `3001`: project `meshy-authenticated-rig-validation-2-7e40faf4`, job `1793541513918-a680a43f`. The saved screenshot matches the requested Meshy workspace and shows the anatomical model selected (768,754 faces / 384,297 vertices).
- The capture detected and saved one valid GLB, but inspection shows it is a different static asset named `minstrel`: 22,979 vertices, one mesh, one material and embedded texture, with no skin/skeleton and no animations. It is not the requested anatomical rig. Do not count this as successful extraction of the requested asset.
- The browser report saw the likely page model payload at `assets.meshy.ai/.../output/model.meshy`, but Chromium evicted its response body before Playwright could read it. That proprietary `.meshy` payload was not saved. The captured `minstrel` GLB therefore does not satisfy the target, even though the login and page screenshot succeeded.
- To get the exact asset with the existing capture path, repeat the interactive capture, use Meshy’s normal Download/Export control for the selected anatomical model in the visible Chromium window, then press **Continue after login**. The worker already saves user-triggered model downloads (`.glb`, `.gltf`, etc.) into the project. Check Meshy’s UI for any credit/plan prompt before confirming an export; no purchase or credit-consuming action was automated.
- Verified the captured GLB header and internal glTF JSON/chunks. The saved capture screenshot is `projects/meshy-authenticated-rig-validation-2-7e40faf4/previews/browser-capture.png`; local project preview exists, but a static authenticated web-app snapshot is not expected to recreate Meshy’s interactive application. Blender import validation remains pending because Blender is not installed in the host environment.
- Local Playwright regression suite currently has five passing tests (including real Chromium coverage), and the editor UI smoke test passed. The real Meshy target extraction remains **not passed** until the official export/download is captured and its mesh/skeleton/animation data inspected.

### Meshy decoder capture retry (2026-11-01)

- Fixed authenticated runtime capture so same-site and cross-origin WASM responses are retained as decoder inputs, while unrelated authenticated fetch/XHR bodies remain excluded. The response listener now also observes context-level responses so worker-owned decoder requests are visible.
- Added regression coverage for WASM URL/MIME detection, both authenticated-response filters, same-origin and CDN-hosted WASM capture, and rejection of unrelated cross-origin binary responses.
- Chromium capture completed for project `meshy-decoder-recapture-2026-11-01-430d5b42`, job `1793548672971-a0f1bd98`. The capture screenshot shows the requested anatomical model selected (768,754 faces / 384,297 vertices).
- Captured the task-specific 3.7 MB `model.meshy`, Meshy's 489,734-byte `resource/decrypt/mesh_loader.wasm`, and a 285,747-byte Draco WASM decoder. Also captured the unrelated `minstrel` GLB; it remains a sample asset and is not the anatomical target.
- The `loader-worker.min.js` requires an authorization call with `hostname`, `timestamp`, and `signature` before processing the `.meshy` payload. Those authorization values, cookies, and session credentials were not saved. Capturing the decoder and payload therefore does not yet prove an offline decode or produce a standard GLB.
- Capture regression suite passes with system Chromium (`HTML_EDITOR_CHROMIUM_PATH=/snap/bin/chromium python3 -m unittest tests.test_authenticated_3d_capture`: 7 tests), plus Python compile, Node syntax check, and `git diff --check`.
- Current result: decoder inputs are now captured, but target geometry extraction and Blender validation remain open. Next safe experiment is to observe only the successful decoder output in the live authorized page, without recording authorization messages, cookies, or tokens. This requires a fresh interactive browser run; rotating the model is not needed to capture the already loaded model payload.
