## Repo overview

This is a small client-side Menu Engine implemented as plain ES modules (no build). The app lives under `engine/` and is intended to be served over HTTP (not opened with file://) so dynamic imports and fetch() work correctly.

Key runtime pieces
- `engine/engine.js` — app entry, state, JSON parsing (`parseJSONRelaxed`), normalization (`normalizeMenu`), UI wiring and exports (`initApp`, `exportViewerEmbedded`).
- `engine/registry.js` — central registry: add templates & themes here. Keys defined in `REGISTRY.templates` and `REGISTRY.themes` map to module paths / JSON files.
- `engine/template-manager.js` — loads templates via `import()` and expects each template module to export an async `render(menu)` that returns HTML.
- `engine/theme-manager.js` — loads JSON theme files via `fetch()` and applies CSS variables to `:root`.
- `templates/` — template modules (e.g. `template-two-col.js`, `template-grid.js`) — implement `render(menu)`.
- `themes/` — theme JSON files (e.g. `classic.json`, `neon.json`) with key→value CSS variables.

Why certain patterns exist
- Dynamic imports are used so templates can be swapped without bundling; therefore files must be served from a web server and paths in `REGISTRY.templates` must be reachable.
- Theme loading uses `fetch()` to allow small JSON theme files; themes are applied by writing CSS vars to `document.documentElement`.
- `parseJSONRelaxed` and `normalizeMenu` make the app tolerant to many incoming JSON shapes (single vs nested `menu`, alternate key names). Use these functions for any import/transform logic to keep data consistent.

Developer workflows / run tips
- Serve the project root over HTTP. Examples (PowerShell):
  - Python: `python -m http.server 8000`
  - Node (if installed): `npx http-server -p 8000`
  Then open `http://localhost:8000/engine/index.html`.
- Live-reload: recommended to use VS Code Live Server or `http-server` to avoid CORS / ESM import errors.
- Debugging: open browser console. Common issues:
  - "Failed to load template" → path in `engine/registry.js` is wrong or server not running.
  - Theme fetch failures → confirm theme path in `REGISTRY.themes` and same-origin serving.
  - Missing mount element: `engine.js` expects an element with id preview, app, or mount.

Project-specific conventions
- Registry-first: add any new template or theme only by updating `REGISTRY` in `engine/registry.js` (key → relative path). Templates use the key names found in `state.template`.
- Template contract: template modules must export `async function render(menu)` that returns HTML string. `template-manager.js` caches modules by path.
- Data model: app expects normalized model with `menu.name`, `menu.categories[]` where each category has `name` and `items[]` (item: `{name, price, desc}`). Use `normalizeMenu()` to transform arbitrary JSON inputs.
- Local state: use `localStorage` keys shown in `engine/engine.js`: `menuEngineData_v1`, `me:theme`, `me:template`.

Useful examples (copy/paste)
- Add template entry (in `engine/registry.js`):
  ` 'my-template': { path: '../templates/my-template.js' }`

- Template skeleton (in `templates/my-template.js`):
  export async function render(menu) { return `<div>...use menu.categories...</div>` }

Quick notes for AI agents
- Prefer editing `REGISTRY` when adding resources; do not hardcode paths elsewhere.
- When modifying rendering, use `renderTemplate()` (it returns a Promise). Keep error handling similar to existing `errorBox()` usage.
- When changing theme JSON shape, update `theme-manager.js` usage and mention the change in README.
- Follow existing tolerant parsing and normalization; do not remove `parseJSONRelaxed` unless you update all import paths that rely on lenient parsing.

Where to look first when starting work
- `engine/engine.js` — read top-to-bottom for app lifecycle and user flows (file upload, save/load draft, export viewer).
- `engine/registry.js` — authoritative place for templates/themes and CTA features.
- `templates/` — concrete rendering patterns (how headings, prices, and item classes are emitted).

If something is missing
- If you need a build step or NPM scripts, none are present — add a `package.json` and document commands in README.

Feedback
- If any runtime examples or commands are wrong for your environment, tell me which OS/ports/tools you prefer and I will refine these instructions.
