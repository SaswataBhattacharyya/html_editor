# Website Preparation Studio: Streamlit, Cloning, SVG, Animation, and HTML Editing

## 1. Decision summary

Build a Streamlit orchestration application that provides one local control panel for:

1. Pasting a target website URL.
2. Running the AI website-cloner workflow.
3. Tracking the clone job and showing logs.
4. Starting the cloned website locally.
5. Opening the local clone in the browser.
6. Importing or exporting a normalized website package.
7. Converting raster images to SVG with VTracer.
8. Opening SVGs in SVGEdit for visual editing and semantic tagging.
9. Asking an animation provider to animate a selected SVG.
10. Sending the animated result to the HTML editor for preview and further editing.

The recommended architecture is a set of separate processes with explicit handoff contracts:

```text
Streamlit Studio
    |
    +--> AI website cloner workspace
    |       +--> Next.js clone
    |       +--> research, screenshots, assets
    |       +--> local preview server
    |
    +--> VTracer worker
    |       +--> raster image -> SVG
    |
    +--> SVGEdit workspace
    |       +--> visual SVG editing
    |       +--> semantic tagger metadata
    |
    +--> MCP animation adapter
    |       +--> SVGator remote MCP
    |       +--> PinePaper local/hosted MCP
    |
    +--> HTML editor
            +--> GrapesJS visual HTML/CSS editing
            +--> animated SVG and website-package preview
```

## 2. Important clarification about the existing HTML editor

The current repository at `/home/riki/web_dev/html_editor` is not currently an MCP server.

It is a browser-based GrapesJS application loaded by `index.html`, with runtime behavior in `js/editor.js`. Its `package.json` does not contain an MCP SDK, MCP server entrypoint, or MCP transport. It already has a browser UI, a virtual file system, HTML/CSS/JS/image import, ZIP import, a file explorer, and a Fabric.js drawing overlay.

### Recommendation

Keep the HTML editor as a normal local web application.

Do not convert the GrapesJS editor into an MCP server during the first implementation. MCP is a model-to-tool protocol; it is not needed for a human to open the editor and visually edit a website. Converting the editor prematurely would mix UI concerns, browser state, file storage, and model-tool transport.

Add an MCP adapter later only if Hermes or another AI client needs to control the editor programmatically.

If that later requirement appears, create a separate server such as:

```text
html-editor-mcp/
  server.py or server.ts
  tools/
    open_project
    import_package
    set_html
    set_css
    add_asset
    export_package
    get_preview_url
```

The MCP server should communicate with the running editor through a local HTTP API or a project-file API. It should not directly manipulate GrapesJS browser state unless a deliberate browser-control transport is added.

## 3. Repository and process layout

The projects should remain separable:

```text
/home/riki/web_dev/
  html_editor/
    index.html
    js/editor.js
    plan/UI_all.md

  ai-website-cloner-template/
    src/
    public/
    docs/
    .agents/skills/clone-website/

  website-prep-studio/
    streamlit_app.py
    prep_studio/
    workspaces/
    packages/
    jobs/
```

The current `ai-website-cloner-template` directory is useful as a clone workspace, but it should not be treated as the permanent home for every future clone. Each cloning job should receive an isolated workspace so generated routes, assets, and research files do not overwrite a previous job.

The Streamlit app may initially live under this repository for convenience, but the long-term design should keep it as a separate orchestration project. The HTML editor, the cloner, and the animation servers have different runtimes and release cycles.

## 4. Streamlit application screens

### Screen A: Clone website

Controls:

- Website URL input.
- Optional project name.
- Workspace directory selector.
- Clone mode:
  - full Next.js reconstruction;
  - static package snapshot;
  - both.
- Browser viewport presets:
  - desktop;
  - tablet;
  - mobile.
- Interaction sweep toggle.
- Download assets toggle.
- Capture videos toggle.
- Capture SVGs toggle.
- Animation inspection toggle.
- Start clone button.

Status area:

```text
Validating URL
Starting browser inspection
Capturing desktop/mobile screenshots
Extracting assets
Writing component specifications
Building Next.js clone
Running checks
Creating normalized package
Ready
```

Actions after completion:

- Open clone locally.
- Open clone folder.
- Open research report.
- Export static package.
- Import into HTML editor.
- Re-run visual QA.

### Screen B: Local preview

Show:

- Current project.
- Current route.
- Preview URL.
- Server status.
- Port.
- Open in browser button.
- Stop server button.
- Restart server button.

The Open in browser button should call Python's `webbrowser.open()` against a validated localhost URL. It must never open an arbitrary remote URL without user confirmation.

The preview manager should track child processes and clean them up when a job is stopped.

### Screen C: Image to SVG

Controls:

- Image uploader.
- Preview of the raster image.
- VTracer preset:
  - `bw`;
  - `poster`;
  - `photo`.
- Curve mode:
  - pixel;
  - polygon;
  - spline.
- Clustering mode.
- Maximum colors.
- Simplification tolerance.
- Speckle filtering.
- Palette input.
- Convert button.

Outputs:

- SVG preview.
- Download SVG.
- Send to SVG tagger.
- Send to animation workflow.
- Import into HTML editor.

VTracer is a raster-to-vector converter with CLI, Python, Rust, and Node/WASM options. The first implementation should use the Python package or a worker process, not shell interpolation from user input. Its Python API supports direct byte conversion and configurable presets. The Node WASM package is a possible future browser-side option.

### Screen D: SVG tagger/editor

Use SVGEdit as the embedded SVG authoring surface where practical.

SVGEdit provides an SVG canvas and an editor UI. It is not, by itself, a semantic tagger. The tagger layer must be added by this project.

Tagging features:

- Select an SVG element.
- Assign a stable element ID.
- Assign a semantic name.
- Assign a role:
  - logo;
  - background;
  - headline;
  - icon;
  - button;
  - decoration;
  - character;
  - path;
  - mask;
  - other.
- Add animation intent:
  - entrance;
  - hover;
  - click;
  - scroll;
  - loop;
  - exit;
  - state transition.
- Add preferred animation properties:
  - transform;
  - opacity;
  - fill;
  - stroke;
  - path morph;
  - filter;
  - clip/mask.
- Add notes for the animation model.
- Save tags in both SVG metadata and a sidecar JSON file.

Proposed sidecar file:

```json
{
  "version": 1,
  "source": "logo.svg",
  "elements": {
    "headline": {
      "selector": "#headline",
      "role": "headline",
      "animationIntent": "entrance",
      "properties": ["opacity", "transform"],
      "notes": "Fade and rise over 500ms"
    }
  }
}
```

The sidecar is important because arbitrary SVG metadata may be lost by other editors or exporters.

### Screen E: Animate SVG

Controls:

- SVG or tagged SVG selector.
- Animation prompt.
- Provider toggle/select:
  - SVGator;
  - PinePaper;
  - disabled.
- Export format:
  - animated SVG;
  - CSS-only SVG;
  - JavaScript SVG;
  - Lottie;
  - WebM/MP4/GIF where supported.
- Trigger:
  - load;
  - hover;
  - click;
  - scroll;
  - programmatic.
- Duration and loop controls.
- AI enhancement toggle.
- GPU/browser rendering toggle where supported.
- Duplicate-before-edit toggle.
- Animate button.

