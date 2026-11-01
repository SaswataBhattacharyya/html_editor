# HTML Editor with GrapesJS

A web-based HTML editor built using GrapesJS, allowing users to create and edit web content through a visual interface.

## Features

- Drag and drop interface for building web pages
- Rich text editing capabilities
- Component library with pre-built blocks
- Responsive design preview
- Style management with Tailwind CSS integration
- Real-time preview of changes

## Authorized 3D asset capture (experimental)

The **Clone a website** panel can now capture observed GLB, glTF, FBX, OBJ, USDZ,
Spline and texture-container assets from browser requests. Captured files appear
under the clone package and in its `manifest.json` `modelAssets` collection.
This captures **loaded 3D files**, not arbitrary live WebGL vertex buffers,
protected resources the browser cannot access, or the entire Three.js scene graph.

For a site **you own or are authorized to reproduce**, check
**Use interactive login (local desktop Chromium)** before cloning. A visible
Chromium window opens on the computer running `server.mjs`. Sign in yourself,
navigate to the desired page and click **Continue after login** in the editor.
The Playwright browser keeps its cookies only in memory and closes when done;
credentials and session-state files are not intentionally saved. **However, the
captured HTML, XHR responses and screenshots can contain sensitive account
data**. Treat the `projects/` directory as private and do not share captures
without reviewing them.

### Local setup

```sh
npm install
python3 -m pip install playwright
python3 -m playwright install chromium
npm start
```

Open `http://127.0.0.1:3000` locally. Interactive login requires the
server to bind to localhost (default: `HTML_EDITOR_HOST=127.0.0.1`) and a
desktop with a visible Chromium display. Docker uses
`HTML_EDITOR_HOST=0.0.0.0` for container networking and disables this mode;
use the local desktop setup for user-assisted login. No authentication bypass,
paywall bypass, or automatic credential handling is provided.

Captured assets are limited to resources the browser actually requested.
Load the desired model and exercise only non-destructive interactions before
pressing Continue. A model loaded after capture will not be present. Cross-
origin glTF dependencies such as images and BIN files may require additional
capture support. Use the clone report to distinguish editable model assets,
the local live preview, and unsupported canvas-only geometry.

For implementation details, known limitations and the Codex test checklist,
see `plan/authenticated_3d_codex_handoff.md`.

---

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js and npm
- Python 3 (for running a local server)

## Initial Setup

1. Install required packages:
```bash
npm init -y
npm install -D tailwindcss
npm install grapesjs
npx tailwindcss init
```

2. Set up a local server (choose one method):
```bash
# Using Python 3
python3 -m http.server 3000

# OR using Node.js http-server
npm install -g http-server
http-server -p 3000
```

## Project Setup

1. Clone the repository:
```bash
git clone https://github.com/SaswataBhattacharyya/html_editor.git
cd html_editor
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Build for production:
```bash
npm run build
```

## Project Structure

- `index.html` - Main editor interface
- `js/editor.js` - GrapesJS editor configuration
- `src/input.css` - Tailwind CSS source file
- `dist/output.css` - Compiled CSS output

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 