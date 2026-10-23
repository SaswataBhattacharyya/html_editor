# App Cloner — Product Requirements Document

**Product:** Mobile App Cloner, an internal plugin for html_editor  
**Version:** 1.0 planning draft, 2026-10-23  
**Target environment:** Locally executed on Ubuntu Linux / NVIDIA DGX Spark ARM64; physical Android phone via ADB  
**Status:** Implementation specification, not evidence of a working plugin  
**Reference acceptance app:** Hevy (authorized personal evaluation only)

## 1. Executive summary

Add a **Mobile App** option beside the existing **Website** mode inside the AI Workbench. A user enters an app name, Play Store URL, package name, chooses an installed app, uploads an authorized APK, or supplies screenshots. After selecting a source and pressing **Clone App**, the backend discovers the app, guides required installation/login, explores observable screens/workflows through Mobile MCP, writes an evidence-linked application specification, asks a configured coding agent to generate an isolated Expo/React Native project with AI App Cloner, and validates it with Maestro and screenshot comparison. User previews, improves and exports generated **source code** and, when host build support is proven, a test APK.

The UI must be simple; engineering and uncertainty must remain explicit. This tool **cannot guarantee a complete copy of an arbitrary proprietary app** from a store name or APK. Real server-side features, paid access, original source, assets, private APIs, and remote databases cannot be inferred reliably. All reports distinguish observed, inferred, implemented and tested behavior.

This is **a first-party module inside html_editor**, not a ChatGPT plugin, not an MCP server for the existing editor and not a GrapesJS extension that directly edits React Native components.

## 2. Existing repository facts and constraints

Inspected on 2026-10-23, repository SaswataBhattacharyya/html_editor, main:

- index.html: AI Workbench panel with website-clone URL, buttons, status/progress and other workspace controls.
- js/workbench.js: frontend project creation/selection, POST website clone request, job polling, preview/capture/import handlers.
- server.mjs: local Node HTTP server, persisted projects, website-package capture/job states; current /api/projects and per-project clone/job endpoints.
- js/editor.js: GrapesJS HTML editor; svg-workspace.html and SVG/animation logic are separate capabilities.
- package.json: Node app; start_html_editor.sh defaults to Docker if available, otherwise local Node; docker-compose mounts ./projects.
- plan/web_clone.md intentionally separates an editable GrapesJS static package from a behavioral website clone.
- This repo does not already contain a working App Cloner. Do not claim that the new upstream tools are installed or functional on this specific host until checked.

**Backward compatibility is mandatory:** unchanged website mode, web clone API, GrapesJS, project loading, SVG workspace and current animation flows. Generated native apps never get imported into GrapesJS as if they were HTML.

## 3. Users, assumptions and scope

Primary user: one local developer with Node, an optional Codex/Claude Code CLI, an ADB-authorized Android test phone and local filesystem access. **One running source-device exploration at a time** is sufficient. No multi-tenant hosted SaaS.

**Required scope for v1**
1. Mobile App mode, searchable source chooser, Play Store URL/package parsing, installed-app selector, APK upload and screenshot-only mode.
2. Read-only environment/device/capability preflight with actionable setup instructions.
3. Durable per-project job creation, progress, pause/cancel/resume, crash handling and strict isolation.
4. Android interaction exploration, screenshots, accessibility snapshots, navigation/action traces, optional human assistance at login/install prompts.
5. Versioned evidence-linked app-spec, navigation/state graphs, source observation and inference labels.
6. Isolated React Native/Expo code generation via pinned AI App Cloner scaffold and a configured local coding-agent adapter, optionally typed local/mock persistence.
7. Native Android interaction tests (Maestro), browser screenshot comparison, bounded agent fixes, honest coverage report.
8. Source ZIP / preview / logs / test artifacts, with optional locally compiled test APK only if actually built.
9. Hardening, regression tests and Ubuntu ARM64 setup documentation.