Outputs:

- Animated SVG preview.
- Exported file.
- Animation provider project link where available.
- Import into HTML editor.
- Replace selected SVG in the cloned website package.

## 5. Clone pipeline

### 5.1 Input validation

Validate and normalize the URL before starting a job.

Reject or explicitly require confirmation for:

- unsupported schemes;
- local file URLs;
- URLs containing credentials;
- private or authenticated targets;
- targets outside the user's permission.

### 5.2 Workspace creation

Create a collision-resistant job directory:

```text
workspaces/<timestamp>-<site-slug>-<hash>/
```

Store:

- job metadata;
- logs;
- generated Next.js clone;
- screenshots;
- research reports;
- downloaded assets;
- normalized package;
- preview-server metadata.

### 5.3 Invoke the cloner

The Streamlit app should not pretend that the current Next.js template is a simple URL-fetch library. It is an AI coding-agent workflow. The orchestration layer must choose one supported execution method:

1. Hermes delegates the cloning task to OpenCode/Codex.
2. A local worker invokes the supported agent with the clone workspace.
3. A future direct browser/reconstruction service replaces the agent workflow.

The first version should use a worker abstraction so Streamlit does not depend directly on one agent binary:

```text
CloneWorker
  validate()
  prepare_workspace()
  start_reconnaissance()
  build_clone()
  run_checks()
  export_package()
```

The worker must capture stdout, stderr, exit status, generated paths, and the final preview command.

### 5.4 Asset and behavior coverage

The cloner is designed to inspect screenshots, assets, responsive behavior, hover, click, scroll, and animation states. It can reproduce observed behavior in a generated Next.js app, but it cannot guarantee that every website feature is copied.

Expected coverage:

- static HTML structure;
- CSS and design tokens;
- downloaded images;
- inline and extracted SVGs;
- videos when accessible and permitted;
- observed CSS animations;
- observed JavaScript interactions;
- responsive layouts;
- visible hover, click, and scroll states.

Not guaranteed:

- private API behavior;
- authentication flows;
- backend databases;
- server-side rendering logic from the original site;
- personalized content;
- anti-bot-protected assets;
- cross-origin iframe internals;
- every animation state that was not observed;
- copyrighted or restricted assets where download is blocked.

The UI must report these as coverage gaps instead of claiming a perfect copy.

## 6. Normalized website package

The cloner and HTML editor need a stable handoff format.

```text
website-package/
  manifest.json
  index.html
  pages/
  css/
  js/
  images/
  svg/
  fonts/
  videos/
  metadata/
    research.json
    behaviors.json
    routes.json
```

`manifest.json` should include:

- source URL;
- clone job ID;
- entry HTML file;
- routes;
- asset inventory;
- external resources;
- unsupported features;
- animation inventory;
- generated timestamp;
- package version.

The package is the boundary between the cloner, Streamlit, and the HTML editor.

## 7. HTML editor integration

The existing HTML editor remains the visual browser-side editor.

Add an import contract that accepts the normalized package rather than only a generic ZIP. The import flow should:

1. Read `manifest.json`.
2. Select the entry route.
3. Preserve all relative file paths.
4. Rewrite CSS `url(...)` references.
5. Rewrite images, SVGs, fonts, videos, and scripts.
6. Show route selection for multi-page packages.
7. Warn about scripts that cannot safely execute inside GrapesJS.
8. Preview before replacing the current editor state.

Add an export endpoint or file-based handoff that Streamlit can observe:

```text
Streamlit -> package directory -> HTML editor import
HTML editor -> exported package/ZIP -> Streamlit job artifacts
```

Do not attempt automatic conversion of edited GrapesJS HTML back into clean Next.js React components in the first release. Preserve the Next.js clone separately as the behavior-oriented source.

## 8. SVGator MCP integration

SVGator MCP is a remote MCP server at `https://mcp.svgator.com/mcp` using Streamable HTTP and OAuth 2.1. It exposes project browsing, SVG inspection, incremental editing, project creation, project duplication, asset management, and exports including animated SVG, CSS/JavaScript-driven SVG, Lottie, React Native, Flutter, video, GIF, and other formats.

Recommended use:

- Make SVGator an optional provider.
- Require the user to authenticate/connect the account.
- Duplicate a source project before destructive animation edits.
- Use tagged element IDs from the SVG sidecar.
- Ask for a project/export result, not arbitrary tool execution.
- Store the returned project link and export artifact metadata.

SVGator is the stronger first option when the user wants a polished dedicated SVG animation workflow and is comfortable with a remote account/service.

## 9. PinePaper MCP integration

PinePaper MCP can run locally or through a hosted service. Its README describes a broad graphics and animation surface, browser/Puppeteer execution, relation-driven animation, SVG export, image operations, and GPU-oriented filters.

Recommended use:

- Use PinePaper as the local-first provider when privacy and local processing matter.
- Run it as a separate Node process.
- Configure a restricted toolkit rather than exposing all tools by default.
- Prefer `code`/review mode before enabling browser execution.
- Containerize or isolate Puppeteer execution if enabled.
- Treat generated code and imported assets as untrusted until reviewed.
- Use GPU features only when the local installation supports them; do not make GPU availability a hard requirement for basic SVG animation.

PinePaper is the stronger option for local, programmable, relation-driven animation and image effects. It also has a larger tool surface, so the adapter must restrict available tools and record provenance.

## 10. Animation provider abstraction

Do not bind the Streamlit UI directly to SVGator or PinePaper. Define a provider interface:

```text
AnimationProvider
  name()
  health_check()
  inspect(svg, tags)
  animate(svg, prompt, options)
  export(project, format, options)
  get_preview(result)
```

Implement:

```text
SvgatorProvider
PinePaperProvider
```

The provider adapter is responsible for:

- MCP session setup;
- authentication or local process startup;
- tool schema discovery;
- translating tagged SVG metadata into provider operations;
- polling long-running exports;
- normalizing output files;
- returning preview URLs and provenance;
- cleaning up temporary files.

The Streamlit button should call the provider adapter, not raw MCP tools.

## 11. Streamlit job orchestration

Streamlit reruns the Python script on interaction, so long-running clone and animation jobs must not execute as fragile blocking calls inside the page body.

Use a job manager:

```text
jobs/<job-id>/
  request.json
  status.json
  stdout.log
  stderr.log
  result.json
  artifacts/
```

Required job states:

```text
queued
running
waiting_for_auth
waiting_for_agent
waiting_for_export
succeeded
failed
canceled
```

The UI should poll `status.json` or a local job API and display progress without restarting the worker.

The job manager must support:

- cancellation;
- retries;
- timeouts;
- partial artifacts;
- resumable export polling;
- clear error messages;
- no duplicate child processes after Streamlit reruns.

## 12. Opening the website locally

When cloning finishes, the UI should expose separate buttons:

### Open Next.js clone

Starts the generated Next.js dev server or uses an existing server, then opens a URL such as:

```text
http://127.0.0.1:<port>/
```

### Open static package

Starts a static server for the normalized package and opens it in the browser.

### Open in HTML editor

Starts the existing HTML editor if needed and passes the package directory or ZIP to the import workflow.

The browser-open operation must use a localhost allowlist and should never silently open arbitrary external URLs.

