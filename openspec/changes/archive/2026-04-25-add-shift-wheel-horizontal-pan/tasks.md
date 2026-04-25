## 1. Implementation

- [x] 1.1 In `components/diagram-viewport.tsx`, replace the `dx = -Math.sign(e.deltaY) * ARROW_PAN_PX` computation in the shift-branch of `handleWheel` with `const raw = e.deltaX !== 0 ? e.deltaX : e.deltaY; const dx = -raw;` so the pan distance reflects the wheel velocity and works with the OS-swapped axis on macOS.
- [x] 1.2 Confirm the listener stays registered with `{ passive: false, capture: true }` and that `e.preventDefault(); e.stopPropagation();` still runs on the shift branch (these are required to suppress the page scroll and the underlying RZPP zoom — no change in behavior, just verify after the edit).
- [x] 1.3 Leave the `ARROW_PAN_PX` constant alone — it remains in use for the arrow-key pan branch in `handleKeyDown`.

## 2. Manual verification

- [ ] 2.1 Run `npm run dev` and load a diagram wider than the canvas (any flowchart with a long left-to-right chain). Hold Shift and scroll the mouse wheel — content off the right edge should slide into view, with no zoom change and no page scroll.
- [ ] 2.2 On macOS, repeat the test on both a trackpad (two-finger horizontal scroll while holding Shift) and a Magic Mouse if available — both should pan horizontally. On Windows/Linux, repeat with a regular wheel mouse.
- [ ] 2.3 Verify the unmodified gestures still behave correctly: wheel without Shift still zooms anchored on the cursor; click-and-drag still pans; arrow keys still pan in 40 px steps; `+`/`-`/`0` still zoom and reset.
- [ ] 2.4 Verify the surrounding page does not scroll while shift+wheeling, including when the diagram is already at the edge of its bounds.

## 3. Spec sync

- [x] 3.1 Run `openspec validate add-shift-wheel-horizontal-pan` and confirm it passes.
- [x] 3.2 After implementation lands and is verified, run `openspec archive add-shift-wheel-horizontal-pan` to merge the spec delta into `openspec/specs/diagram-viewport-controls/spec.md`.