**Not required in v1:** iOS runtime capture or IPA installation, direct arbitrary Play Store APK download, native full UI editing through GrapesJS, automatic remote backend/auth/payment replacement, byte-for-byte source/asset recovery, private API reconstruction, paywall/protection bypass, cloud hosting or multi-user workers. REA must be available as an optional analyzer on supported environments, **not a blocking dependency**.

## 4. UX workflow: five simple surfaces

### 4.1 Entry

Existing AI Workbench gets a two-mode switch: **Website** | **Mobile App**. Default Website stays unchanged. Mode switch preserves any in-flight job and current project. Mobile App shows:
- One main input with label “Search app name, paste Play Store URL, or package ID”.
- Results with icon if legitimately available, name, publisher, package ID and origin; select one result.
- Secondary actions “Installed apps”, “Upload APK”, “Use screenshots”.
- Device status indicator, primary “Clone App” button, folded “Advanced settings”.
- No raw terminal, MCP or model-specific jargon in the primary flow.

Search is best-effort and may need an explicitly configured listing-metadata provider. No universal official search/download API is assumed. If provider unavailable: accept package ID, link, installed app, APK or screenshots, and display a clear message.

### 4.2 Confirm source and device

A selected-app card displays package ID, source route, whether the app is installed on selected device, and chosen device. Detect ADB unauthorized/disconnected. If app not installed, offer official store link and pause until user installs it. Uploaded APK has explicit installation consent. A login screen creates a **Needs your action** state, allows user to sign in directly on phone and resume; never ask the user to paste credentials/OTP into html_editor.

Advanced (collapsed by default): selected agent, max screens/actions/time, optional REA, coding iterations, device selection, screenshot-only mode, model data-sharing preference and workflow scope. Store a versioned default configuration per job.

### 4.3 Run and progress

Visible stages:
**Identify → Prepare → Explore → Specify → Generate → Test → Refine → Ready**.

Show real completed counts for observed screens, generated screens and test-passed flows, short current action, warnings and links to a detailed event log. Do NOT claim “80% of entire app” based on time or progress bar. Actions: Pause, Resume, Cancel, View details. Status persists across tab refresh. Device lock is released on cancel/error. **Completed with gaps** is a first-class outcome.

### 4.4 Results workspace

Tabs: **Screen comparison, Working flows, Test results, Missing/blocked, Files**. Original-reference screenshot and generated screenshot side-by-side where actually captured. Buttons: **Open preview**, **Run tests**, **Improve UI**, **Open project folder**, **Download source ZIP**, **Build test APK** (only enabled after build-tool preflight). Preview may use Expo web for quick iteration, but native Android testing is mandatory for functional claims.

Never show “full clone” if an API is mocked, screen unobserved or feature untested. Mark local mock behavior as local.

### 4.5 User-facing completion

The default result is a new independent project. Do not embed original app trademark/logo/assets into exported result by default. Provide reproducible commands, tool versions, observations, generated app-spec, tests, outputs and limitations.

## 5. Input feasibility contract

| Method | Supported in v1 | Required behavior |
|---|---|---|
| App name | Best-effort | Search accessible listing metadata; results are choices, not verified installable binaries |
| Google Play URL | Yes | Parse valid package ID; collect listing metadata best-effort |
| Android package ID | Yes | Validate ID and check if installed; user can open official store |
| Installed Android app | Yes, with ADB | List and select device app; only launch authorized package |
| User-supplied APK | Yes | Stream upload; inspect, checksum, quarantine, user-confirmed install |
| Screenshots/ZIP | Yes | Screen-only reconstruction; no falsely observed interactions |
| iOS listing | Optional identification only | Say iOS runtime capture unsupported in v1 |
| Arbitrary third-party APK direct from Play | No | Google publisher APIs do not permit general unrelated downloads |

Any unsupported source must yield a selectable alternative rather than a spinner.

## 6. Backend shape and boundaries