## 13. Security and legal boundaries

The tool must only be used for websites the user owns or is authorized to reproduce.

The system should not:

- bypass authentication or paywalls;
- evade bot protection;
- copy private content;
- impersonate a third party;
- silently preserve tracking or payment endpoints;
- execute arbitrary imported JavaScript without warning;
- send private assets to a remote animation provider without consent.

Before remote SVGator processing, show the user what SVG and asset data will leave the machine.

For local PinePaper processing, isolate browser execution and generated code. Use containerization where feasible.

## 14. Suggested directory layout for the new Streamlit app

```text
website-prep-studio/
  app.py
  pyproject.toml
  requirements.txt
  prep_studio/
    config.py
    models.py
    jobs.py
    workspace.py
    clone_worker.py
    preview_server.py
    package_manifest.py
    package_export.py
    providers/
      base.py
      svgator.py
      pinepaper.py
    svg/
      vtracer.py
      metadata.py
      tagger.py
    editor_bridge.py
    security.py
  tests/
    test_manifest.py
    test_asset_paths.py
    test_job_lifecycle.py
    test_svg_metadata.py
```

The current HTML editor stays in its own directory. The cloner stays in its own directory. The Streamlit application coordinates them through files, subprocesses, localhost URLs, and normalized manifests.

## 15. Implementation phases

### Phase 1: Streamlit shell and project model

- Create Streamlit app.
- Add URL form.
- Add workspace/job model.
- Add logs and status panel.
- Add local browser-open button.
- Add configuration for paths and ports.

### Phase 2: Clone worker

- Add worker abstraction.
- Integrate Hermes/OpenCode/Codex execution path.
- Create isolated clone workspace.
- Capture process output.
- Detect generated Next.js project.
- Start and stop preview server.

### Phase 3: Normalized package export

- Define `manifest.json`.
- Export HTML/routes/assets/research.
- Build static package validation.
- Add package download.

### Phase 4: HTML editor bridge

- Add package import support.
- Improve nested path and CSS asset handling.
- Add route selection.
- Add export package support.
- Add Streamlit handoff.

### Phase 5: VTracer image-to-SVG

- Add upload panel.
- Run conversion in a worker.
- Expose presets and controls.
- Store conversion metadata.
- Send SVG to tagger and animation panels.

### Phase 6: SVGEdit and semantic tagger

- Host or bundle SVGEdit locally.
- Embed the editor in a dedicated panel or iframe.
- Add selection-to-metadata bridge.
- Persist sidecar tags.
- Add SVG/package import and export.

### Phase 7: MCP animation provider

- Implement provider abstraction.
- Integrate one provider first.
- Add authentication/health checks.
- Add prompt and export controls.
- Poll exports and show previews.
- Import resulting SVG into the HTML editor.

### Phase 8: Second provider and local/GPU options

- Add the second provider behind a toggle.
- Add local PinePaper process management if selected.
- Add resource checks for Chrome, memory, and optional GPU.
- Add provider comparison and provenance.

### Phase 9: End-to-end acceptance tests

Test the complete flow:

```text
URL
  -> clone
  -> local Next.js preview
  -> normalized package
  -> HTML editor import
  -> image-to-SVG
  -> semantic SVG tagging
  -> AI animation request
  -> animated SVG export
  -> HTML editor preview
  -> package/ZIP export
```

Acceptance requirements:

- The clone opens locally.
- Images, SVGs, fonts, and videos resolve locally when available.
- Observed animations are represented in the Next.js clone where the cloner can reproduce them.
- SVG conversion produces a valid editable SVG.
- Tags survive export and re-import.
- At least one MCP provider can animate a tagged SVG.
- The resulting animated SVG renders in the HTML editor.
- The original Next.js clone remains runnable.
- Failed or unsupported features are reported explicitly.

## 16. Recommended first provider choice

Start with SVGator if the immediate goal is reliable SVG animation authoring and the user is willing to authenticate to a remote service. It has a focused animation/project/export API and editor deep links.

Add PinePaper next for local-first graphics, relation-driven animation, image effects, and GPU/browser experimentation. Its larger tool surface and executable browser mode require stronger isolation and tool restrictions.

Do not implement both providers in the first vertical slice. Define the abstraction first, then complete one provider end-to-end.

## 17. Final architecture decision

Keep these as separate applications:

```text
Streamlit Studio       = orchestration and workflow UI
AI cloner workspace     = Next.js reconstruction project
HTML editor             = GrapesJS visual editor
SVGEdit                 = SVG editing surface
VTracer                 = image-to-vector worker
SVGator/PinePaper MCP   = optional animation backends
Hermes/OpenCode/Codex   = AI coding/reconstruction control plane
```

The HTML editor should remain a normal local app for now. It can be launched by Streamlit and receive normalized website packages, but it should not become an MCP server unless a later requirement proves that Hermes needs programmatic GrapesJS control.

## 18. Revised product direction: HTML Editor as the main workbench

The previous plan treated Streamlit as the primary orchestration UI. The revised direction is to make the existing HTML editor the main local workbench and move the orchestration controls into it.

Streamlit is therefore optional rather than required for the main user workflow. The browser-based HTML editor will provide the UI, while local backend workers and terminal sessions perform the expensive or agent-controlled work.

```text
HTML Editor browser UI
    |
    +--> AI off-canvas panel
    |       +--> URL clone request
    |       +--> project selection
    |       +--> animation planning chat
    |       +--> agent/provider selection
    |       +--> verbose logs and errors
    |
    +--> local editor backend
            +--> clone worker
            +--> VTracer worker
            +--> SVG tag/metadata service
            +--> Ollama prompt-planning worker
            +--> Codex/OpenCode/OpenRouter session bridge
            +--> SVGator/PinePaper MCP adapter
            +--> Playwright screenshot/QA worker
            +--> Graphify project updater
```

The HTML editor remains a normal local app. The backend is a separate local service or command runner that the browser UI communicates with over localhost HTTP/WebSocket. This keeps the GrapesJS canvas responsive and prevents long-running cloning, browser automation, model calls, and MCP exports from blocking the browser page.

## 19. Project lifecycle

Every project is stored under:

```text
/home/riki/web_dev/html_editor/projects/<project-id>/
```

Suggested project structure:

```text
projects/<project-id>/
  project.json
  graphify-out/
    graph.json
    GRAPH_REPORT.md
    graph.html
  source/
    next-clone/
  website-package/
    manifest.json
    index.html
    pages/
    css/
    js/
    images/
    svg/
    fonts/
    videos/
  svg-work/
    source-images/
    generated/
    tagged/
    animated/
    metadata/
  research/
    screenshots/
    behaviors.json
    coverage.json
  jobs/
    <job-id>/
      request.json
      status.json
      stdout.log
      stderr.log
      result.json
  previews/
  exports/
```

### New project flow

At startup, the editor should show a project chooser:

```text
New Project
Load Project
Choose Existing Folder
```

New Project should ask for:

- project name;
- optional source URL;
- optional description;
- optional provider defaults;
- optional workspace folder.

The default location is `/home/riki/web_dev/html_editor/projects`, but the user may choose another folder through a native folder picker or a backend path-selection dialog.

### Load project flow

Load Project should:

1. Enumerate project folders under the default projects directory.
2. Validate `project.json`.
3. Show project name, source URL, last modified time, Graphify freshness, and available previews.
4. Allow the user to choose another folder.
5. Restore the last selected route, editor state, package, and SVG workspace metadata where possible.

The app must never treat an arbitrary folder as a project without confirmation. It should show validation warnings for missing manifests or damaged artifacts.

## 20. AI off-canvas panel

Add an `AI` tab/button to the HTML editor navbar. Clicking it opens a slide-out off-canvas panel without destroying the GrapesJS canvas state.

The panel has three modes.

### Clone mode

Controls:

- URL input.
- `Clone Website` button.
- Clone scope:
  - current page;
  - selected route set;
  - whole permitted site crawl.
- Capture animations toggle.
- Capture videos toggle.
- Capture SVGs toggle.
- Capture responsive states toggle.
- Keep research/reports toggle.

After starting:

- create or select a project;
- create a clone job;
- invoke the configured clone worker;
- stream verbose status into the panel;
- place output under the project folder;
- run Graphify;
- offer `Open Local Clone`, `Open in Editor`, and `View Research` buttons.

### Design and animation mode

Controls:

- current SVG or image asset;
- image-to-SVG action;
- SVG tagger action;
- animation planning chat;
- plan button;
- submit animation button;
- animation provider toggle;
- animation type toggle;
- model/provider dropdown;
- verbose log area;
- preview and export actions.

### Live project assistant mode

The same chat can request project changes, for example:

```text
Make the hero section use the selected animated SVG.
Move the button 12px lower on mobile.
Add a hover animation to the logo.
Take a screenshot of the current rendered page and compare it with the research reference.
```

The assistant must receive the current project root, Graphify context, selected files/nodes, current route, and preview URL. It should not receive the entire conversation or entire repository by default.

## 21. Clone action inside the HTML editor

The editor UI should not try to run the clone directly in the browser. It should call a local backend command/API.

```text
Browser UI
  -> POST /api/projects/<id>/clone
  -> local clone worker
  -> Hermes/OpenCode/Codex or configured worker
  -> generated project files
  -> package exporter
  -> Graphify update
  -> local preview server
```

The worker should open a new terminal session when the selected agent requires an interactive terminal. The HTML editor should show:

- terminal/session ID;
- command being run;
- working directory;
- agent/provider;
- current status;
- stdout/stderr;
- approval requests;
- retry and cancel controls.

The system must not silently pass arbitrary shell commands from the browser to a terminal. Commands should be generated by a controlled worker, displayed to the user, and constrained to the selected project root unless the user explicitly approves an expanded path.

## 22. Agent and model selection

The AI panel should have a dropdown with:

```text
Ollama
Codex
OpenCode
OpenRouter
```

### Ollama

Use a local Ollama endpoint and configurable model name. The model name must come from configuration or an installed-model check; it must not be hardcoded from an assumed tag.

The application should verify the selected model before creating a job and show the exact resolved model tag. The plan currently refers to a Qwen 3.6B-class model, but the installed tag must be confirmed before implementation.

### Codex, OpenCode, and OpenRouter

These providers should use existing authenticated sessions where available. The UI should not ask for or store raw credentials.

If a provider is not authenticated, the panel should show:

```text
Provider unavailable or not signed in.
[Open setup instructions]
[Retry connection]
```

Authentication belongs to the provider's own CLI or account flow. The local bridge should only invoke the configured client and report its status.

### Base context sent to agents

Every agent session should receive a compact, generated handoff:

```text
OBJECTIVE
PROJECT ROOT
CURRENT ROUTE
SELECTED FILES/NODES
ARCHITECTURE
GRAPHIFY CONTEXT
CURRENT PREVIEW URL
RELEVANT RESEARCH
ANIMATION/SVG CONTRACT
ACCEPTANCE CRITERIA
BUILD AND TEST COMMANDS
PLAYWRIGHT REQUIREMENTS
VERBOSE ERROR REPORTING RULES
```

The agent must update the project files and run the project checks. It must not be given permission to alter unrelated repositories by default.

## 23. Graphify per project

Every project must have its own Graphify output under:

```text
projects/<project-id>/graphify-out/
```

Graphify must be created immediately after project initialization and regenerated after meaningful source changes.

### Update triggers

Update Graphify after:

- clone generation;
- route creation or deletion;
- component changes;
- SVG asset creation or replacement;
- animation export;
- package import/export;
- agent session completion;
- explicit user request.

### Agent access

The agent handoff should point to:

```text
projects/<project-id>/graphify-out/graph.json
projects/<project-id>/graphify-out/GRAPH_REPORT.md
```

For focused questions, agents should use Graphify queries rather than loading the entire repository. Important findings must still be verified against source files.

The system should track Graphify freshness in `project.json` and show a warning when source files are newer than the graph.

## 24. Image-to-SVG workflow

The image-to-SVG feature belongs in the HTML editor AI panel.

Input sources:

- file upload;
- image selected from the current project;
- clipboard paste;
- drag and drop.

The browser should send the image to a backend VTracer worker. VTracer should run outside the browser when using the Python/Rust implementation, or through a Node/WASM worker when browser-safe conversion is preferred.

Workflow:

```text
Select/paste image
  -> preview image
  -> choose VTracer settings
  -> start conversion
  -> save SVG under project/svg-work/generated
  -> show SVG preview
  -> open SVG tagger
```

The UI should preserve both the raster source and generated SVG. It should never overwrite the input image.

## 25. SVG selection, zoom, and tagging

The SVG workspace must support:

- zoom in/out;
- fit to canvas;
- pan;
- selection rectangle;
- selecting individual SVG elements;
- selecting groups;
- selecting by ID or tag;
- layer/tree view;
- element bounding-box coordinates;
- coordinate readout;
- stable IDs;
- semantic tags;
- notes and animation intent;
- undo/redo;
- save tagged SVG;
- save sidecar metadata.

SVGEdit should provide the editing canvas and base editor features. The project-specific tagger should provide semantic metadata and animation intent. Metadata must be stored in both SVG attributes where safe and a sidecar JSON file so it survives editor/export differences.

## 26. Animation planning chat

The animation chat is a planning layer, not the animation engine.

The user should be able to:

1. Select an SVG element or group.
2. Describe the desired animation conversationally.
3. Press `Plan`.
4. Review the structured animation plan.
5. Continue the conversation to refine it.
6. Press `Submit Animation` only after approval.

The planner should produce a provider-neutral intermediate representation first:

```json
{
  "target": ["headline", "logo_mark"],
  "intent": "Reveal the logo from left to right",
  "trigger": "load",
  "durationMs": 800,
  "delayMs": 0,
  "loop": false,
  "easing": "easeOutCubic",
  "properties": ["opacity", "transform", "clipPath"],
  "sequence": [],
  "constraints": [],
  "notes": []
}
```

This prevents the chat model from having to directly invent provider-specific tool calls before the user approves the plan.

## 27. Two animation types

The UI must expose a clear toggle for the two supported animation modes. The exact labels need confirmation, but the architecture should support provider-specific translators such as:

### Type A: timeline/keyframe SVG animation

Best for:

- explicit keyframes;
- easing;
- path morphing;
- transform, opacity, fill, and stroke animation;
- CSS or JavaScript animated SVG export.

