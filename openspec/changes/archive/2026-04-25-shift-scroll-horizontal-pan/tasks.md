## 1. Implement Shift+wheel horizontal pan

- [x] 1.1 In `components/diagram-viewport.tsx`, add a `useRef` for the outer focusable `<div>` so we can attach a native event listener to it.
- [x] 1.2 Add a `useEffect` that attaches a `wheel` listener to that ref via `addEventListener("wheel", handler, { passive: false, capture: true })` and removes it on cleanup.
- [x] 1.3 In the handler, early-return when `event.shiftKey` is false so the existing `react-zoom-pan-pinch` wheel-zoom path is untouched.
- [x] 1.4 When `event.shiftKey` is true: read `state.positionX`, `state.positionY`, `state.scale` from `transformRef.current`, compute `dx = -Math.sign(event.deltaY) * ARROW_PAN_PX`, and call `setTransform(positionX + dx, positionY, scale, 0)`.
- [x] 1.5 In the same Shift branch, call `event.preventDefault()` and `event.stopPropagation()` to suppress both the library's zoom and any page-level scrolling.
- [x] 1.6 Guard against `transformRef.current` being null (mirrors the existing `handleKeyDown` guard).

## 2. Verify behavior in the browser

- [ ] 2.1 Run `npm run dev` and open a diagram wide enough to overflow the canvas (e.g., a horizontal flowchart with ~10 nodes).
- [ ] 2.2 With a regular mouse, confirm Shift+wheel-up pans the view to the left and Shift+wheel-down pans to the right; vertical position is unchanged.
- [ ] 2.3 Confirm the diagram does not zoom while Shift is held.
- [ ] 2.4 Confirm the surrounding page does not scroll while Shift+wheel happens over the canvas.
- [ ] 2.5 Confirm releasing Shift restores cursor-anchored zoom on the very next wheel detent.
- [ ] 2.6 Confirm a single Shift+wheel detent moves the diagram by the same number of pixels as a single ArrowLeft/ArrowRight press.
- [ ] 2.7 On a Mac trackpad, confirm two-finger horizontal swipe (no Shift) still pans via the library's existing path, and pinch-zoom is unaffected.

## 3. Type-check and ship

- [x] 3.1 Run `npm run lint` (or `tsc --noEmit` if lint is not wired) to confirm no TS or lint errors in `diagram-viewport.tsx`.
- [x] 3.2 Self-review the diff: handler is in capture phase, `passive: false`, listener is removed on cleanup, no other files changed.