Proposed modular folder map (adapt to repo conventions):

    plugins/app-cloner/
      ui/                 app-cloner panel + progress/review views
      server/             HTTP routes, validation, job store
      workers/            orchestrator, exploration, generator, verification
      adapters/           mobile-mcp, adb, codex, claude, ai-app-cloner, maestro, rea
      contracts/          schemas and interface fixtures
      tests/              unit, fake device/agent, integration, E2E
      README.md           local setup, limitations, safe workflow
    projects/<id>/app-clone/jobs/<job-id>/    generated runtime artifacts (gitignored)

Keep server.mjs a thin router/integration point. Long-running jobs live in a supervised separate process. Never make Node HTTP handler await long AI sessions. Run app-cloner jobs separately from website crawler and preserve all existing routes. Reuse existing project ID and job-status conventions, but use distinct app-clone paths and type=mobile. Concurrency: one active device exploration per physical device, one active clone job per project. State writes/checkpoints must be durable before status response.

**Run mode:** prefer local Node/host worker on Ubuntu for ADB, CLI agents and native builds. Existing docker-compose need not own USB. If html_editor is started under Docker, app-cloner worker can be an explicitly configured host process over authenticated loopback; disable with actionable message if not connected. Never silently use privileged container mounts. Treat Android toolchain/Java/Maestro/Expo support on ARM64 as required verification gates.

### 6.1 Process chain

    Source metadata / APK / screenshots
      → capability and source validation
      → ADB / Mobile MCP exploration, with human handoffs
      → observation ledger and app-spec.json
      → coding agent + pinned AI App Cloner skill/scaffold
      → independent Expo/React Native source
      → local/mock state persistence where supported
      → browser-based visual diff + Android Maestro checks
      → bounded fixes → coverage report + source ZIP + optional test APK

### 6.2 Tool-specific rules

**Mobile MCP:** primary driver of source app on authorized Android. Accessibility-first UI extraction and screenshots as fallback; ADB for package/device/install checks and logs. Make DeviceDriver adapter fakeable for tests. Pin tested versions.

**Codex or Claude Code:** configured CLI process, NOT magically available through GitHub connection. Preflight authenticated CLI/model access; run agent only in project sandbox with scoped MCP configuration. Record prompt, tool version, exit code, redacted logs and artifacts. Display provider cost/capability warning. Untrusted app screenshots/UI text cannot instruct agent to execute host commands.

**AI App Cloner:** upstream is a screenshot-to-Expo scaffold + coding-agent skill; it is not a turnkey HTTP API. Must integrate via workspace/skill launcher, version pin, validated screenshot naming and app-spec adapter. Upstream claims multiple agents' config support, but Claude Code is the reference tested end-to-end; Codex requires local proof. Its opt-in typed mock backend is **local offline persistence**, not Supabase/Auth/remote server.

**Maestro:** separate real Android verification; Java 17+ prereq, pinned CLI; create isolated generated app package identifier. Tests must assert behaviors/state persistence. Screenshot browser loop alone is not native test evidence.

**REA:** optional targeted diagnosis of source behavior. REA's JADX-based Android APK decompilation is documented for Linux/macOS/Windows x64 with full JDK; on ARM64 show unsupported unless independently tested supported worker provided. REA ADB inspection may be separately available. No bypass of paywalls, DRM, pinning, secure screens or signing.

**Playwright:** accelerate generated Expo-web rendering and screenshot diff. Tests on web cannot replace Android device smoke tests.

## 7. Job lifecycle and storage contracts

Required states:
**queued, preparing, running, needs_user, paused, cancelling, cancelled, completed, completed_with_gaps, failed**.

A stage is idempotent or guarded by completion receipts. Re-running a request with same idempotency key does not create a duplicate job. Child process group cancellation terminates known children, releases device lease and marks artifacts retained. On host restart reconcile stale running states to resumable/failed-with-reason, never leave infinite “running”.

Versioned schemas (JSON Schema or equivalent, with fixture tests):

**SourceDescriptor v1**
- id, kind (store_link/package_id/installed/apk/screenshots), input, packageId?, title?, publisher?, deviceId?, storeUrl?, apkSha256?, origin, userConsent, observedAt.