### Type B: relation/behavior-driven animation

Best for:

- relationships between elements;
- event-driven sequences;
- procedural motion;
- pointer, scroll, or interaction-driven behavior;
- PinePaper-style relation graphs.

Switching the toggle must change:

- the planning schema;
- the model refinement prompt;
- available controls;
- provider adapter;
- validation rules;
- export expectations.

The UI should show the generated provider-specific request before submission when verbose mode is enabled.

## 28. Prompt refinement and provider translation

The model should not send the raw user prompt directly to an MCP provider.

Pipeline:

```text
User conversation
  -> provider-neutral animation plan
  -> selected animation type
  -> selected provider schema
  -> provider-specific request
  -> validation
  -> MCP call
  -> export/poll
  -> import result into project
```

If the request format is invalid:

1. Preserve the original prompt.
2. Preserve the intermediate plan.
3. Preserve the provider request.
4. Show the exact validation error.
5. Identify the responsible stage:
   - user intent;
   - planner output;
   - provider translator;
   - MCP schema;
   - provider execution;
   - export/download;
   - HTML editor import.
6. Allow retry after editing the plan or provider request.

## 29. Verbose diagnostics

Verbose mode should be enabled by default during development.

Configuration example:

```toml
[app]
verbose = true

[logging]
level = "DEBUG"
persist_job_logs = true
persist_provider_payloads = true
persist_agent_handoffs = true

[security]
allow_raw_provider_payloads = false
allow_arbitrary_shell = false
```

Verbose output should include:

- job IDs;
- project root;
- exact subprocess command;
- selected provider and resolved model;
- selected animation type;
- input/output paths;
- Graphify update status;
- browser/Playwright URL;
- MCP method/tool name;
- sanitized request payload;
- response validation;
- export polling state;
- stack traces in a developer-only details panel.

Secrets, OAuth tokens, cookies, and private headers must never appear in persisted logs.

## 30. Playwright and live visual QA

The AI assistant should be able to request Playwright screenshots of the rendered local project.

Required actions:

- start or reuse a local preview server;
- navigate to the current route;
- set viewport size;
- capture screenshot;
- capture full-page screenshot;
- inspect console errors;
- inspect network failures;
- compare against a research screenshot;
- return artifact paths and a summary.

The browser worker must be scoped to local project URLs by default. Remote target inspection belongs to the clone worker and requires explicit permission.

The chat should support live changes by sending a focused agent handoff containing the selected project, route, files, Graphify query result, and current screenshot evidence.

## 31. Opening a terminal from the HTML editor

The requirement to open a new terminal should be implemented as a local backend capability, not browser JavaScript attempting to launch arbitrary shell commands.

Preferred options:

1. Start a visible terminal session through a configured terminal launcher.
2. Run a controlled worker process and stream its output into the AI panel.
3. Provide a button to reveal or attach to the existing session.

The UI must work even when a visible terminal cannot be opened, for example over SSH or in a headless environment. In that case, the job runs in the background and the panel displays the complete log.

## 32. Safety and permission gates

Before a clone or agent job starts, show:

- target URL;
- project directory;
- selected agent/model;
- selected animation provider;
- whether data leaves the machine;
- commands to be executed;
- ports to be opened;
- expected disk/memory use;
- whether a remote account is required.

Require confirmation for:

- overwriting an existing project;
- sending SVGs or screenshots to a remote provider;
- executing generated browser code;
- running arbitrary shell commands;
- modifying outside the project root;
- opening a remote URL in an automated browser;
- deleting artifacts.

## 33. Revised implementation order

1. Add project chooser and per-project directory model.
2. Add backend service and job protocol.
3. Add AI off-canvas panel with URL clone form.
4. Add clone worker integration and local preview/open-browser actions.
5. Add per-project Graphify creation and freshness tracking.
6. Add package import/export between clone output and GrapesJS.
7. Add image upload, clipboard paste, and VTracer conversion.
8. Add SVGEdit workspace and project-specific semantic tagging layer.
9. Add animation planning chat with Ollama first.
10. Add provider-neutral animation plan schema and validation.
11. Integrate one animation provider end-to-end.
12. Add second provider behind a toggle.
13. Add Codex/OpenCode/OpenRouter bridges using existing authentication.
14. Add Playwright screenshot and visual-QA actions.
15. Add verbose configuration and sanitized persisted diagnostics.
16. Add live project changes through constrained agent sessions.
17. Add end-to-end tests for cloning, SVG conversion, tagging, animation, import, export, and re-open.

## 35. Confirmed product decisions

The following decisions are now confirmed:

### Ollama model

Use the exact Ollama model tag:

```text
qwen3.6:35b
```

The backend must still verify that the tag is installed before starting a job. The UI should show the resolved model and provide a clear installation/configuration error if it is unavailable.

### Animation modes

Support both animation modes and expose them as a toggle:

```text
Timeline / Keyframes
Relation / Behavior Driven
```

Switching the toggle changes the planner schema, prompt-refinement instructions, validation rules, provider translation, and export expectations.

The user may switch modes during planning. Existing conversation history should be preserved, but the system must regenerate the provider-specific plan when the mode changes.

### Default AI provider

Use Ollama as the default planner and project assistant.

The initial configuration is:

```toml
[models]
default_provider = "ollama"
default_model = "qwen3.6:35b"
```

Codex, OpenCode, and OpenRouter remain optional providers for tasks that benefit from a different coding or reasoning workflow.

### Default animation provider

Use PinePaper as the default animation provider because the preferred workflow is local/private processing.

SVGator remains an optional provider for users who want its remote project workflow, editor links, or specialized export capabilities.

Before SVGator is used, the UI must clearly show that the selected SVG, tags, prompt, and possibly screenshots may be sent to a remote service.

### SVG editor location

The SVG editor may be implemented in either of these ways:

1. A panel or tab inside the current HTML editor application.
2. A dedicated SVG editor route/page opened in the same local HTML editor application.

The second option is preferred if embedding SVGEdit in the existing GrapesJS canvas creates layout, dependency, or event-isolation problems.

The user should still experience it as one application:

```text
HTML Editor
  ├── /editor       GrapesJS HTML/CSS editor
  ├── /svg          SVGEdit canvas and tagger
  ├── /projects     project browser
  └── /ai           AI workflow panel or route
```

The SVG page must provide:

- zoom in;
- zoom out;
- fit to canvas;
- pan;
- selection coordinates;
- element/layer selection;
- tagging;
- SVGEdit editing tools;
- save and return to project;
- send selected SVG to the animation planner.

### Render actions

The UI should provide the render target that is appropriate for the current artifact instead of forcing one universal mode:

```text
Open Next.js Clone
Open Static Package
Open GrapesJS Editor
Open SVG Workspace
```

The system should show only actions that are available for the current project state. For example, an unbuilt Next.js clone should show `Build and Open`, while a generated SVG should show `Open SVG Workspace` and `Animate`.

## 36. Remaining implementation questions

No additional product-level clarification is required before starting the first implementation phase. The following are implementation details that can be handled with sensible defaults:

