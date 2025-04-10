# HTML Editor with GrapesJS

A web-based HTML editor built using GrapesJS, allowing users to create and edit web content through a visual interface.

## Features

- Drag and drop interface for building web pages
- Rich text editing capabilities
- Component library with pre-built blocks
- Responsive design preview
- Style management with Tailwind CSS integration
- Real-time preview of changes

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