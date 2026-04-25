## Context

The app already renders Mermaid as inline SVG via `lib/mermaid.ts` (`renderMermaid` returns the SVG string from `mermaid.render()`). The rendered SVG lives inside the diagram canvas component, wrapped by `react-zoom-pan-pinch`'s `TransformWrapper`. Viewport navigation lives in `components/viewport-controls.tsx` — a small vertical pill at `bottom-4 right-4` containing three Material 3 icon buttons (zoom in, zoom out, fit). The rest of the UI is themed with the M3 token system (`--md-sys-color-*`, `--md-sys-shape-*`, `--md-sys-elevation-*`).

There is no existing export path. Users can only screenshot the canvas, which loses vector fidelity and cannot be re-edited. Because the SVG string is already in hand at render time, SVG export is essentially free; PNG and PDF are derived from that same SVG.

## Goals / Non-Goals

**Goals:**
- One trigger control on the canvas, visually adjacent to the viewport controls but in its own group with a clear gap, that opens a menu of three formats: SVG, PNG, PDF.
- Use the *currently rendered* SVG as the source of truth — no re-running `mermaid.render()` on export, no double-rendering.
- PNG export is high-DPI by default (2x) so it stays sharp when pasted into docs/decks.
- PDF export produces a real vector PDF (not a rasterized one) so the result is print-quality.
- PDF library is dynamically imported, only loaded when the user picks PDF.
- Disabled state is honest: if there is no valid render (empty source, parse error with no prior render), the trigger is disabled and screen-readers know why.

**Non-Goals:**
- No JPG (PNG with transparency covers the same use cases plus more; JPG adds a third raster format with worse quality).
- No raw `.mmd` source download — out of scope per user decision; the source is already visible in the side panel and easy to copy.
- No multi-page PDF or paper-size selection — single page sized to diagram bounds is enough for v1.
- No server-side rendering — purely client-side.
- No copy-to-clipboard — separate feature, not requested.
- No batch export of multiple diagrams.

## Decisions

### Decision 1: Use the live DOM SVG element, not the SVG string

**Choice**: Read the SVG via a DOM ref to the currently rendered `<svg>` element inside the canvas, rather than persisting/re-using the SVG string returned by `renderMermaid`.

**Why**: The DOM SVG reflects exactly what the user sees, including any post-render adjustments mermaid does after insertion. It also means we don't need to thread the SVG string through React state. We `cloneNode(true)` and serialize with `XMLSerializer` so we never mutate the live one.

**Alternative considered**: Cache the SVG string in `diagram-store` on every successful render. Rejected — adds state for a value already available in the DOM, and risks drift if mermaid mutates the SVG after `render()` returns.

### Decision 2: PNG via off-screen `<canvas>` and `toBlob()`

**Choice**: Serialize the cloned SVG to a string, encode as a `data:image/svg+xml;charset=utf-8,...` URL, draw onto a same-origin `<canvas>` sized to `svg.viewBox.width * scale` × `svg.viewBox.height * scale`, then `canvas.toBlob('image/png')`. Default `scale = 2`.

**Why**: Standard, no dependencies, works in every evergreen browser. The 2x scale gives crisp output on retina displays and when pasted into docs.

**Alternative considered**: `html-to-image` or `dom-to-image-more`. Rejected — extra dependency, and they target arbitrary DOM trees, not pure SVG. We have a pure SVG, so direct canvas rasterization is simpler and produces sharper output.

**Background**: PNG export emits a transparent background (no fill). Rationale: the canvas itself shows the diagram on a themed surface; downstream users can paste onto any background.

**Font handling**: Mermaid uses CSS-driven fonts. To avoid blank text on the rasterized output, the cloned SVG must embed the computed `font-family` / `font-size` as inline `style` on text nodes before serialization, OR include a `<style>` block inside the SVG with the relevant rules. We will inline the relevant computed styles on the cloned tree (text nodes only) to keep payload small. This is also needed for PDF.

### Decision 3: PDF via `jspdf` + `svg2pdf.js`, dynamically imported

**Choice**: Add `jspdf` and `svg2pdf.js`. Lazy-import them only when the user clicks "PDF" via `await import('jspdf')` and `await import('svg2pdf.js')`. Build a single-page PDF sized to the SVG's viewBox in points.

**Why**: `svg2pdf.js` walks the SVG tree and emits PDF vector primitives — output stays vector and crisp at any zoom. `jspdf` is the underlying PDF document builder. Combined gzip cost is ~100KB; lazy import keeps it off the initial bundle so users who never export PDF pay nothing.