- use a local HTTP/WebSocket backend for long-running jobs;
- use an isolated worker process for cloning, VTracer, Playwright, and MCP calls;
- store job logs under the current project;
- default to verbose diagnostics;
- require confirmation before remote SVGator calls or destructive project changes;
- preserve both the Next.js clone and the GrapesJS/static package.

### Exact Ollama model tag

Confirmed as `qwen3.6:35b`. The installed-model check is still required at runtime.

### Meaning of the two animation types

Confirmed: both modes are required and should be switchable:

1. timeline/keyframe animation;
2. relation/behavior-driven animation.

### Agent execution policy

The default AI planner is Ollama. Codex/OpenCode/OpenRouter remain optional selectable providers. Hermes may continue to orchestrate or delegate coding work, but the editor's first local planning path is Ollama.

### SVGator/PinePaper provider policy

PinePaper/local processing is the default. SVGator is optional and must be preceded by a remote-data confirmation.

### Render target

The UI will provide context-aware actions for the Next.js clone, static package, GrapesJS editor, and SVG workspace.

## 37. Repository acquisition plan

The following repositories are already available or have a clear acquisition path:

### Already available

```text
/home/riki/web_dev/html_editor
/home/riki/web_dev/html_editor/ai-website-cloner-template
```

The Graphify output for the cloner should be regenerated after meaningful changes to that repository, but the final per-project Graphify output belongs under each project directory.

### Clone locally before implementing local SVG editing

SVGEdit should be cloned or installed locally because it will be hosted or bundled as part of the SVG workspace. SVGEdit documents local installation, build, local serving, and integration through an editor container with a numeric width and height.

Suggested location:

```text
/home/riki/web_dev/svgedit
```

### Install or clone VTracer

VTracer does not need to be cloned for the first integration. Use its Python package or Node/WASM package behind a worker. Clone the source only if native development or custom builds are needed.

Suggested first path:

```text
pip install vtracer==1.0.0a4
```

The exact version and installation method should be pinned in the future Streamlit/backend project rather than installed globally.

### PinePaper

Clone PinePaper locally if the local MCP server is selected as the default implementation.

Suggested location:

```text
/home/riki/web_dev/pinepaper-mcp
```

It should run as a separate Node process, with a restricted toolkit and explicit browser/GPU resource configuration.

### SVGator

Do not clone SVGator for the first implementation. Use its configured remote MCP endpoint when the user opts in. A local clone is only needed if SVGator later publishes a self-hostable server or the project requires a separate local implementation.

## 38. First implementation slice

The first vertical slice should be deliberately narrow but demonstrate the complete architecture:

1. Create/load a project.
2. Enter a permitted URL in the AI off-canvas panel.
3. Start a clone job through the local worker.
4. Stream verbose logs.
5. Generate a local Next.js preview.
6. Open the preview in the browser.
7. Generate project Graphify output.
8. Import the static package into the GrapesJS editor.
9. Upload or paste an image.
10. Convert it with VTracer.
11. Open the SVG workspace on its own page.
12. Zoom, select, tag, and save the SVG.
13. Plan a timeline animation with Ollama.
14. Toggle to relation animation and regenerate the plan.
15. Submit to PinePaper.
16. Import the animated SVG back into the project and preview it in the HTML editor.

This slice will establish the project files, worker protocol, model/provider abstraction, Graphify lifecycle, SVG metadata format, and browser preview contract before adding every advanced feature.

## 39. Phase 2 implementation: local backend, projects, and launcher

Phase 2 adds the first real backend boundary behind the HTML editor UI.

### Backend responsibilities in this phase

- Serve the existing editor and static assets.
- Expose a local health endpoint.
- Create and list project metadata.
- Create project folders under `/home/riki/web_dev/html_editor/projects`.
- Persist `project.json`.
- Accept clone-job requests and persist job metadata/log placeholders.
- Return a clear queued/not-yet-connected state until the AI clone worker is implemented.
- Keep all filesystem writes constrained to the configured projects root.

### Package strategy

Use Node's built-in HTTP, filesystem, URL, and path modules for the first backend. Do not add another web framework or process manager during Phase 2. This avoids dependency conflicts with the existing GrapesJS/Tailwind setup.

The later VTracer/Python worker may use the user's `react` environment, but it should be isolated behind a worker boundary. The Node backend and the browser editor should not import Python packages or GPU libraries directly.

### Docker strategy

Provide:

```text
Dockerfile
docker-compose.yml
start_html_editor.sh
```

The Docker service and container name must be `html_editor`.

The container should:

- use a supported Node base image;
- run `npm ci` from the existing lockfile;
- expose port 3000;
- mount `projects/` as a persistent volume;
- mount or serve the local repository for development;
- avoid installing unnecessary packages;
- provide a predictable place for future Playwright, VTracer, and MCP workers.

The launcher should:

1. Detect whether Docker and the Docker daemon are usable.
2. Start `html_editor` with Docker Compose when possible.
3. Fall back to `node server.mjs` when Docker is unavailable.
4. Wait for `/api/health`.
5. Open `http://127.0.0.1:3000/` in the default browser.
6. Print the active mode, URL, project root, and log command.

The launcher must not require several manually coordinated terminals for Phase 2.

### Phase 2 acceptance tests

- `GET /api/health` returns the backend status.
- `GET /api/projects` returns an array.
- Creating a project creates a directory and `project.json`.
- The browser project chooser lists backend projects.
- A clone request creates a job request under the active project.
- The UI reports the job as queued rather than claiming a clone completed.
- The existing GrapesJS editor still loads.
- The theme and AI drawer still work.
- The launcher starts Docker when the daemon is available and local Node otherwise.
- Playwright verifies the project drawer, AI drawer, clone request, and status state.

## 40. Phase 3 implementation: VTracer and SVG workspace

The first real SVG pipeline is now wired into the local editor:

- The local Node backend uses the installed `@visioncortex/vtracer` WASM package to convert PNG, JPEG, WebP, GIF, and BMP data into SVG. It stores source images and generated SVG files under the active project's `svg-work/source-images/` and `svg-work/generated/` folders.
- `svg-workspace.html` is a project-scoped workspace with image loading, VTracer conversion, preview zoom controls, element selection, and tags for role plus animation intent. Tags are applied as `data-role` and `data-animation-intent` attributes on the selected SVG element.
- The editor's Image → SVG action opens the workspace for the active project. The existing SVGEdit launch remains available as a separate editing surface.
- The supplied van image at `plan/image.png` is the Phase 3 smoke-test fixture. It is not copied into project data automatically; a user upload creates the project-owned source and generated files.
- This phase deliberately does not claim that website cloning is complete: clone requests are still persisted as queued jobs until the agent/browser worker is connected. PinePaper/SVGator submission and LLM prompt refinement remain later adapters.

### Phase 3 verification

- The supplied `plan/image.png` was converted through `POST /api/projects/:id/trace`; the generated SVG was 207,063 bytes and was persisted inside a temporary project, which was removed after the test.
- Headless Chromium/Playwright verified the SVG workspace page, its VTracer button, and zoom control. The browser upload flow is present; the conversion engine itself was also exercised directly through the same backend endpoint with the supplied image.
- JavaScript syntax checks, shell syntax checks, and `git diff --check` passed.

## 41. Phase 4 implementation: local static clone worker

