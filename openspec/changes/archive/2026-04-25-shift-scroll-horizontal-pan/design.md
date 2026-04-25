## Context

The diagram canvas wraps the rendered Mermaid SVG in a `react-zoom-pan-pinch` `TransformWrapper` (`components/diagram-viewport.tsx`). Today, mouse-wheel events go straight to the library's wheel handler, which always interprets them as zoom (cursor-anchored, no modifier required — see the `add-diagram-pan-zoom` capability).

Users with a regular mouse currently have no fast way to scroll a wide diagram horizontally. They can:
- Click-and-drag (slow, requires re-grabbing for long traversals).
- Use the on-canvas fit-to-screen button (loses their zoom level).
- Use arrow keys, but only after focusing the canvas.

The convention across modern canvas tools (Figma, Miro, Excalidraw, mermaid.live, browsers, VS Code) is **Shift + wheel = horizontal scroll**. Adopting it costs almost no implementation but materially improves wide-diagram navigation for mouse users.

## Goals / Non-Goals

**Goals:**
- Shift + mouse-wheel over the canvas pans horizontally, in pixel units that feel comparable to native browser scrolling.
- The unmodified-wheel zoom contract is preserved exactly.
- Page scroll outside the canvas is suppressed while Shift+wheel is consumed inside it.
- Pan distance per detent matches the existing arrow-key pan step (`ARROW_PAN_PX = 40`) so the two input methods feel coherent.

**Non-Goals:**
- Vertical pan via the wheel without a modifier (would conflict with cursor-anchored zoom — out of scope).
- Configurable pan-step (single hard-coded value, matches arrow-key pan).
- Different behavior for horizontal-wheel input (`deltaX`) — handled by the library / OS as it is today.
- Touch/pen Shift-equivalents (keyboard modifier is mouse-only by definition).
- Persisting the resulting pan position across reloads.

## Decisions

### Decision 1: Intercept wheel in capture phase on the viewport wrapper, not inside `TransformWrapper`

The library's `wheel` handler runs on the inner `TransformComponent` and always treats wheel as zoom. Two ways to override:

a. **Disable the library's wheel and re-implement everything ourselves.** Rejected — we'd lose the carefully tuned cursor-anchored zoom we just built and would need to reimplement clamping, animation, and pinch-zoom interactions.

b. **Add our own wheel listener on the outer `<div>` in `diagram-viewport.tsx`, in the capture phase, and `preventDefault()` + `stopPropagation()` only when `event.shiftKey` is true.** Selected. The library never sees those events; for unmodified wheel events we do nothing and the library's existing handler runs as before.

Implementation note: the listener must be attached via `useEffect` with `addEventListener("wheel", handler, { passive: false, capture: true })` so `preventDefault()` is honored. JSX's `onWheel` attribute is registered as passive in React 17+ when `eventListenerOptions` cannot be set, so it cannot reliably suppress the page scroll.

### Decision 2: Pan via `setTransform`, matching the arrow-key path

The arrow-key handler already uses `ref.setTransform(positionX + dx, positionY + dy, scale, 0)` with `dx = ±ARROW_PAN_PX`. The Shift+wheel handler will use the same pattern, with `dx` derived from `event.deltaY`:

```
const dx = -Math.sign(event.deltaY) * ARROW_PAN_PX;
ref.setTransform(positionX + dx, positionY, scale, 0);
```

Rationale:
- Reusing `setTransform` inherits the library's clamping/bounds semantics for free.
- Animation duration `0` matches arrow keys — feels snappy and avoids stacking animations on rapid wheel events.
- Using `Math.sign(deltaY)` (not `deltaY` itself) normalizes across mouse wheels (large discrete detents) and trackpads (many small deltas). Trackpad horizontal swipe is already handled by the library, so this path is the mouse-wheel path; `sign` is the right unit.

Considered: scaling the pan by `deltaY / 100` for variable-speed scrolling. Rejected — gives inconsistent feel across mice and conflicts with the "matches arrow-key step" goal.

### Decision 3: Direction = wheel-up pans left (content moves right)

Matches every other canvas tool: scrolling the wheel "up" moves the view up/left. Concretely: `deltaY < 0` (wheel up) → `dx > 0` (positive `positionX` shifts content to the right, i.e. the viewport sees the left side of the content).

This is the `-Math.sign(deltaY)` in Decision 2.

### Decision 4: Do not require canvas focus

The existing wheel-zoom works without focus (it's a pure pointer-over interaction). Shift+wheel must match — requiring focus would surprise users. Arrow-key pan requires focus only because keyboard events naturally route through the focused element.

### Decision 5: No new dependency, no API surface changes

`react-zoom-pan-pinch` already exposes everything we need on `transformRef.current` (`state.positionX`, `state.positionY`, `state.scale`, `setTransform`). No library upgrade, no new package.

## Risks / Trade-offs

- **[Risk]** A user agent or OS extension already maps Shift+wheel to a custom action (rare but possible — e.g. some browser extensions remap Shift+wheel to back/forward navigation). → **Mitigation**: by intercepting in capture phase with `preventDefault()`, we win over the page-level handler. Browser-native Shift+wheel = horizontal scroll *of the page* is exactly what we're replacing in-canvas, so this is the desired outcome.

- **[Risk]** A user relies on Shift+wheel as a way to *page-scroll horizontally* through the surrounding app. → **Mitigation**: the rest of the app has no horizontal overflow worth scrolling. The canvas is full-width inside its panel; intercepting Shift+wheel only when the cursor is inside the canvas leaves the rest of the page unaffected.

- **[Risk]** Rapid Shift+wheel spinning produces jittery/over-shooting pans. → **Mitigation**: animation duration is `0` (snap), so each detent commits before the next is processed. Pan step is fixed at 40px so total throw is predictable.

- **[Trade-off]** Vertical pan still requires drag or arrow keys — wheel without a modifier remains zoom. This is intentional (cursor-anchored zoom is the headline interaction) but means a one-handed wheel-only vertical traversal isn't possible. Accepted; the click-and-drag path covers it.

- **[Risk]** Shift held during a pinch-zoom gesture on a trackpad could mis-route. → **Mitigation**: `WheelEvent.shiftKey` is only true when the OS-level Shift modifier is held. Trackpad pinch synthesizes wheel events on macOS but does not set `shiftKey` unless the user is literally holding Shift, which is not part of the pinch gesture. No behavior change for trackpad pinch.

## Migration Plan

This is an additive change — the existing wheel-zoom path is unchanged, and no user is depending on Shift+wheel doing nothing today. Ship behind no flag; deploy with the standard frontend release. No data migration. Rollback is a one-file revert of `components/diagram-viewport.tsx`.
