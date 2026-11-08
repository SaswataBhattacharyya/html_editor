# Codex handoff: Mobile App Cloner — finish and validate locally

You have permission to inspect and edit this repository's mobile-cloner feature branch, install ordinary open-source developer dependencies with user approval, create a test Android AVD, register MCP servers for your own Codex environment, run builds/tests, fix issues, and commit only verified fixes to this same feature branch. Do not merge to main until the user approves. Avoid destructive operations to other projects or existing website-clone data. Ask the user only for actions involving personal credentials, permissions, OS admin approval, protected downloads, licensing or genuine hardware requirements.

## Baseline and feature entrypoints

Repository: SaswataBhattacharyya/html_editor
Feature: Mobile App Cloner
Sources:
- index.html (AI Workbench mobile tab)
- js/mobile-cloner.js (frontend)
- js/workbench.js (project event)
- server.mjs (mobile route integration, local-only bind, safe static paths)
- services/android-device.mjs (ADB and emulator)
- services/mobile-cloner.mjs (mobile HTTP API, APK sources, local captures)
- services/mobile-generator.mjs (observed screen spec and Expo starter)
- services/mobile-ai.mjs (Ollama/OpenRouter draft generation)
- test/mobile-cloner.test.mjs
- docs/MOBILE_CLONER.md

Work from branch, pull latest commit, read docs first, and inspect GitHub diff against main. The branch was written without a physical Android runtime: you MUST run and repair all syntax/runtime/device tests locally. Do not pretend the installation is completed merely because source files exist.

## Installation and configuration

1. Detect OS/architecture, hardware virtualization support, disk space, Node/npm and Java versions. Run npm ci, node --test, npm run test:mobile, node --check for each changed JS/MJS file, and start server locally. Fix all failures.
2. Install Android Studio (if missing), Platform-Tools adb, Android Emulator, SDK Build-Tools aapt, JDK, a Google Play-enabled Android Virtual Device. Prefer packages provided by the official Android SDK manager, no unofficial APK downloaders. Do NOT prompt for Google passwords; user signs in directly on device. If virtualization is missing, offer a physical Android phone fallback or APK-only path.
3. Follow current upstream install instructions for https://github.com/mobile-next/mobile-mcp . Register Mobile MCP with Codex; call mobile_list_available_devices and test screenshot/tap/accessibility. Avoid silent use of a remote/cloud device.
4. Follow current upstream install instructions for https://github.com/watsontree/REA . Run npx rea-agents setup after checking actual requirements. Install required headless JADX bridge/JDK and current, security-patched Apktool; verify checksums and licenses. Use REA's Android APK and device guides. Report any unsupported operations honestly.
5. Verify local Ollama access using OLLAMA_BASE_URL and OLLAMA_MODEL; install or pull a compatible model only if resources permit and user approved download size. OpenRouter is optional: use env variables, do not request or commit keys and do not send screenshots or private app content without explicit permission.
6. Fix Docker clean-build failures caused by absent gitignored PinePaper runtime, while preserving optional existing features. Android emulator is host-based; do not require nested Docker virtualization.

## Implementation follow-through

A. Audit all new endpoints for validation, host protection, path traversal, SSRF/private IP resolution and redirects, cross-origin controls, upload size, file signatures, subprocess timeouts and race conditions. Use no shell interpolation. Add per-project isolation, CSRF defenses if remote exposure is anticipated, safe permissions and a bounded job queue for expensive operations. Existing static serving may expose other paths; address responsibly without breaking website clone previews.

B. Fix UI tab switching, project selection, custom events, error handling, device refresh, optional model selector, capture buttons, screenshot tap coordinates and responsiveness. Test empty/no-device and malformed-APK flows; preserve website editor and PinePaper flows. Avoid legacy inline onclick where a listener would suffice.

C. Build a safe automated screen crawler using Mobile MCP/ADB accessibility snapshots. Use deterministic bounded exploration: max screens/actions/depth, visited-state hashes, duplicate suppression and delay. Exclude destructive, payment, email, login, account deletion, external share or system-setting actions. Require human intervention for sign-in, 2FA, permissions and any uncertain action. Collect screenshots, hierarchy, route/action graph and traces into project mobile/analysis. Expose start/stop/status in UI. Never claim unattended full coverage.

D. Make REA integration an optional **agent-side** static inspection step for owned/authorized APKs: manifest, resources, Flutter/React Native/native hints, classes where supported, exported activities, and UI structure. Never bypass license or pinning, dump secrets, exfiltrate accounts, or decompile into publishable proprietary code. Store sanitized findings and links, keep artifacts out of git.

E. Upgrade model orchestration: reuse current Ollama config and optional OpenRouter; add prompt/JSON schema validation, sensible timeouts, token limits, provenance, approval before cloud transmission. Codex/OpenCode are separate agent CLIs, not interchangeable REST model endpoints. Build a reliable generation path from screen captures to a **new** React Native/Expo app. Separate visual fidelity, observed interactions, and guessed backend work. Keep source evidence traceability; do not claim feature completeness.

F. Validate generated Expo project versions with npx expo install --fix, npx expo-doctor, then run on Android emulator and generate debug APK. Ensure build output is exportable. Generated code is untrusted: review generated App.js and dependencies before execution; run in sandbox/test emulator.

G. Add screenshot similarity comparisons at matched device viewport, report annotated differences for the original versus reconstruction. Add regression tests and fixtures; make model-generated output reviewed, not automatically marked successful.

H. Verify HEVY with *user-owned or permitted account and access only*. User may manually open HEVY from Play and log in; do not ask for credentials. Start with screenshots and interaction map for workout home, exercise list, start workout and set logging; work incrementally. The recreated app should use original branding, design assets, own database and user-approved features. Do not promise HEVY's private backend or social network works in the clone.

## Acceptance tests (report each pass/fail)

- Website cloner regression: clone/preview/import still function with unchanged behavior.
- Mobile project creation; Play package ID validation; listing opens on emulator; install requires user's Play interaction.
- Direct APK upload, public HTTPS URL (no redirects), metadata detection, install and launch; refusal of invalid or malicious inputs.
- Device serial validation and multiple-device selection.
- Manual authentication pause/resume without storing passwords.
- Captures of 3+ different screen states, bounded crawler (if implemented), sanitized hierarchy, screen spec.
- Generate Expo starter; generate Ollama draft (if available); OpenRouter only when configured/approved.
- Expo project npm install, lint/build, Android launch; screenshot comparison with source.
- No secrets/APKs/screenshots committed to Git; local-only API access; no unauthorized external traffic.
- Document exact unimplemented functions and error logs.

## Delivery back to user

Provide: OS/device setup summary, tools and versions actually installed, config changes, test outputs, HEVY screens verified, sample generated Expo project path, screenshot comparison results, known limitations, commits/PR links, and only unavoidable manual actions (Google sign-in, account creation/2FA, SDK licenses/OS prompts, hardware virtualization/phone cable).

If blocked by hardware/network access, do all offline lint/unit/API tests and leave a precise blocker report rather than inventing results. Never overwrite another project folder. Do not push directly to main without approval.