**Job v1**
- id, projectId, sourceId, state, stage, stageProgress, budgets, createdAt, updatedAt, checkpoints, toolVersions, capabilitiesSnapshot, warnings[], errors[], artifactRoot, workerLease.

**Observation v1**
- id, timestamp, packageId, screenId, screenshot file, accessibility snapshot file, action before/after and target, navigation edge, provenance (observed/manual/inferred), device details and errors; redact sensitive content.

**AppSpec v1**
- schemaVersion, project identity, screens, states, navigation graph, design tokens, components, workflows (steps + expected behavior), data model (with source/provenance), integrations, feature coverage, unanswered questions.

**ArtifactManifest v1**
- source snapshots, generated screenshots, app-spec, generated project, tests, logs, coverage report, source ZIP, optional APK, provider versions, timestamps, paths confined to job root and hashes.

**Coverage statuses:** observed, generated, tested_pass, tested_fail, inferred_unverified, blocked, out_of_scope. No conflation.

Artifact layout:

    projects/<id>/app-clone/jobs/<job-id>/
      input/              validated source descriptor + approved APK or screenshots
      observations/       screens, UI snapshots, action records, graph
      spec/               app-spec.json, README and uncertainty log
      generated/          standalone Expo project
      verification/       test scripts, results, diffs and diagnostics
      exports/            source ZIP, optional signed/unsigned test APK
      events.jsonl        append-only redacted progress
      manifest.json       artifact index and hashes

Never serve arbitrary filesystem paths via user-controlled URL; only manifest-listed artifacts.

## 8. HTTP endpoints

Add routes under /api/app-cloner; preserve existing /api/projects APIs:

| Method | Endpoint | Contract |
|---|---|---|
| GET | /api/app-cloner/capabilities | Versioned checks for device, SDK, agent, MCP, Java, Maestro, REA, Expo; clear remedy |
| GET | /api/app-cloner/devices | ADB devices, authorization, active leases |
| GET | /api/app-cloner/installed-apps?deviceId=... | Filtered/paged app packages on authorized device |
| POST | /api/app-cloner/discover | Name/link/package input → normalized listing results/fallback |
| POST | /api/app-cloner/uploads | Stream, validate and checksum APK or screenshot ZIP |
| POST | /api/projects/:id/app-clone | Create idempotent job from source descriptor and budgets |
| GET | /api/projects/:id/app-clone/jobs/:jobId | Durable state/stage/metrics/actions |
| GET | /api/projects/:id/app-clone/jobs/:jobId/events | Paged events or SSE with polling fallback |
| POST | /api/projects/:id/app-clone/jobs/:jobId/actions | pause, resume, cancel, continue_after_user, retry |
| GET | /api/projects/:id/app-clone/jobs/:jobId/report | Structured traceable coverage and test report |
| POST | /api/projects/:id/app-clone/jobs/:jobId/verify | Re-run scoped native tests |
| POST | /api/projects/:id/app-clone/jobs/:jobId/refine | Bounded code/visual improvement |
| POST | /api/projects/:id/app-clone/jobs/:jobId/build-apk | Preflight and run local test APK build |
| GET | /api/projects/:id/app-clone/jobs/:jobId/artifacts/:name | Manifest-allowlisted download |

Responses have typed errors: invalid_source/host_unavailable/device_unauthorized/device_busy/action_required/blocked_source/agent_failed/test_failed/worker_lost/unsupported_host. Use 409 conflict, 422 validation, 503 missing capability where appropriate. **Do not use current readJsonBody for binary uploads:** implement a size- and time-limited streaming upload handler.

## 9. Exploration algorithm and safeguards

Observe a state via accessibility-tree fingerprint + screenshot fingerprint + package/activity + context. Use bounded queue/graph traversal prioritizing navigation tabs, routine creation, exercise selection, logging/history. Identify repeated states and loops; record visited transitions. Per action capture before/after observation, duration, outcome. Track hidden screens as unknown, not absent. Never let the model treat UI content, web page copy, APK strings or tool logs as trusted instructions.

