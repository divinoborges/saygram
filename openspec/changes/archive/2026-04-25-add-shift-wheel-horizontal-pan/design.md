## Context

`components/diagram-viewport.tsx` wraps the rendered Mermaid SVG with `react-zoom-pan-pinch` (RZPP). RZPP owns wheel-to-zoom by default; we layer our own capture-phase `wheel` listener on the wrapping `<div>` so that, when shift is held, we intercept the event before RZPP and translate the camera horizontally instead of zooming.

The current handler (in place since the parent `add-diagram-pan-zoom` change) calls `ref.setTransform(positionX + dx, positionY, scale, 0)` with `dx = -Math.sign(e.deltaY) * 40`. That works mechanically but has three concrete problems:

1. **No velocity** — a fast wheel flick pans the same distance as a single notch.
2. **Wrong axis on macOS** — when shift is held over a Magic Mouse or trackpad, macOS swaps the axes itself and sends `deltaX` populated, `deltaY` ≈ 0. We currently ignore `deltaX` entirely, so on Mac the diagram doesn't pan at all under the gesture the OS already prepared for us.
3. **Undocumented** — there's no spec entry, so the behavior can be regressed without anything failing.

This change is small and self-contained: one component, one listener, no new dependencies.

## Goals / Non-Goals

**Goals:**
- `Shift + wheel` always pans the camera horizontally over the diagram canvas, on every supported browser/OS combo.
- Pan distance is proportional to the wheel delta (velocity-aware), not a fixed step.
- Vertical wheel without shift still zooms (current behavior preserved).
- The page behind the canvas does not scroll.
- The gesture is documented in the spec so future refactors can verify it.

**Non-Goals:**
- Momentum / inertia after shift is released.
- A user-configurable pan-speed multiplier.
- `Shift + arrow-key` acceleration (arrow keys keep their existing 40 px step).
- Any change to the zoom, pinch, drag, or keyboard requirements.
- Changing how RZPP itself is configured (`wheel.step`, `panning`, `pinch` all stay).

## Decisions

### Decision: Use the actual wheel delta, not `Math.sign(...) * fixed-step`

We compute `dx` from the event's reported delta directly. Concretely: `dx = -(e.deltaX !== 0 ? e.deltaX : e.deltaY)`. Negation matches the current direction convention (scrolling the wheel "down" / forward moves the diagram left, exposing content on the right).

**Why over the alternative**: Keeping `Math.sign` produces a jarring stair-step gait on trackpads and ignores how hard the user spun the wheel. Browsers normalize wheel deltas reasonably across input devices; trusting them gives natural feel for free.

**Alternatives considered**:
- *Multiply delta by a tunable constant* — rejected as over-engineering for a feature with one knob nobody has asked to tune. The default RZPP pan units are 1 CSS px per delta unit at scale 1, which feels right after a quick check.
- *Cap delta to avoid runaway pans on high-resolution wheels* — rejected; RZPP's `limitToBounds: false` already lets the user recover via fit-to-screen, and clamping introduces another magic number.

### Decision: Prefer `deltaX` when non-zero, else translate `deltaY` into horizontal motion

```
const raw = e.deltaX !== 0 ? e.deltaX : e.deltaY;
const dx = -raw;
```

**Why**: macOS reports shift+wheel by *swapping the axes itself* — `deltaX` arrives populated and `deltaY` is 0. On Windows and Linux, the OS does not swap; only `deltaY` is populated and we have to do the swap. A single conditional covers both cases.

**Alternatives considered**:
- *Always read `deltaY`* — current behavior; broken on macOS.
- *Always read `deltaX`* — broken on Windows.
- *Sum both axes* — would double-count on macOS Magic Mouse if `deltaY` is small-but-nonzero. The "prefer X if present" rule is the conventional resolution.

### Decision: Keep the capture-phase listener with `passive: false`

We continue to register the wheel listener with `{ passive: false, capture: true }` and call `e.preventDefault(); e.stopPropagation()`. The capture phase is required so we run before RZPP's bubble-phase wheel handler (otherwise it zooms first). `passive: false` is required to call `preventDefault`.

**Why over the alternative**: Configuring RZPP via `wheel.disabled` only when shift is held isn't supported by the library (its config is static, not per-event). Owning the gesture from the outside is the cleanest seam.

### Decision: Animation duration stays at 0

We pass `0` as the fourth argument to `setTransform`. Wheel events arrive at 60+ Hz; a non-zero animation duration causes visible queueing/jitter as each event fights the previous tween.

## Risks / Trade-offs

- **[Risk] RZPP's internal smoothing fights our manual `setTransform`** → Mitigation: We've already been calling `setTransform` from this same handler with no observed conflict. If it surfaces, switch to RZPP's `instance.transformState` mutation API or call `ref.setTransform(...)` inside `requestAnimationFrame` to coalesce.
- **[Risk] High-resolution wheel devices generate very large deltas, panning the diagram off-screen instantly** → Mitigation: User can recover via the existing fit-to-screen button or the `0` shortcut. If complaints arrive, add a per-event clamp (`Math.max(-200, Math.min(200, raw))`) — explicitly out of scope for now.
- **[Trade-off] We don't scale `dx` by `1 / scale`** → At high zoom, a wheel notch pans *more* diagram-space than at zoom 1. This matches how arrow-key panning currently works (also in screen pixels, not diagram pixels) and matches user intent ("move the view by this many pixels of my screen"), so we keep the consistent behavior rather than introducing a special case for the wheel.
- **[Trade-off] We don't honor `deltaMode`** (`PIXEL` vs `LINE` vs `PAGE`). All major browsers report `PIXEL` for wheel events on the platforms this app targets; if a user reports stair-step behavior on an unusual device we'll revisit.