The queued clone request now runs a bounded local static crawler. It fetches the target HTML, downloads same-origin assets referenced by `src`, `href`, `poster`, `data-src`, and CSS `url(...)`, rewrites downloaded references to project-local paths, writes `website-package/index.html`, and records `source/clone-report.json` with warnings and limitations. The UI polls job status and enables the local preview URL after completion.

The worker intentionally reports its boundary: it does not claim to reproduce JavaScript execution, authenticated pages, server-side routes, CORS-protected assets, or complex runtime animation. Those require the planned Playwright/agent worker and will be added without replacing this deterministic static package path.

### Phase 4 verification

- A local same-origin dummy target was cloned through the API. The job reached `completed`, created `website-package/index.html`, downloaded three referenced assets, and returned `/projects/<project>/website-package/index.html` as the preview URL.
- Playwright exercised the editor UI end-to-end: project load, AI drawer open, URL submission, clone polling, and the completed-preview status.
- Temporary QA project data was removed after testing; the persistent `projects/.gitkeep` remains untouched.

## 42. Browser-rendered clone worker

The local clone job now invokes `tools/browser_clone.py` after the deterministic asset crawler. When Python Playwright and Chromium are available, it saves `website-package/rendered.html`, `previews/browser-capture.png`, and `source/browser-report.json`, and exposes an Open capture action in the AI drawer. If the browser dependency is unavailable, the clone still completes as a static package and records the exact warning in `clone-report.json` and job status.

### Browser-worker verification

- A dummy local clone completed with worker `local-static-crawler+playwright`.
- The rendered capture produced `rendered.html`, `browser-report.json`, and `browser-capture.png`; the report captured the page title and rendered element counts.
- Playwright exercised the editor UI through project load, AI drawer, clone request, polling, and the completed capture state.

## 43. Normalized package export and GrapesJS import

Completed the clone-to-editor bridge. Every completed clone now writes `website-package/manifest.json` with stable package, rendered HTML, screenshot, report, and asset URLs. The backend exposes that manifest through `/api/projects/:id/package`. The AI drawer's explicit Import to editor action fetches the package HTML and local stylesheets, normalizes asset URLs to project-local absolute URLs, and loads the body and CSS into the existing GrapesJS instance. No existing canvas content is replaced until the user clicks Import to editor.

### Verification

- Playwright cloned a dummy local page, waited for completion, clicked Import to editor, confirmed the success status, and confirmed `window.htmlEditor` remained available.
- Existing project selection, AI drawer opening, clone polling, and browser capture completed in the same test.
- JavaScript syntax and diff checks passed.

## 44. Docker browser capture and local dependency audit

The Docker image now installs Python, Python Playwright, and Debian Chromium, and sets `HTML_EDITOR_CHROMIUM_PATH=/usr/bin/chromium`. Docker mode can therefore run the same browser-rendered capture worker as local mode. The Docker daemon was not accessible in this environment, so the image build still needs to be run on the host.

Local audit results:

- The `ollama` CLI is installed, but its service was not reachable from the restricted test environment. The model must be confirmed by the user with the commands below.
- The downloaded PinePaper repository is `/home/riki/web_dev/html_editor/mcp-server`. Its dependencies are present, but its documented build invokes Bun, which is not installed. Its optional Puppeteer peer is also not installed, so PinePaper execution mode needs the setup commands below.

The PinePaper build was subsequently completed from the correct directory with Bun. The main editor root must not be used for PinePaper's `bun install`; it has no `build` script.

### Required host setup commands

```bash
# Ollama: verify the daemon and exact model tag
ollama list | grep -E '^qwen3.6:35b([[:space:]]|$)'
curl -fsS http://127.0.0.1:11434/api/tags
ollama run qwen3.6:35b 'Reply with exactly: ollama-ready'

# PinePaper: canonical documented setup
cd /home/riki/web_dev/html_editor/mcp-server
export PATH="/home/riki/.bun/bin:$PATH"
bun install
bun run build

# Docker: build the image with Python Playwright and Chromium
cd /home/riki/web_dev/html_editor
docker compose build html_editor
docker compose up -d html_editor
curl -fsS http://127.0.0.1:3000/api/health
```

After `bun run build`, configure the MCP client that will host PinePaper with:

```json
{
  "mcpServers": {
    "pinepaper": {
      "command": "node",
      "args": ["/home/riki/web_dev/html_editor/mcp-server/dist/cli.js"],
      "env": {
        "PINEPAPER_EXECUTION_MODE": "puppeteer",
        "PINEPAPER_HEADLESS": "true",
        "PINEPAPER_EXPORT_DIR": "/home/riki/web_dev/html_editor/projects"
      }
    }
  }
}
```

The exact MCP configuration file depends on whether the client is Codex, Claude Desktop, OpenCode, or Hermes. Do not put this JSON into the HTML editor; it belongs in the selected MCP client's configuration. The HTML editor will consume PinePaper through the next provider-integration phase.

The client-neutral copy is now stored at `config/mcp/pinepaper.json`. It is a source-of-truth template, not an automatically active client configuration. Copy its `mcpServers.pinepaper` entry into the MCP client selected by the user.

### Host verification

- The Docker image built successfully with Python Playwright and Chromium.
- The Docker container initially returned a connection reset only because the health request raced container startup; a subsequent request returned HTTP 200 from `/api/health`.
- Docker-backed Playwright verified the editor title, project dialog, AI drawer, and light-to-dark theme toggle. A small toolbar stacking fix was added after Playwright identified the side panel intercepting the theme button.

## 46. PinePaper MCP and Ollama animation integration

The animation phase is now wired through two explicit boundaries:

- `POST /api/animation/plan` requests Ollama using `OLLAMA_MODEL` (default `qwen3.6:35b`) and requires strict JSON containing the selected `timeline` or `relations` mode and PinePaper batch operations. Ollama failures are reported instead of silently inventing a completed plan.
- `tools/pinepaper-client.mjs` launches the built PinePaper MCP server over stdio and performs the real `initialize → pinepaper_agent_start_job → pinepaper_agent_batch_execute → pinepaper_agent_end_job → pinepaper_agent_export` sequence.
- `POST /api/projects/:id/animation/submit` validates the plan and saves either PinePaper's animated SVG or, in `PINEPAPER_EXECUTION_MODE=code`, a reviewable `.pinepaper-code.txt` artifact under `svg-work/animated/`.
- The AI drawer now has an animation provider selector, plan JSON preview, mode-aware planning, and explicit PinePaper submission status. SVGator remains visible as an unconfigured provider and is rejected with a clear message rather than being treated as available.

### Verification

- PinePaper code-mode API test passed with a dummy timeline plan and wrote a real `.pinepaper-code.txt` artifact.
- Playwright passed the dummy relations-mode planning flow with a mocked plan response, including project loading, AI drawer opening, mode switching, plan rendering, and status update.
- Existing clone/editor and SVG persistence tests remain passing; JavaScript, shell, and diff checks passed.

### Container verification

- Docker now includes the built PinePaper distribution and its npm runtime dependencies under `/opt/pinepaper`.
- The rebuilt container includes Python Playwright/Chromium, reports healthy on `/api/health`, and passes `node --check /opt/pinepaper/dist/cli.js`.
- Docker exposes Ollama through `host.docker.internal`; Ollama must be listening on an address reachable from Docker for planning requests from the container.

