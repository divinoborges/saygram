## 1. Dependencies and scaffolding

- [x] 1.1 Add `jspdf` and `svg2pdf.js` to `package.json` dependencies; run install and verify the lockfile updates cleanly.
- [x] 1.2 Create `lib/diagram-export.ts` with empty exported signatures for `exportSvg`, `exportPng`, `exportPdf`, and a `buildExportFilename(format: 'svg' | 'png' | 'pdf', now?: Date): string` helper.
- [x] 1.3 Implement `buildExportFilename` to produce `diagram-YYYYMMDD-HHmmss.<ext>` from local time, padded, with no filesystem-reserved characters.

## 2. Shared SVG helpers

- [x] 2.1 Implement an internal `cloneSvgForExport(svg: SVGSVGElement): SVGSVGElement` that deep-clones the live SVG and returns the clone (never mutates the original).
- [x] 2.2 Inline the computed `font-family`, `font-size`, `font-weight`, and `fill` from the live document onto each `<text>` (and `<tspan>`) descendant of the cloned tree, so the SVG renders identically without external CSS.
- [x] 2.3 Ensure the cloned SVG has explicit `width`, `height`, and `viewBox` attributes derived from the live element's `getBBox()` or existing `viewBox`, so downstream consumers (canvas, PDF) get a well-defined coordinate system.
- [x] 2.4 Implement an internal `serializeSvg(svg: SVGSVGElement): string` using `XMLSerializer`, prepending the XML declaration `<?xml version="1.0" encoding="UTF-8"?>`.

## 3. SVG export

- [x] 3.1 Implement `exportSvg(svg, filename)`: clone, inline styles, serialize, wrap in a `Blob({ type: 'image/svg+xml' })`, trigger a `<a download>` click, then revoke the object URL.
- [ ] 3.2 Manually verify the downloaded file opens in a browser tab with the same appearance as the canvas (fonts, colors, layout).

## 4. PNG export

- [x] 4.1 Implement `exportPng(svg, filename, scale = 2)`: clone, inline styles, serialize, encode as `data:image/svg+xml;charset=utf-8,<encoded>`, load into an `Image`, draw onto an off-screen `<canvas>` sized `viewBox.w * scale` × `viewBox.h * scale` (no background fill), and call `canvas.toBlob('image/png')`.
- [x] 4.2 Cap raster dimensions at 8192px on the longer side; when the requested scale would exceed the cap, downscale the effective scale to fit while preserving aspect ratio.
- [x] 4.3 Trigger the download via `<a download>` and revoke the object URL after the click.
- [ ] 4.4 Manually verify the PNG has a transparent background (open in an editor with a checkerboard) and that text is sharp at 100% zoom on a retina display.

## 5. PDF export

- [x] 5.1 Implement `exportPdf(svg, filename)` with `jspdf` and `svg2pdf.js` imported via dynamic `await import(...)` inside the function body.
- [x] 5.2 Construct a `jsPDF` document sized to the SVG viewBox (in points), call `svg2pdf` with the cloned, style-inlined SVG, and call `doc.save(filename)`.
- [ ] 5.3 Manually verify the PDF opens with one page, fits the diagram without cropping, and stays crisp at 400% zoom (vector, not rasterized).
- [x] 5.4 Confirm via build output / network panel that the PDF libraries are not in the initial bundle and only fetched when the user picks PDF.

## 6. Export trigger UI

- [x] 6.1 Create the export trigger component (e.g. `components/export-controls.tsx`) — a separate M3 surface pill containing a single `md-icon-button` with the Material Symbol `download`, styled with the same surface/shape/elevation tokens as `ViewportControls`.
- [x] 6.2 Wire the trigger to open an `md-menu` anchored on the button with three items in order: SVG, PNG, PDF, each with its Material Symbol icon (e.g. `image`, `photo`, `picture_as_pdf`).
- [x] 6.3 Implement keyboard support: Up/Down navigate items, Enter/Space activate, Escape closes and returns focus to the trigger.
- [x] 6.4 Implement the disabled state: when `hasValidRender === false`, render the trigger with `disabled` and `aria-disabled="true"`, attach a tooltip "Render a diagram first", and prevent the menu from opening.

## 7. Mounting the trigger on the canvas

- [x] 7.1 In the canvas component that renders `ViewportControls`, mount `<ExportControls />` as a sibling so it appears below the existing pill, separated by a deliberate gap (e.g. `mt-2` / 8–12px) — not inside the same pill.
- [x] 7.2 Pass the rendered SVG element ref and a `hasValidRender` boolean (derived from the diagram store) into `<ExportControls />`.
- [x] 7.3 Verify the export pill stays fixed on the canvas during pan/zoom and does not move with the diagram content.

## 8. Wiring formats to the trigger

- [x] 8.1 In `<ExportControls />`, on item activation, call `buildExportFilename(format)` and the matching `exportSvg` / `exportPng` / `exportPdf` from `lib/diagram-export.ts`, passing the live SVG ref and filename.
- [x] 8.2 Wrap each call in try/catch; on failure, surface a toast via the existing `lib/toast.ts` host with a short message ("SVG/PNG/PDF export failed — try again"). Log the error to `console.error`.
- [x] 8.3 For PDF: if the dynamic import takes longer than ~200ms, show a "Preparing PDF…" toast that auto-dismisses when the download starts (or on error).

## 9. Manual QA pass

- [ ] 9.1 Test on a flowchart with multiple node shapes and edge labels: SVG, PNG, PDF all match the canvas visually, including label fonts.
- [ ] 9.2 Test on a sequence diagram (notes + actors): same.
- [ ] 9.3 Test the disabled state: with empty source, trigger is disabled; after first valid render, becomes enabled.
- [ ] 9.4 Test parse-error fallback: introduce an invalid candidate while a previous valid render is visible; confirm export still produces the previous valid render.
- [ ] 9.5 Test back-to-back exports (SVG then PNG within seconds) — both files download, neither overwrites the other.
- [ ] 9.6 Test in light and dark themes — exports reflect the rendered colors of the canvas at the time of click.
