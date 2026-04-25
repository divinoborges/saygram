## Context

`components/diagram-canvas.tsx` currently renders the Mermaid SVG with `dangerouslySetInnerHTML` inside a single `<div>` that uses `overflow-auto` and `[&_svg]:max-w-full [&_svg]:h-auto`. This shrinks every diagram to fit width — readable enough for trivial flowcharts but useless for the 30+ node graphs the voice flow can produce. There is no way to zoom in on a specific cluster, drag the diagram around, or reset the view.

The canvas already has three layered concerns:
1. The rendered SVG (`dangerouslySetInnerHTML`).
2. A delayed loading spinner overlay.
3. An error banner pinned to the bottom.

Pan/zoom is a fourth, presentation-only concern. It must not interfere with the parse-before-render gate (`mermaid-canvas` capability) or the tool-call dispatch loop (`diagram-tools`). The model is unaware of viewport state by design.

The app is Next.js 15 + React 19 + Tailwind, no global state library beyond a small in-house `diagramStore`. The canvas component runs entirely on the client (`"use client"`).

## Goals / Non-Goals

**Goals:**
- mermaid.live-style interactions: plain mouse-wheel zoom (no modifier), drag-to-pan anywhere on the canvas, a compact icon-button cluster (zoom-in / zoom-out / reset) on the canvas, fit-to-screen on diagram change.
- Cursor-anchored zoom — zooming feels natural, the point under the pointer stays under the pointer.
- Keep the loading spinner and error banner correctly positioned and unaffected by the user's zoom/pan transform.
- Auto-fit when the diagram source changes, so a brand-new diagram from the model lands centered and readable.
- Clean separation: a single `DiagramViewport` component (or hook) owns transform state and gestures; `DiagramCanvas` keeps owning rendering and Mermaid lifecycle.

**Non-Goals:**
- Persisting zoom/pan state across reloads.
- Smart zoom that snaps to clusters or focuses on the most recently changed node.
- Programmatic camera control via tool calls (the model does not get a `zoom_to` tool).
- Mobile-first gesture polish (pinch-zoom should work on Mac trackpads; phones/tablets are best-effort).
- Touch-device-only UI affordances (e.g. minimap).

## Decisions

### Decision 1: Use a small library rather than hand-rolling gestures

**Choice**: Add `react-zoom-pan-pinch` (v4.0.3, ~25kB gz, MIT, ~3k stars).

**Why**: Cursor-anchored zoom, plain wheel-to-zoom without page-scroll conflicts (the canvas pane has no scrollable content of its own once we own the viewport), pinch on trackpads, and gesture composition are all subtly tricky to get right cross-browser. A vetted library handles Safari pinch quirks, momentum, and bounding-box math out of the box. The library exposes an imperative ref (`zoomIn`, `zoomOut`, `resetTransform`, `centerView`) that we drive from the on-canvas button cluster and from the auto-fit effect.

**Alternatives considered**:
- **`panzoom`** (anvaka/panzoom): smaller, framework-agnostic, but requires manual wiring into React refs and lacks a first-class fit-to-bounds helper. Reasonable second choice.
- **Hand-rolled with `pointer` events + CSS transform**: clean but Safari pinch + cursor-anchored math is roughly a day of work and tests we don't currently have any harness for.
- **`d3-zoom`**: capable, but pulls in d3 and is overkill for this UI.

### Decision 2: Wrap the rendered SVG; do not transform the SVG itself

**Choice**: Keep `dangerouslySetInnerHTML={{ __html: svg }}` exactly as today, but render it inside the library's `<TransformComponent>`. The library applies a CSS `transform` to a wrapper, never touching the SVG markup.

**Why**: The Mermaid SVG is replaced wholesale on every successful render. If we mutated SVG attributes (e.g. `viewBox`, `transform`) we'd fight the parse/render gate and risk losing user state mid-edit. CSS-transforming a wrapper is a pure presentational layer; it survives SVG replacement (the transform stays on the wrapper) and never blocks Mermaid.

