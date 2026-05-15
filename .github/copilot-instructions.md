## Purpose
This file gives concise, repository-specific guidance so an AI coding agent can be productive editing and extending this static demo site (ConversionPulse).

## High-level architecture
- Static site: plain HTML files + a single stylesheet at `styles.css`.
- Root pages: `index.html` (dashboard), `PLANTILLA.html` (authoring template).
- Category index pages live under `categorias/` and individual demos under `codigos/`.
- No backend, no build tools: content is served as static files; changes are immediate when previewed via a local server.

## Key files & patterns (use these as authoritative examples)
- `PLANTILLA.html`: canonical template for new demo pages. Copy this file and adapt fields (title, description, etiquetas, info-meta, instrucciones, code blocks).
- `index.html`: shows dashboard and examples of how `codigos/*` pages are referenced.
- `styles.css`: single source of truth for visuals (colors, layout, manual syntax highlighting classes such as `.keyword`, `.string`, `.comment`, `.function`, `.number`, `.builtin`).
- Example code-entry file: `codigos/ret-006.html` — follows PLANTILLA structure and includes the copy-button JS function `copiarCodigo()` and a video placeholder.

## Naming & content conventions (follow exactly)
- Filenames in `codigos/` use a short prefix per category and a three-digit suffix, e.g. `fc-001.html` (financial crimes), `ana-002.html` (analytics), `gob-003.html` (gobierno), `ret-006.html` (retail).
- Dates use `YYYY-MM-DD` in `info-meta` (see `ret-006.html`).
- Use language tag spans for code blocks: set `<span class="etiqueta-lenguaje">python</span>` to label language.
- To mark a sidebar category as selected, add the class `activa` to the anchor: `class="sidebar-categoria activa"`.
- Relative paths matter: pages in `codigos/` use `../` to reach `styles.css`, `index.html`, and `categorias/` (follow PLANTILLA.html for correct link patterns).

## Code block authoring specifics
- The UI supports manual syntax highlighting using span classes. Use these classes exactly: `keyword`, `string`, `comment`, `function`, `number`, `builtin`.
- The block wrapper must match the template: `<div class="bloque-codigo">` → `<div class="barra-archivo"><span>filename.ext</span>...</div><pre><code>...</code></pre>`.
- The copy button calls `copiarCodigo(this)` and reads the `code` element's `textContent`; avoid adding extra DOM wrapping that changes that selector.

## Adding a new demo (step-by-step example)
1. Copy `PLANTILLA.html` → `codigos/ret-007.html` (choose correct category prefix).
2. Edit `tarjeta-titulo`, `tarjeta-descripcion`, `etiquetas`, `info-meta` (author + date YYYY-MM-DD).
3. Update the filename shown in `.barra-archivo` to match the real filename.
4. Paste code inside the `<pre><code>...</code></pre>`; optionally use span classes for manual highlighting.
5. If adding a video, either paste a YouTube iframe or add a `<video>` element as shown in `PLANTILLA.html`.
6. Commit and preview with a local server.

## Local preview / developer workflow
- No build step. To preview locally run (from repository root):

```
python3 -m http.server 8000

# then open http://localhost:8000 in your browser
```

- Alternatively use VS Code Live Server extension for hot reload.

## Editing UI & style rules
- All visual changes are centralized in `styles.css`. Examples:
  - Sidebar width is set by `.sidebar { width: 240px }` and main content uses `.zona-principal { margin-left: 240px }`.
  - Manual code highlighting classes are defined near the top of `styles.css` (search for `.keyword`, `.string`).

## What not to change / fragile parts
- Don’t rename `PLANTILLA.html` (it’s the template other pages assume). If you do, update links in `index.html` and category pages.
- Keep the relative link structure used in existing pages. Many pages assume `../` from `codigos/` to reach `styles.css` and `index.html`.
- The copy button selector assumes the DOM structure: `boton.closest('.bloque-codigo').querySelector('code')`.

## Integration points & external dependencies
- This is a self-contained static site: there are no external build tools, npm packages, or CI hooks in the repository to discover.
- If you add third-party scripts/videos, prefer embedding via iframe (YouTube) or placing media under a `videos/` folder and linking with `../videos/...`.

## When you need more context
- Look at `index.html`, `PLANTILLA.html`, any `codigos/*.html` for concrete examples. Use those as the canonical patterns to follow.

If any section is unclear or you want the instructions to enforce additional checks (lint rules, CI previews, naming enforcement), tell me which checks you want and I will iterate.