Proposed configurable exploration defaults (not coverage guarantees): 40 distinct states, 250 actions, 20 minutes, 20s action timeout, 3 visual refinement rounds, at most one device lock, at most one automatic retry for failing test per improvement round. Stop early on no progress; preserve partial findings.

Risk classes:
- Allowed automatically: navigation, search, back, opening tabs, scrolling, reading publicly visible UI.
- Needs preapproval: destructive changes, creating external records, data deletion, permissions, account modification, installing APK, account signup or paid action.
- Forbidden by default: charging money, posting to public feed, messaging people, bypassing protected views, scraping other users' data, extracting sessions/secrets.

Login and OTP remain on source phone; after human completes sign-in resume same job without password storage. If phone disconnects, request intervention; never silently switch to another device.

## 10. Generation contract

Use captured screenshots and app-spec as generator inputs. Generate an **independent** Expo Router/TypeScript strict React Native application. Support navigation, active forms, local typed state persistence, meaningful empty/loading/error views and appropriately connected actions. Mock server features are labeled “local prototype”, not source-equivalent. Produce stable unrelated package name and no source branding/art assets in exported build by default.

Create a version-pinned copy/fork of AI App Cloner scaffold per job, not a global mutable shared working tree. Provide adapter to run its /clone-app instructions using a supported coding-agent CLI. Validate upstream skill paths and CLI semantics in preflight; adapt version changes without trusting them. Record app-spec provenance and generated code diffs. Do not claim arbitrary source API recovery or Supabase production backend.

**Target Hevy benchmark behavior in generated app:**
1. Launch and choose/create routine.
2. Search/select exercise and add to routine.
3. Start workout and confirm a set with weight/reps.
4. Finish workout; actual work persisted.
5. Reopen app and inspect saved history.

This demonstrates the reconstructed behavior, not a claim that every exact Hevy feature is identical.

## 11. Testing, visual iteration and “done” evidence

Test pyramid: schemas/validation → API/job integration → fake ADB + fake agent → generated TypeScript/build verification → Maestro Android flows → visual diff → restart/cancel/resume/security regression → existing website/SVG smoke.

Every generated workflow has test ID, source evidence IDs (or inferred tag), generated source route, explicit expected state change, automated script, result and screenshots. Running visual screenshot diff without proving actual data changes **does not** count as functional coverage. Screenshot comparisons should be displayed with source/generator viewports and usable diff/overlay; avoid pretending a single image similarity score proves real app quality.

Native test environment must record device model, Android version, source app version where known, generated build/Expo version, agent/model, Mobile MCP/Maestro/REA versions and date. Compile debug APK locally if Android build tools are present; **download APK button remains disabled when build unverified**. Generated source ZIP is always an acceptable deliverable after a successful source generation stage.

Minimum local acceptance gates:
- Validated source selection and installed-app or screenshots fallback.
- Five Hevy-inspired generated-app flows executed and passing on physical Android where reference workflow was observable; blocked reference steps explicitly flagged.
- At least five paired screen comparisons from observed reference/screens to generated app where available.
- Local state survives app relaunch.
- Cancel releases device lease; worker restart produces recoverable status.
- Arbitrary path/ZIP injection, cross-project artifact access and command injection rejected.
- Existing website cloning/project loading and SVG workspace smoke still pass.
- Source ZIP contains runnable project, spec, tests and coverage report.

If external source is inaccessible due to login/paid access/protection, use a locally owned synthetic test app to prove pipeline, and report missing Hevy-specific observation as blocked. **CI must never require a Hevy login or purchase.**

## 12. Security, privacy, ethics and legal boundaries

