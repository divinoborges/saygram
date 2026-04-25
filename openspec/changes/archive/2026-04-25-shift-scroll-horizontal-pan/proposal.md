## Why

The diagram canvas already supports cursor-anchored zoom via the mouse wheel, but the wheel has only one job — zoom. Users who want to slide a wide diagram sideways must either click-and-drag or rely on a trackpad two-finger swipe. On a regular mouse, horizontal exploration of a wide flowchart is awkward. Adopting the well-established **Shift + scroll → horizontal pan** convention (used in Figma, Miro, Excalidraw, mermaid.live, VS Code, browsers) gives mouse users a fast, one-handed way to traverse wide diagrams without giving up the cursor-anchored zoom behavior.

## What Changes

- Holding **Shift** while scrolling the mouse wheel over the diagram canvas SHALL pan the diagram horizontally instead of zooming.
  - Wheel up (negative `deltaY`) pans the view to the **left** (content moves right under the cursor).
  - Wheel down (positive `deltaY`) pans the view to the **right** (content moves left under the cursor).
- The unmodified wheel behavior (cursor-anchored zoom) is unchanged.
- Pan distance per detent SHALL match the existing arrow-key pan step so the two input methods feel consistent.
- The page outside the canvas MUST NOT scroll while Shift+wheel is consumed by the canvas.
- Keyboard focus is **not required** — Shift+wheel works whenever the cursor is over the canvas, matching the existing wheel-zoom behavior.

## Capabilities

### New Capabilities
<!-- None — this extends an existing capability. -->

### Modified Capabilities
- `diagram-viewport-controls`: Adds a new requirement for **Shift + mouse-wheel horizontal panning**. Existing zoom-on-wheel, pinch, drag, button-cluster, keyboard, and auto-fit requirements are unchanged.

## Impact

- **Code**: `components/diagram-viewport.tsx` is the single touch point. The current implementation hands wheel events directly to `react-zoom-pan-pinch`'s `TransformWrapper`. We will attach a wheel listener (capture phase, non-passive) on the wrapper that, when `event.shiftKey` is true, calls `setTransform` to translate horizontally and calls `preventDefault()` to suppress both the library's default zoom and the page scroll. No changes to `diagram-canvas.tsx`, `viewport-controls.tsx`, or any other component.
- **Dependencies**: None added. `react-zoom-pan-pinch` exposes `setTransform` on its ref, which is what we already use for arrow-key pan and fit-to-view.
- **Realtime/voice flow**: Untouched. Pan is purely presentational — no tool call, no state shared with the model.
- **Persistence**: Pan/zoom state remains non-persisted, consistent with the existing capability.
- **Browser support**: Chromium, Safari (incl. Mac), and Firefox all expose `WheelEvent.shiftKey` and `deltaY` consistently. macOS users who already get horizontal scroll from a trackpad two-finger swipe are unaffected — that path does not set `shiftKey` and continues to be handled by the library as a pan, not a zoom.
- **Out of scope (non-goals)**: Vertical pan via wheel-only (would conflict with the existing wheel-zoom contract), Shift+drag behavior changes, Ctrl/Alt modifier combinations, configurable pan-step settings.
- **Accessibility**: This is a mouse-only enhancement. Keyboard users already have arrow-key panning; nothing changes for them.