## 45. SVGEdit and persistent semantic tagger

The SVG workspace now persists semantic tags per project at `svg-work/tags.json` through `GET/PUT /api/projects/:id/svg-tags`. Tags are validated, restored on workspace load, and associated with the latest generated SVG asset. The workspace passes project and asset context when opening the local SVGEdit page. The existing SVG preview still provides zoom and element selection, while SVGEdit remains the separate full editor surface.

### Verification

- The supplied van image was converted through the real VTracer endpoint.
- A dummy `van-sun` semantic tag was saved through the backend and reloaded into the SVG workspace.
- Playwright verified saved-tag visibility after reload and the 125% zoom action.
- Docker-backed Playwright verified the existing editor project dialog, AI drawer, and theme toggle after the toolbar layering fix.

## 47. Final end-to-end acceptance

- Real Ollama acceptance passed with `qwen3.6:35b`; the parser now accepts structured JSON returned in either Ollama `response` or qwen3.6 `thinking`.
- Live PinePaper Puppeteer acceptance passed after configuring its launcher to honor `PUPPETEER_EXECUTABLE_PATH`, using system Chromium. The dummy timeline produced a saved animated SVG in `svg-work/animated/`.
- Project creation now generates a project-local `graphify-out/graph.json` and `GRAPH_REPORT.md`; project metadata reports `graphifyStatus: created`.
- Project restoration passed across a server restart, including Graphify files and animated SVG artifact checks.
- Root Graphify was refreshed with `graphify update . --no-cluster`.
- Final Playwright checks passed against both the host service and rebuilt Docker service: editor title, project dialog, AI drawer, and theme toggle.
- Docker includes the rebuilt PinePaper runtime, Python Playwright, and Chromium. For Ollama planning inside Docker, the host Ollama service must listen on a Docker-reachable address; host-mode operation already passed.

## 48. Clone corruption fix and Spline acceptance

- Fixed root-page cloning: the crawler no longer treats the source page `/` as an asset or globally replaces `/`, which had corrupted every path in root-page HTML.
- Re-cloned `https://spline.design/` into the existing project and verified the package HTML begins as valid HTML without the previous `assets/000-asset-0` corruption marker.
- Playwright verified the local preview renders the Spline title/content and a full scrollable page.
- Playwright verified the repaired package imports into the GrapesJS iframe and shows the cloned Spline content.
- The browser capture remains a faithful live-site screenshot; dynamic/remote resources, authenticated routes, and API-backed interactions remain outside the static package boundary.

## 49. Visual media and animation replay

- Next.js `/_next/image` URLs are decoded to their underlying source files; duplicate `srcset` variants are grouped so they do not consume the asset limit.
- Public, explicitly referenced media assets from other origins are now downloaded when they are images, fonts, or video/audio files; analytics, trackers, and external navigation remain excluded.
- Re-cloned Spline package verification found 12 local MP4 files. Playwright confirmed local video readiness and confirmed a video advanced during playback.
- A clone preserves visible design, local media, CSS, and downloaded JavaScript where those resources are self-contained. It does not recreate private APIs, authenticated content, cloud-hosted 3D editors, or server-side behavior without a site-specific runtime adapter.

## 50. Hero motion replay in preview and editor

- Added a Playwright/ffmpeg motion worker that captures the rendered first hero section into `website-package/assets/hero-motion.mp4`.
- The local preview injects the replay as a muted, looping, positioned hero video without replacing the cloned HTML.
- The GrapesJS importer inserts the same video directly as a component because imported scripts are not executed by the editor.
- The motion component can be selected and edited as a layer: position, dimensions, crop, opacity, z-order, loop, mute, and playback settings remain editable. Individual WebGL objects are not separated.
- Docker now includes ffmpeg. Final Playwright verification passed: motion video exists, is ready, advances during playback, and imports into the editor with the cloned Spline page.

## 51. Spline scene capture

- The browser worker now listens for Spline `.splinecode` and modelling-WASM responses while rendering the source page and stores them under `website-package/spline-scenes/`.
- The clone report and manifest list the captured scene URLs, local filenames, response status, and byte sizes. Re-cloning removes stale scene files before writing the new set.
- A live Spline acceptance clone captured three scene files and the modelling WASM successfully. Playwright verified the local scene file returns HTTP 200 and the local motion replay remains playable.
- The editor intentionally keeps the video replay as the stable imported layer. The captured scene payloads are preserved for a future native Spline-runtime adapter; they are binary scene data, not editable HTML/SVG nodes, so the current GrapesJS canvas cannot expose their individual 3D objects without bundling the Spline runtime.

## 52. Explicit project loading

- Added a `Load project` button directly to the AI Workbench clone section.
- It opens the existing backend project list and activates the selected project without creating a duplicate or changing its package.
- Playwright verified the button, project-list visibility, project selection, dialog close, and active-project status.

## 53. Native Spline WebGL replay

- Spline clones with captured scene data now bundle `@splinetool/runtime` locally into the project package and load `scene-00.splinecode` in a real WebGL canvas.
- The Spline MP4 hero is no longer injected when a native scene is available. MP4 remains available only as the generic fallback for sites without a captured runtime scene.
- Pointer movement and pointer buttons are forwarded to the scene canvas; scroll positions are exposed through `html-editor-spline-scroll` and recorded by the Playwright clone worker.
- Playwright verified the local runtime script and scene both return HTTP 200, the runtime becomes ready, no hero video is present, pointer movement changes the rendered frame, and scroll tracking records the current scroll position.
- A generic website cannot be made exactly interactive solely from static files. The crawler now records pointer/scroll behavior and preserves runtime payloads; site-specific adapters are still required for proprietary WebGL engines other than supported runtime formats.

## 54. Clone progress and restoration status

- The AI Workbench now displays a live clone progress bar with percentage, job state, phase message, and worker name.
- Polling now continues for up to five minutes instead of stopping after 30 seconds, and loading an existing project resumes polling from its last clone job.
- Completed, failed, and still-running states are shown in the drawer itself; completed projects expose the preview/capture actions without requiring a terminal check.
- Playwright verified a completed GSAP clone at 100%, its status message, progress bar, and preview availability. The backend job was independently confirmed as completed.

## 55. GSAP module and nested-asset preservation

- The static crawler now publishes safe basename aliases for downloaded JavaScript modules, so relative imports such as `./index-e4482d9c.js` continue to resolve after the crawler prefixes filenames.
- URL replacement now applies path boundaries to absolute and relative URLs. A short route such as `/community` cannot rewrite the beginning of `/community/uploads/...` into an invalid nested local path.
- The clone asset limits were raised to 300 assets, 50 MB per asset, and 200 MB total. This keeps large animation-heavy pages usable while retaining bounded resource consumption.
- Final Playwright verification of `gsap.com/scroll/` passed with `window.gsap === true`, 28 active `ScrollTrigger` instances, visible hero elements, and zero HTTP failures during page load. The clone completed with 504 local assets.
- This preserves the original GSAP JavaScript and ScrollTrigger behavior when all required same-origin modules and assets are downloadable. It still cannot reproduce server-only, authenticated, cross-origin, or proprietary runtime behavior that the source site does not expose to the browser.