Local binding to 127.0.0.1 by default. If later exposing on LAN: require authentication, origin/CSRF protection and constrained API. Validate all package IDs, project IDs and paths; reject symlinks, zip-slip, nested decompression bombs, oversized APKs, excessive entries, malicious MIME/magic discrepancies. Stream uploads into quarantined project directory, calculate SHA-256, confirm before installing. Agent commands execute in least-privilege confined workspace; no shell interpolation from source text; deny access to home/SSH/git secrets and other projects by default. Pin and audit dependencies. Terminate process groups on cancel.

Screenshots and device logs may contain private data. Redact authentication inputs/tokens; job-scoped retention/deletion; external model data sharing is **opt-in with explicit disclosure**. No automatic sending APKs/private screenshots to hosted models without consent. Do not extract original app code, secrets or copyrighted assets for republication; no DRM/paywall/security bypass, protected capture evasion, automated financial transactions or redistribution of original APK. Clone only sources you own/have permission to investigate or for appropriate lawful prototyping and competition research; commercial release requires separate IP review.

## 13. Local setup and ARM64 proof gates

Provide a **read-only doctor** (e.g. npm run app-cloner:doctor) checking:
- Node/npm, disk and workspace permissions; installed Codex/Claude CLI and actual model access.
- Android SDK platform-tools/ADB status and device authorization.
- Mobile MCP setup with scoped project config.
- AI App Cloner scaffold pinned commit/skill and browser automation.
- Java 17+, Maestro CLI device connection.
- Expo project build pipeline and Android SDK/Gradle/NDK on DGX ARM64.
- Optional REA; report JADX analyzer unsupported on ARM64 when no tested x64 worker.
- Existing Docker versus host-mode worker connectivity.

Doctor must not auto-install tools or change user-wide agent config. Setup may offer opt-in guided commands with pinned versions and provenance. Local inference via Ollama is a possible provider but **not** an assumed full replacement for multimodal coding-agent support. Record token/model budget, iteration quotas and local disk usage. Public cloud services or subscriptions are not required by app architecture, but model API/CLI use can incur external costs.

## 14. Edge cases and required response

| Condition | Required system behavior |
|---|---|
| Ambiguous app-name search | Show candidate name/publisher/package ID; user selects |
| Search offline/provider throttled | Package/link/installed/APK/screenshots fallback |
| Google Play selection uninstalled | Official store/install on phone handoff |
| ADB unauthorized/disconnect | Needs-user diagnostic and safe stop/resume |
| Two phones attached | Explicit device selection/lease, no silent switching |
| Login/OTP/paywall | Human login or blocked; never bypass |
| Protected screen or screenshots unavailable | Mark unobserved, exclude fake parity |
| Invalid/huge APK/ZIP | Refuse before install, log reason |
| Unsupported ARM64 optional REA | Disable REA only; continue capture/generation |
| Agent failed, offline or budget exhausted | Preserve checkpoints and errors; retry if authorized |
| Exploration loops or source crashes | Stop at budget, generate partial gap report |
| Generated app compile/typecheck failure | Not ready; logs and bounded retry |
| Maestro app test fails | Tested-fail with screenshot and reproducible script |
| Browser refresh/worker crash | Rehydrate durable status or mark failed/recoverable |
| Cancel during child process | Kill process group and release device lease |
| Existing website clone in use | Website remains unaffected by mobile job |
| App update mid-session | Record version/mismatch, avoid claiming stable source |

## 15. Three implementation issues, no extra epic explosion

### Issue A — Plugin shell, sources, devices, local job foundation

**Deliver:** mode switch + app discovery/installed/APK/screenshots UX; capability doctor; source validation; safe uploads; durable job state, events, locks, project structure and starter API; fake-driver tests and website/SVG regression smoke. A selected app can create a valid job and show honest staged progress with fake worker. Production provider not yet falsely shown ready.

**Acceptance:** UX and API inputs work; URL/package parses; device states handled; authorized upload survives app restart; no cross-project writes; job cancellation releases lock; project resume works; code does not break website mode.

### Issue B — Real exploration, app specification and functional generation

