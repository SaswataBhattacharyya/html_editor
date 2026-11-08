# Mobile App Cloner — local Android workflow (initial implementation)

This is an **observational Android UI reconstruction tool**, not an APK source-code recovery service. Work only with applications you are authorized to examine and reproduce. Never bypass Google Play licensing, paid content, certificate pinning, login protections, or private backends. Do not reuse third-party trademarks, assets, or proprietary source in a published app.

## Implemented in this branch

- Dedicated Mobile App Cloner page inside AI Workbench, reusing existing project selection.
- Google Play URL validation and package-id extraction; launches the listing **on the selected Android device**, where the user installs the app.
- APK file upload (up to 250 MiB) or direct public HTTPS APK fetch (no redirects, no private hosts); basic APK ZIP detection and SHA-256.
- ADB device selection, configured AVD listing and start, APK installation, package presence check, app launch.
- Manual login pause/resume, taps on a captured screenshot, back/home/swipe, screenshot + best-effort accessibility hierarchy capture.
- Captures locally under project mobile/captures; password/edit-field text excluded from structured UI captures.
- Offline screen-spec synthesis and a basic editable Expo/React Native screen/navigation starter.
- Optional AI-generated React Native App.js draft via local Ollama or explicitly approved OpenRouter; only reduced observed UI labels are sent to the model. Generated code is untrusted and must be reviewed.
- Mobile capability diagnostics. No new runtime npm dependencies for the editor itself.
- Focused Node tests via npm run test:mobile.

**Not implemented yet**: full AI-agent autonomous exploration, direct Mobile MCP or REA calls from the browser backend, full native UI fidelity, backend replication, automatic route discovery, build-verified AI code generation, APK build, ZIP export, visual-diff acceptance, and emulator provisioning. Those need Codex's local implementation and device-based validation. The Expo generator is a functional **starter**, not a clone.

## Local host setup (prefer over Docker for Android)

1. Install Node.js 22+ and run npm ci in the repository.
2. Install Android Studio, Android SDK Platform-Tools (adb), Android Emulator, Android SDK command-line tools, and a Google Play-enabled Android Virtual Device (AVD). Alternatively connect a physical Android device with USB debugging enabled and authorize the ADB connection. Android virtualization must be available for emulator use (KVM on Linux; appropriate hypervisor on Windows/macOS).
3. Ensure adb and emulator are on PATH, or set ANDROID_ADB_PATH / ANDROID_EMULATOR_PATH to absolute executables. Check adb devices -l and emulator -list-avds.
4. Optional APK inspection: install aapt from Android SDK Build-Tools. Set AAPT_PATH if needed. Install Java JDK, JADX and Apktool if static analysis is wanted.
5. Run npm run test:mobile and npm start. Open http://127.0.0.1:3000. The host binds to loopback by default. Override HTML_EDITOR_HOST only on a trusted, appropriately protected network.
6. Create a project using Project, open AI, choose Mobile App Cloner.
7. For Play: enter the app's Play URL, Prepare, select/start a device, Open in Google Play, and install via the official Play UI. For an APK: upload the APK or provide a direct public HTTPS URL, Inspect APK metadata, and Install APK.
8. Verify Installed, Launch, then login **manually** on Android. Click Resume After Login.
9. Open each permitted screen manually, Capture Screen + UI, name it. Build Screen Spec and Generate Expo Starter.
10. Optionally Generate AI Draft with Ollama on your machine (requires running Ollama with the selected model), or OpenRouter (requires OPENROUTER_API_KEY, model and explicit per-run consent). Generated draft replaces App.js; a baseline copy is kept as App.starter.js. Review model code before running.
11. Open projects/PROJECT_ID/mobile/generated/expo-starter locally. The generated source needs npm install and npx expo install --fix before running npx expo start --android. Codex should update versions to a compatible Expo SDK for the user's environment.

For APK-only static inspection, the emulator is not required; uploading and inspecting with aapt works offline, but navigation captures require a running Android device.

## Mobile MCP / REA (agent side; not vendored)

