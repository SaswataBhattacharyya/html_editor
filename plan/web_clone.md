# Website Cloning and Visual Editing Plan

## Objective

Turn this repository into a local website-preparation tool that can:

1. Use `ai-website-cloner-template` to reverse-engineer a target website.
2. Open the resulting clone locally with its original interactions preserved where possible.
3. Produce a normalized static website package that this GrapesJS editor can import.
4. Allow visual HTML/CSS/assets editing in GrapesJS.
5. Export the edited result as a portable website package or ZIP archive.

The Next.js clone and the GrapesJS visual editor should remain separate representations. The Next.js version preserves application behavior; the GrapesJS version is optimized for visual editing.

## Repositories and responsibilities

### This repository: GrapesJS visual editor

Path: `/home/riki/web_dev/html_editor`

Responsibilities:

- Import normalized HTML/CSS/JavaScript/assets packages.
- Display the imported site in the GrapesJS canvas.
- Maintain a virtual file system for project files.
- Allow visual editing of HTML and CSS.
- Preview the edited page locally.
- Export the edited result as HTML, assets, or ZIP.

Important existing capabilities:

- GrapesJS editor initialization in `js/editor.js`.
- Virtual file system in `js/editor.js`.
- Single-file, multi-file, and ZIP import commands.
- File explorer panel.
- Fabric.js drawing overlay.
- Tailwind CSS build pipeline.

### Cloner repository

Path: `/home/riki/web_dev/html_editor/ai-website-cloner-template`

Responsibilities:

- Inspect a target URL with browser automation.
- Extract screenshots, assets, design tokens, responsive behavior, and interactions.
- Generate a new Next.js/React/TypeScript implementation.
- Run visual and build checks.
- Preserve the full code-oriented clone for continued development.

The cloner is not a general-purpose downloader. It recreates the visible target page in a new application and does not reproduce private backend systems, authentication, databases, or real-time services by default.

## Target workflow

```text
Target URL
    |
    v
AI Website Cloner
    |
    +--> Next.js clone project
    |       |
    |       +--> npm run dev for full local behavior
    |       +--> coding-agent changes
    |       +--> production/static build
    |
    +--> normalized website package
            |
            v
        GrapesJS import
            |
            +--> visual HTML/CSS editing
            +--> asset/file editing
            +--> local preview
            +--> ZIP/static export
```

## Phase 1: Establish the clone-to-editor contract

Define a normalized package format independent of Next.js internals.

### Proposed package structure

```text
website-package/
  manifest.json
  index.html
  pages/
    about.html
  css/
    styles.css
  js/
    app.js
  images/
  fonts/
  videos/
  icons/
  seo/
```

### Proposed `manifest.json`

```json
{
  "version": 1,
  "name": "cloned-site",
  "sourceUrl": "https://example.com",
  "entry": "index.html",
  "routes": ["/", "/about"],
  "files": {
    "html": ["index.html", "pages/about.html"],
    "css": ["css/styles.css"],
    "javascript": ["js/app.js"],
    "images": [],
    "fonts": [],
    "videos": []
  },
  "generatedBy": "ai-website-cloner-template"
}
```

Requirements:

- Every reference must be relative to the package root.
- Asset paths must remain stable after ZIP extraction.
- The package must identify its main HTML file.
- Multiple routes must be explicit instead of silently collapsing into one page.
- The package must distinguish source files from generated build artifacts.

## Phase 2: Add a static export adapter to the cloner

Create a script in the cloner repository, for example:

```text
scripts/export-website-package.mjs
```

The adapter should:

1. Inspect the generated Next.js routes.
2. Render each route locally.
3. Capture the rendered HTML for each route.
4. Copy or download local assets from `public/`.
5. Collect compiled CSS and required browser JavaScript.
6. Rewrite asset references to package-relative paths.
7. Write `manifest.json`.
8. Produce a ZIP archive suitable for GrapesJS import.

Preferred output modes:

### Static export mode

Use Next.js static export when the cloned page does not require server-only behavior. This is the preferred mode for a portable package.

### Rendered snapshot mode

Run the local Next.js app and use browser automation to capture the DOM and assets when static export is not sufficient. This captures the visual state but cannot guarantee that all application behavior survives in GrapesJS.

### Full Next.js mode

Keep the original generated project untouched and run it with:

```bash
npm run dev
```

This is the authoritative version for interactions, routing, React state, and application logic.

## Phase 3: Harden GrapesJS package import

Update the current import system in `js/editor.js`.

### Required improvements

1. Preserve ZIP directory paths exactly.
2. Read `manifest.json` when present.
3. Select the manifest entry file instead of guessing only `index.html`.
4. Rewrite relative stylesheet references.
5. Rewrite `url(...)` references inside CSS.
6. Rewrite local fonts, videos, SVGs, and background images.
7. Preserve scripts from both `<head>` and `<body>`.
8. Flag external resources separately from missing local resources.
9. Support route selection when a package contains multiple HTML files.
10. Display import warnings instead of silently dropping unsupported content.
11. Avoid loading unsafe scripts automatically without user confirmation.
12. Keep original file paths available for export.

### Virtual file system changes

