## Why

Wide diagrams (long left-to-right flowcharts, sequence diagrams with many participants) regularly extend past the right edge of the canvas. The current viewport supports vertical wheel zoom, click-and-drag pan, and arrow-key pan, but moving horizontally with a mouse alone is awkward — users have to drag, which is slow when they only want to scan a few hundred pixels sideways. The viewport already attempts to handle `Shift + wheel` for horizontal panning, but the current implementation translates by a fixed 40 px per wheel detent regardless of scroll velocity, ignores the `deltaX` axis that macOS sends natively when shift is held over a trackpad, and is undocumented in the spec — it is effectively an undiscoverable, low-fidelity feature.

## What Changes

- Promote `Shift + mouse-wheel` to a first-class navigation gesture: when the user holds Shift and scrolls the wheel over the diagram canvas, the viewport translates **horizontally** instead of zooming.
- Use the wheel event's actual delta (proportional to scroll velocity) rather than a fixed step, so a fast flick of the wheel pans further than a single notch.
- Honor whichever axis the platform reports under shift: prefer `deltaX` when the OS provides it (macOS trackpads, some Windows mice), otherwise translate `deltaY` into horizontal motion.
- Suppress the underlying wheel-to-zoom behavior while shift is held, so the diagram does not zoom and pan simultaneously.
- Document the gesture in the on-canvas controls' tooltip/help affordance so users can discover it.

## Capabilities

### New Capabilities
<!-- None — this extends an existing capability. -->

### Modified Capabilities
- `diagram-viewport-controls`: Adds a new requirement for `Shift + wheel` horizontal panning, alongside the existing wheel-zoom, pinch-zoom, click-drag, and keyboard requirements.

## Impact

- **Code**: Updates `components/diagram-viewport.tsx` — the existing capture-phase wheel handler is rewritten to use the real wheel delta and the `deltaX`/`deltaY` axis selection logic. Touches no other component; the `react-zoom-pan-pinch` `TransformWrapper` configuration is unchanged.
- **Dependencies**: None added or removed.
- **Realtime/voice flow**: Untouched. Pan state remains client-only and is not surfaced to the model.
- **Persistence**: Unchanged — viewport state is not persisted, consistent with the parent capability.
- **Out of scope (non-goals)**: `Shift + arrow-key` horizontal pan acceleration, momentum/inertia after the wheel stops, configurable pan-speed multiplier, separate gestures for vertical-only pan with another modifier, touch-device alternatives (touch already has two-finger pan via the underlying library).
- **Browser support**: Same matrix as the parent capability (Chromium, Safari, Firefox). No browser-specific APIs introduced.