Mobile MCP is a separate MCP server for Codex or another AI agent. Use the latest **documented** agent installation instructions from its upstream repository, not an embedded copy. Example Codex registration, confirm with codex mcp add --help first:

    codex mcp add mobile-mcp -- npx -y @mobilenext/mobile-mcp@latest

REA is also installed externally for Codex:

    npx rea-agents setup

REA Android APK analysis requires a full JDK and the headless JADX bridge as documented by upstream. Its installer **does not provision all Android-specific tools**. Verify required versions and checksums. Apktool is optional; use a secure current version. The upstream instructions are at:
- https://github.com/mobile-next/mobile-mcp
- https://github.com/watsontree/REA

The editor's built-in ADB capture can work before MCP setup. Codex should connect the agent tools to captured project evidence and validate that tools genuinely work; do not claim they are integrated merely because configuration files exist.

## API

- GET /api/mobile/capabilities, /api/mobile/devices, /api/mobile/avds
- POST /api/mobile/avds/start with JSON {name}
- GET /api/projects/:id/mobile
- POST /api/projects/:id/mobile/start with {sourceType:"play",playUrl} or {sourceType:"apk",packageName?}
- POST /api/projects/:id/mobile/apk with raw APK bytes
- POST /api/projects/:id/mobile/apk-url with JSON {url}
- POST /api/projects/:id/mobile/inspect
- POST /api/projects/:id/mobile/open-play, /install, /verify, /launch with {serial,packageName?}
- POST /api/projects/:id/mobile/pause, /resume
- POST /api/projects/:id/mobile/control with {serial,type:"back"|"home"|"tap"|"swipe", coordinates?}
- POST /api/projects/:id/mobile/capture with {serial,label}
- POST /api/projects/:id/mobile/analyze, /generate, /generate-ai (model provider: ollama or openrouter)

## Security and limitations

- **Use only on the owner's local machine.** Existing editor endpoints have no authentication; binding to 127.0.0.1 mitigates public exposure but does not protect from all malicious local/browser-origin requests. Codex should add authentication, CSRF protection, hardened resource serving, and upload permissions before remote deployment.
- APKs are untrusted software. Prefer disposable Android emulators. Do not run APK install or decompilation with elevated privileges. Confirm file provenance and inspect permissions. API excludes private network targets for URL downloads, rejects redirects and caps file sizes; Codex should harden archive validation and redirects/DNS against attacks.
- Captures can contain sensitive user information even after edit-field redaction. Avoid capturing passwords, private messages, payment details or account recovery. Data is stored under projects/ and excluded by .gitignore; **do not commit captured files, accounts or secrets**.
- Never send recorded personal information, APK binaries, authentication tokens or screenshots to external AI models without explicit user approval, filtering and a documented privacy boundary.
- The Android device image may not have a Play Store or may fail Play Protect, Play integrity, native ABI, split APK or app compatibility checks. These are genuine runtime limitations, not bugs the extension should circumvent.
- Use the user-facing editor for manual install/login. Codex can automate permitted, non-destructive navigation with Mobile MCP; require human confirmation for sensitive actions.
- Play Store URLs are not direct APK downloads. No unofficial downloader or paid-app bypass is used.

## Local checks for Codex

1. npm ci; npm run test:mobile; node --check server.mjs; node --check services/*.mjs (check individually); confirm npm start shows /api/health.
2. Verify Website Cloner and GrapesJS remain unchanged visually and functionally.
3. Verify API rejects malformed Play URLs, non-APK inputs, invalid serials, oversized uploads and private/redirected APK URLs; test with local fixtures.
4. Test Android device discovery, AVD startup, package installation, Play link navigation, manual login pause/resume, capture, spec and Expo starter using a permitted test app before HEVY.
5. Test every captured screen and compare screenshots from original vs generated Expo output. Keep error traces separate from success criteria.
6. Test Windows and Linux PATH configuration, headless/no-device behavior, ADB unauthorized errors, source package isolation and privacy protections.
7. Add robust built-in MCP exploration with a bounded action policy, preflight permissions, and explicit human gates if possible.
8. Run expo-doctor, confirm Expo-compatible React Native versions, build and install a sample generated Android app.