Extend `VirtualFileSystem` with:

- `manifest` metadata.
- `entryFile` selection.
- binary-safe file storage.
- MIME detection for fonts, videos, and additional image formats.
- CSS reference rewriting.
- script placement metadata.
- route metadata.
- cleanup of generated object URLs.
- export of all stored files.

Suggested methods:

```text
loadPackage(files)
loadManifest(manifest)
setEntryFile(path)
resolveAssetReference(basePath, reference)
rewriteCssReferences(css, basePath)
rewriteHtmlReferences(html, basePath)
getRoutes()
exportPackage()
```

## Phase 4: Add a clone import workflow to the editor

Add a dedicated command such as:

```text
Import cloned website
```

The workflow should provide:

1. ZIP upload.
2. Optional package validation.
3. File-count and size summary.
4. Main route selection.
5. External-resource warnings.
6. Unsupported-feature warnings.
7. Preview before replacing the current editor state.
8. Confirmation before import.

The existing generic `Load Files` command can remain for simple HTML imports, while the new command handles structured website packages.

## Phase 5: Add editor export modes

The editor should support three exports.

### Visual page export

Export the current GrapesJS HTML and CSS as a standalone HTML file.

### Website package export

Export the complete virtual file system, preserving:

- HTML files.
- CSS files.
- JavaScript files.
- images.
- fonts.
- videos.
- manifest metadata.

### ZIP export

Package the website export into a ZIP archive that can be reopened by the editor or served by a local static server.

The current save command produces one HTML file and should be extended rather than treated as the complete project export.

## Phase 6: Local preview and serving

Use two preview paths.

### GrapesJS canvas preview

Use this for immediate visual editing. It should render the selected entry HTML with local assets converted to safe preview URLs.

### Static package preview

Add a local serving option for exported packages. A package should be testable with a static server so relative routes and assets can be verified outside the GrapesJS canvas.

Example:

```bash
python3 -m http.server 3000 --directory exported-site
```

### Next.js preview

Keep the source clone runnable independently:

```bash
cd /home/riki/web_dev/html_editor/ai-website-cloner-template
npm run dev
```

## Phase 7: Round-trip policy

Do not promise automatic GrapesJS-to-Next.js conversion initially.

Use this policy:

- Next.js clone is the source of truth for application behavior.
- GrapesJS package is the source of truth for visual/static edits.
- Visual changes can be manually ported back to React components.
- A future code-generation step may translate selected GrapesJS changes into component patches.

Possible future round-trip features:

- Export a component spec from GrapesJS.
- Map editor regions to React components.
- Generate a change proposal instead of overwriting Next.js source.
- Use visual diffing to validate the generated React result.

## Phase 8: Security and legal safeguards

The tool should make the following explicit:

- Only clone sites the user owns or has permission to reproduce.
- Respect robots.txt, terms of service, copyright, and rate limits.
- Do not bypass authentication, paywalls, bot protection, or access controls.
- Do not automatically execute arbitrary third-party scripts inside the editor.
- Sanitize imported HTML before displaying it in the editor UI.
- Isolate preview content where possible.
- Warn that copied forms, analytics, tracking, and API calls may still target the original site.

## Validation plan

### Cloner validation

```bash
cd /home/riki/web_dev/html_editor/ai-website-cloner-template
npm run check
```

Verify:

- a target URL can be cloned;
- the generated Next.js app runs locally;
- assets are present;
- responsive states are represented;
- the static package is generated;
- multiple routes are listed in `manifest.json`.

### GrapesJS validation

```bash
cd /home/riki/web_dev/html_editor
npm run build:css
npm start
```

Verify:

- a generated ZIP imports successfully;
- nested assets render;
- CSS background images render;
- fonts and SVGs load;
- multiple HTML routes can be selected;
- scripts are clearly reported or safely handled;
- visual edits can be exported;
- the exported ZIP can be reopened.

### Acceptance test fixture

Create a small fixture package containing:

- `index.html`;
- one secondary route;
- nested CSS;
- a background image;
- a local font;
- an SVG;
- a JavaScript interaction;
- a video or poster image.

Use it to test import, preview, edit, export, and re-import before testing against a real cloned website.

## Recommended implementation order

1. Define and validate `manifest.json`.
2. Build the cloner static export adapter.
3. Add a package validator.
4. Refactor `VirtualFileSystem` around package metadata and path-safe references.
5. Harden ZIP import and CSS/asset rewriting.
6. Add a dedicated cloned-website import command.
7. Add complete website package and ZIP export.
8. Add route selection and static package preview.
9. Add security warnings and script handling.
10. Test with a fixture, then a real permitted target website.
11. Only after that, consider optional React/Next.js round-trip generation.

## Definition of done

The first useful version is complete when:

- the cloner can produce a local Next.js clone;
- the clone can run independently with its interactions;
- the clone can produce a normalized ZIP package;
- this editor can import that ZIP without losing nested assets;
- the imported page can be edited visually;
- the editor can export an updated package;
- the package can be reopened and served locally;
- the original Next.js clone remains intact;
- unsupported backend or interactive behavior is clearly reported rather than silently claimed as copied.
