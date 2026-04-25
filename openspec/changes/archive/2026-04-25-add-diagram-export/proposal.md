## Why

Users have no way to take a rendered Mermaid diagram out of the app — they can only view it inside the canvas. Once they've shaped a diagram with the assistant, they typically want to drop it into a doc, deck, ticket, or print it. Today they have to screenshot it, which loses fidelity and can't be re-used as vector or print-quality output.

## What Changes

- Add a download control on the diagram canvas, positioned next to the existing viewport controls toolbar (zoom in / zoom out / fit) but rendered as a separate group with a visual gap so it does not appear bundled with navigation.
- Clicking the control opens a small menu offering three export formats: **SVG**, **PNG**, and **PDF**.
- SVG export downloads the currently rendered Mermaid SVG as-is (vector, lossless).
- PNG export rasterizes the SVG to a high-DPI bitmap (default 2x device-pixel scale) with a transparent background.
- PDF export renders the SVG into a single-page PDF sized to the diagram bounds.
- Filename defaults to `diagram-<timestamp>.<ext>` so repeated exports do not overwrite each other.
- Export is disabled when no valid Mermaid render is present (empty state or parse error with no prior valid render).
- Add a new client dependency for PDF generation (`jspdf` + `svg2pdf.js`); SVG and PNG do not need new deps.

## Capabilities

### New Capabilities
- `diagram-export`: User-initiated export of the currently rendered Mermaid diagram to SVG, PNG, or PDF, including the on-canvas trigger control, format selection, filename convention, and disabled-state behavior.

### Modified Capabilities
<!-- None. The viewport controls keep their existing scope (pan/zoom/fit). The export trigger sits adjacent on the canvas but is a separate control group, not part of the navigation cluster. -->

## Impact

- **Code**:
  - New: `lib/diagram-export.ts` (SVG/PNG/PDF conversion helpers), export trigger component (likely `components/export-button.tsx` or co-located with the viewport controls area).
  - Modified: `components/diagram-canvas.tsx` (or wherever `ViewportControls` is mounted) to render the new export group adjacent to `ViewportControls` with a gap; needs access to the current rendered SVG element/string and a "has valid render" flag.
  - Read-only consumer of: `lib/mermaid.ts` (uses the SVG already produced by `renderMermaid`), `lib/diagram-store.ts` (to know whether a valid render exists).
- **Dependencies**: adds `jspdf` and `svg2pdf.js` to `package.json` (PDF path only). SVG and PNG paths use platform APIs (Blob, canvas, `URL.createObjectURL`).
- **APIs / contracts**: no server or tool-call changes. Pure client-side feature.
- **Bundle size**: PDF deps add ~100KB gzipped — acceptable for a primary export feature, but PDF lib should be dynamically imported so it is only loaded when the user picks PDF.
- **Browser support**: relies on `URL.createObjectURL`, `<canvas>.toBlob()`, and `XMLSerializer` — all evergreen-browser standard. No SSR concerns since the diagram canvas is already a client component.