### Decision 3: Auto-fit triggers on diagram-source change, not on every re-render

**Choice**: Track the *committed* Mermaid source. When it changes from one valid value to another, call `centerView()` / `resetTransform()` on the next animation frame (after the new SVG is in the DOM). When the SVG is replaced for the *same* source (e.g. a re-render due to debounce), do nothing — the user's zoom/pan is preserved.

**Why**: Users expect "I asked for a new diagram → I see all of it." They also expect "I zoomed in to read a label, the model patched a different node → my zoom stayed." The trigger is the source string, not the React render.

### Decision 4: mermaid.live-style button cluster, bottom-right

**Choice**: A small vertical stack of three icon buttons — zoom-in (top), zoom-out (middle), reset/fit-to-screen (bottom) — anchored at `bottom-4 right-4`, modeled on mermaid.live. Each button is a compact square (~32px) with a subtle background, rounded corners, and a hover state. Positioned in the layered overlay region of `DiagramCanvas`, outside the transform wrapper, so it never moves or scales. No zoom-percent label (mermaid.live doesn't show one and the user did not ask for one).

**Why**: Matches the reference (mermaid.live) and the user's explicit ask. Bottom-right keeps the cluster clear of the error banner (bottom-center) and the code side-panel toggle. Keyboard shortcuts (`+`, `-`, `0`) are wired through the same imperative ref so the cluster and the keyboard agree on behavior.

### Decision 5: Zoom range and step

**Choice**: `minScale: 0.2`, `maxScale: 8`, wheel step `0.2` per detent, button step multiplies by `1.25` / divides by `1.25`. Auto-fit clamps the result into this range.

**Why**: 0.2 lets very large flowcharts fit when the canvas is narrow; 8x is enough to read tight labels without going so far that the SVG aliases badly. `1.25` per click is the same ratio Figma and VS Code's diagram preview use — feels right.

## Risks / Trade-offs

- **[Risk]** New runtime dependency (`react-zoom-pan-pinch`) → **Mitigation**: small footprint, MIT, lock to a known-good minor version. If it proves flaky we fall back to `panzoom` without changing the spec.
- **[Risk]** Plain mouse-wheel zoom can feel surprising if the user expected the page to scroll → **Mitigation**: the diagram pane is its own pane (no vertical document scroll behind it) and mermaid.live behaves the same way, so this matches user expectation. We `preventDefault` on wheel events inside the canvas to keep the page itself stable.
- **[Risk]** Auto-fit on every source change can be jarring if the user was mid-inspection and the model patches a single node → **Mitigation**: triggering on source-string change, not on every React re-render; if the user later complains, the next iteration can debounce auto-fit or only fit on substantial bounding-box deltas. Out of scope for this change.
- **[Risk]** The Mermaid SVG sometimes ships intrinsic dimensions that conflict with the transform wrapper's sizing → **Mitigation**: continue applying `[&_svg]:max-w-full [&_svg]:h-auto` only for the empty/fallback path, but inside the transform wrapper give the SVG `display: block` with no max constraints so the library's bounds calculation sees the natural size.
- **[Trade-off]** Keyboard arrow-key panning requires the canvas to be focusable (`tabIndex={0}`). This adds a focus ring to manage. We accept the small visual cost in exchange for accessibility parity with the mouse path.

## Migration Plan

This is purely additive UI — no data migration, no API change. Rollout:
1. Land the dependency + new component behind no flag (low risk; presentation only).
2. Manual smoke test: render a small flowchart, a large sequence diagram, an empty state, an invalid syntax case (banner still pinned), and a slow render (spinner still centered).
3. No rollback plan needed beyond reverting the commit; persistence and tool contracts are untouched.

## Open Questions

- Should the toolbar auto-hide after a few seconds of inactivity (like macOS Preview) or stay visible? Default to **stay visible** for discoverability; revisit if users find it noisy.
- Should arrow-key pan distance scale with the current zoom level (so it feels like a constant on-screen distance)? Yes by default — implementation detail, not a spec concern.
