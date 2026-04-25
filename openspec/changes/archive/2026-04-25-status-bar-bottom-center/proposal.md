## Why

The status pill, start/stop button, and mic toggle currently sit at the top-right corner of the viewport. Once the right-side code panel is expanded (its default state), those controls visually collide with the panel's "Copy code" button — both occupy roughly the same screen region, the panel's content gets clipped, and the controls feel like they belong to the panel chrome rather than to the voice session. The user wants the controls grouped together and parked at the bottom-center of the diagram canvas, where they read as session controls for the diagram and stay clear of the panel.

## What Changes

- Move the `<StatusBar>` cluster (status pill + start/stop button + mic toggle) from the top-right of the viewport to bottom-center of the diagram canvas area.
- Anchor the cluster relative to the canvas container (the absolutely-positioned wrapper that already resizes when the panel collapses), so the cluster stays centered over the visible diagram both with the panel expanded and collapsed.
- Keep the existing internal layout of the cluster (pill on the left, play/stop, mic toggle) and the existing five status states — only the position changes.

## Capabilities

### New Capabilities
<!-- None — this is a placement-only change. -->

### Modified Capabilities
- `voice-session`: adds a positioning requirement for the connection status indicator and start/stop controls (must render at the bottom-center of the diagram canvas, not the top-right of the viewport).

## Impact

- **Code touched**: `components/app.tsx` (where `<StatusBar>` is mounted — change wrapper positioning) and possibly `components/status-bar.tsx` (relax/remove its own absolute positioning so the parent decides placement).
- **Layout interactions**: the cluster must stay above the canvas content (z-index), follow the canvas wrapper's right-edge (which shifts between `right-10` and `right-96` based on panel state), and have safe-area padding from the bottom so it doesn't sit flush against the canvas edge.
- **No spec/behavior changes** to the status states, lifecycle, or read-only-when-disconnected behavior — those remain as defined by the existing `voice-session` capability.
- **No new dependencies.**
