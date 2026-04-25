## Why

The diagram canvas currently renders the Mermaid SVG inside a simple `overflow-auto` container — it scales the SVG down to fit the viewport but offers no way to inspect a complex diagram up close, drag it around, or quickly return to a fitted view. Once a graph has more than a handful of nodes the labels become unreadable and the user has no recourse beyond zooming the entire browser window. We need viewport controls modeled on **mermaid.live** (zoom in / zoom out / reset, with mouse-wheel zoom and click-and-drag panning) so users can navigate diagrams naturally as their voice-driven sessions grow them.

## What Changes

- Add a viewport layer around the rendered Mermaid SVG that supports:
  - Zooming via the mouse wheel — **no Ctrl/Cmd modifier required** — anchored on the cursor.
  - Pinch-to-zoom on trackpads and touch surfaces, anchored on the gesture centroid.
  - Panning via click-and-drag anywhere on the canvas (the diagram itself is grabbable; this is the primary mouse interaction).
  - A small **mermaid.live-style** on-canvas button cluster: zoom-in, zoom-out, and reset/fit-to-screen, stacked as compact icon buttons in a corner of the canvas.
  - Keyboard shortcuts: `+` / `-` to zoom, `0` to reset, arrow keys to pan when the canvas has focus.
- Auto-fit the diagram to the viewport on initial render and whenever the diagram source changes; preserve the user's manual zoom/pan only while the same diagram is on screen.
- Keep the existing loading spinner, parse-error banner, and empty state — they layer on top of the viewport without being affected by zoom/pan.

## Capabilities

### New Capabilities
- `diagram-viewport-controls`: User-facing pan, zoom, fit-to-screen, on-canvas toolbar, and keyboard shortcuts for the Mermaid diagram canvas. Owns the transform/gesture state and the auto-fit behavior on diagram changes.

### Modified Capabilities
<!-- None — `mermaid-canvas` only owns the parse → render pipeline; viewport interaction is a new, layered concern that does not change any existing requirement. -->

## Impact

- **Code**: `components/diagram-canvas.tsx` is restructured so the rendered SVG is nested inside a transform-controlled viewport wrapper. A new `components/diagram-viewport.tsx` (or equivalent hook/module) owns the gesture and transform logic. Tailwind utility classes already in use are sufficient; no global CSS changes expected.
- **Dependencies**: Prefer a small, well-tested pan/zoom primitive (e.g. `panzoom` or `react-zoom-pan-pinch`) over hand-rolling wheel/touch gesture handling. Final pick is settled in `design.md`. Either way, one new runtime dependency is added.
- **Realtime/voice flow**: Untouched. Pan/zoom is a pure presentation-layer concern; tool calls (`set_diagram`, `patch_diagram`) and the parse/render gate continue to drive content. The model is not informed of zoom state.
- **Persistence**: Zoom/pan state is **not** persisted — it resets on reload. Persistence is an explicit non-goal; the diagram source itself is what matters across sessions.
- **Out of scope (non-goals)**: minimap, displaying the current zoom percent in the UI, exporting at a chosen zoom level, persisting viewport state in `localStorage`, programmatic camera control via tool calls, mobile-specific gesture overlays beyond what the chosen library handles by default.
- **Browser support**: Same matrix as the rest of the app — Chromium and Safari primary, Firefox secondary. Pinch-zoom must work on Mac trackpads; touch devices are best-effort.