**Alternatives considered**:
- Print-to-PDF (open new window, `window.print()`): rejected — relies on user's print dialog, can't control filename, output quality varies.
- Server-side rendering with headless Chromium: rejected — no server, would require infra and a roundtrip for what is a trivial client transform.
- Rasterize SVG to PNG then embed in PDF via `jspdf` alone: rejected — gives a PDF whose contents are bitmap, defeating the point of choosing PDF over PNG.

### Decision 4: Trigger UI — a separate group with a gap

**Choice**: Render a second pill (same surface/shape/elevation tokens as `ViewportControls`) below the existing one, with a visible gap. The new pill contains a single `md-icon-button` (`download` Material Symbol). Clicking opens an M3 menu (`md-menu` anchored on the button) with three items: SVG, PNG, PDF.

**Why**: User explicitly asked for adjacency without grouping. Keeping it as a sibling pill with gap (e.g. `mt-2` / 8–12px) reads as "another control, not part of zoom". Reusing the same M3 surface tokens keeps it visually consistent.

**Alternative considered**: Add the download button as a fourth icon inside the existing pill. Rejected by the user's instruction.

**Disabled state**: when `hasValidRender === false`, the trigger button is disabled (`disabled` attr + `aria-disabled="true"`) with a tooltip "Render a diagram first".

### Decision 5: Filename convention

**Choice**: `diagram-YYYYMMDD-HHmmss.<ext>` based on the user's local time at click. Lowercase, hyphen-delimited, no colons (Windows-safe).

**Why**: Avoids collisions when exporting iteratively, sorts naturally in file managers, no surprise overwrites. Local time (not UTC) because the value is consumer-facing.

### Decision 6: Where the export module lives

**Choice**: New `lib/diagram-export.ts` exposing three async functions:
- `exportSvg(svg: SVGSVGElement, filename: string): Promise<void>`
- `exportPng(svg: SVGSVGElement, filename: string, scale?: number): Promise<void>`
- `exportPdf(svg: SVGSVGElement, filename: string): Promise<void>`

Each function: clones, inlines styles, performs format-specific conversion, triggers the download via a temporary `<a download>` element, and revokes the object URL.

**Why**: Keeps export logic out of components; each function is independently testable; the PDF function is the natural place for the lazy import.

## Risks / Trade-offs

- **[Mermaid relies on external CSS for fonts]** → text in PNG/PDF could render with the wrong font or fall back to a default. **Mitigation**: inline computed `font-family`, `font-size`, `font-weight`, and `fill` on `<text>` nodes of the cloned tree before serialization. Add a manual QA pass on a flowchart with labels and a sequence diagram with notes.

- **[Foreign objects / HTML labels in mermaid]** → `<foreignObject>` content does not rasterize via `<canvas>.drawImage(svg)` and does not export cleanly via `svg2pdf`. **Mitigation**: scope v1 to standard mermaid output (SVG-text labels). If we hit this in QA, document it as a known limitation in the requirement; full HTML-label support would need a separate change.

- **[Large diagrams]** → at 2x scale, a wide flowchart can produce a multi-megapixel canvas. **Mitigation**: cap raster dimensions (e.g. 8192px on the longer side) and downscale the requested scale to fit. PDF is unaffected since it's vector.

- **[PDF lib bundle size]** → `jspdf` + `svg2pdf.js` are ~100KB gzip. **Mitigation**: lazy import inside `exportPdf` so the cost is only paid by users who export PDF. Show a brief loading toast ("Preparing PDF…") if the import takes >200ms so the UI doesn't feel frozen.

- **[Browser security / tainted canvas]** → if the SVG references external image hrefs, drawing it onto a canvas can taint it and block `toBlob`. **Mitigation**: mermaid output for our supported diagram types is self-contained (no external images). If this becomes a problem we can add a pre-check that bails to SVG-only.

- **[Icon button menu accessibility]** → menu must be keyboard-navigable. **Mitigation**: use `md-menu` which already implements ARIA for menus; ensure the trigger has `aria-haspopup="menu"` and the menu items have visible labels.

## Open Questions

- Should PNG default scale be 2x or configurable via a sub-menu (1x / 2x / 4x)? — Defaulting to 2x for v1, can add a sub-menu later if users ask.
- Should we offer "copy to clipboard" alongside download? — Out of scope for v1, easy follow-up.
