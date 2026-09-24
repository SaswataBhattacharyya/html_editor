# Graph Report - html_editor  (2026-09-20)

## Corpus Check
- 5 files · ~8,546 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 67 nodes · 79 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d396c80`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- VirtualFileSystem
- dependencies
- editor.js
- package.json
- HTML Editor with GrapesJS
- scripts

## God Nodes (most connected - your core abstractions)
1. `VirtualFileSystem` - 13 edges
2. `HTML Editor with GrapesJS` - 8 edges
3. `loadMultipleFiles()` - 6 edges
4. `scripts` - 4 edges
5. `loadSingleHtmlFile()` - 3 edges
6. `run()` - 2 edges
7. `onDblClick()` - 2 edges
8. `@headlessui/react` - 2 edges
9. `autoprefixer` - 2 edges
10. `grapesjs` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "VirtualFileSystem"
Cohesion: 0.27
Nodes (3): loadMultipleFiles(), loadSingleHtmlFile(), VirtualFileSystem

### Community 1 - "dependencies"
Cohesion: 0.15
Nodes (13): autoprefixer, grapesjs, @headlessui/react, dependencies, autoprefixer, grapesjs, @headlessui/react, postcss (+5 more)

### Community 2 - "editor.js"
Cohesion: 0.18
Nodes (4): editor, fabricDrawingIntegration, onDblClick(), run()

### Community 3 - "package.json"
Cohesion: 0.17
Nodes (11): author, description, devDependencies, serve, keywords, license, main, name (+3 more)

### Community 4 - "HTML Editor with GrapesJS"
Cohesion: 0.22
Nodes (8): Contributing, Features, HTML Editor with GrapesJS, Initial Setup, License, Prerequisites, Project Setup, Project Structure

### Community 5 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build:css, dev, start

## Knowledge Gaps
- **27 isolated node(s):** `editor`, `fabricDrawingIntegration`, `name`, `version`, `description` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `VirtualFileSystem` connect `VirtualFileSystem` to `editor.js`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `editor`, `fabricDrawingIntegration`, `name` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._