**Deliver:** Mobile MCP/ADB adapters, source-state crawl with risk budget, screenshots/action ledger, login/install handoff, validated AppSpec, agent runner, AI App Cloner pinned scaffold, typed local persistence, optional REA with host gates, runnable independent Expo project.

**Acceptance:** connected Android workflow records provenance; screenshots-only fallback works; unknown actions are flagged inferred; generated app typechecks/starts; created local entities persist; no app content executes shell commands; REA failure not fatal. Depends on A.

### Issue C — Verification/refinement, exports, resilience, release docs

**Deliver:** Maestro native tests and snapshot diffs, bounded improvement loop, result gallery, source ZIP/APK build gates, cancellation/restart/retry hardening, security and compatibility tests, ARM64 setup guide, Hevy + synthetic acceptance reports, final integration smoke.

**Acceptance:** end-to-end scenarios in Section 11 pass with recorded evidence on one Android phone for generated benchmark; unobservable source features flagged; exports valid and reproducible; no regressions. Depends on B.

Keep **exactly three tracked GitHub issues**. Use each issue's checklist and separate reviewable PRs if needed. Don't create separate bugs/features unless a true scope change requires it.

## 16. Implementation principles for Codex

1. **Evidence over claims:** observe → specify → generate → test, with provenance everywhere.
2. **Simple UI, honest backend:** hide tools, not capability failures.
3. **Progress without fiction:** counts/checkpoints, not “entire app cloned” percentages.
4. **Local-first and least privilege:** no always-on remote service requirement; explicit model consent.
5. **Adapter boundary and version pins:** vendor versions can change; test each contract.
6. **No forced GrapesJS for RN:** independent native editor/runtime, unchanged website editor.
7. **Durability and idempotency:** no duplicate jobs/actions, recover or clearly fail.
8. **Stop safely:** paid/security/destructive actions require human or are blocked.
9. **Test native behavior:** screenshot resemblance is supplementary.
10. **Preserve existing repo:** no large refactors unrelated to plugin; document all changes.
11. **Performance budgets:** bounded exploration, codegen, retries and storage.
12. **Partial results with gaps are valid:** truthful output preferable to invented functionality.

## 17. References and explicitly unverified assumptions

- Mobile MCP: https://github.com/mobile-next/mobile-mcp — real Android devices, ADB, accessibility-driven actions.
- AI App Cloner: https://github.com/Birkenpapier/ai-app-cloner — screenshot-to-Expo skill/scaffold; local typed mock backend optional; Codex wiring needs host verification; production Supabase backend is not shipped by the tool as of this PRD review.
- Maestro: https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli — Java 17+ and supported Linux installation.
- REA: https://github.com/morluto/rea — optional binary/APK and ADB investigation; JADX x64 requirements.
- Google Play generated APKs: https://developers.google.com/android-publisher/download-apks — publisher-owned app bundles, not public third-party APK downloads.
- Expo: https://docs.expo.dev/guides/local-app-development/ and https://docs.expo.dev/build-reference/apk/ — Android local build specifics and APK export.
- Existing repo context: plan/web_clone.md, plan/UI_all.md (some proposed designs are historical, not necessarily implemented).

**Critical validation gates before promising one-click execution:** installed local agent and auth; Mobile MCP Android driver; tested AI App Cloner skill under Codex/Claude; Java/Maestro on ARM64; Expo Android build on DGX ARM64; real phone; existing Docker/host run mode; source app accessible under authorized test state.

## 18. Codex kickoff instructions

Read this PRD, index.html, js/workbench.js, server.mjs, js/editor.js, package.json, start_html_editor.sh, Dockerfile, docker-compose.yml, plan/web_clone.md and plan/UI_all.md. Start Issue A, implement via an isolated feature branch and tests, demonstrate preflight/job UI, then Issue B and Issue C in dependency order. Respect package/host gating; use adapter fakes for unattended CI; never require the actual Hevy app for CI. Report exact implemented behavior and measured failures. Do not modify unrelated GrapesJS/SVG workflows and do not copy source APK/artwork/brands into distributable generated app.