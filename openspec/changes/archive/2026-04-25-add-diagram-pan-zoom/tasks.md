## 1. Setup

- [x] 1.1 Add `react-zoom-pan-pinch` to `dependencies` in `package.json` and run `npm install` to refresh the lockfile
- [x] 1.2 Confirm the package is client-side only (it is) — no Next.js server/edge concerns to handle
- [x] 1.3 Note the chosen library version in `design.md` Decisions section if it differs from the assumed 3.x line

## 2. Viewport component

- [x] 2.1 Create `components/diagram-viewport.tsx` that wraps children in `<TransformWrapper>` + `<TransformComponent>` from `react-zoom-pan-pinch`
- [x] 2.2 Configure `minScale: 0.2`, `maxScale: 8`, wheel `step: 0.2`, **leave wheel zoom unconditional** (no `activationKeys` — plain wheel zooms, matching mermaid.live), enable `panning.disabled: false` and `panning.velocityDisabled: false` so click-and-drag works on the diagram itself, and disable double-click-to-zoom (default behavior is too aggressive)
- [x] 2.3 Expose an imperative ref so the parent can call `zoomIn`, `zoomOut`, `centerView`, and read the current scale
- [x] 2.4 Make the wrapper element `tabIndex={0}` and add a subtle focus ring (Tailwind `focus-visible:ring-1 focus-visible:ring-slate-500`) for keyboard accessibility
- [x] 2.5 Add a `useEffect` that listens for `+`/`=`, `-`, `0`, and arrow keys when the wrapper has focus and dispatches the matching imperative action (arrow keys translate by ~40px / current scale)

## 3. Auto-fit on diagram-source change

- [x] 3.1 Track the last *committed* Mermaid source (the one that produced the currently rendered SVG) in a ref inside `DiagramCanvas`
- [x] 3.2 In a `useEffect` that runs after the SVG is committed to the DOM, compare the new source string to the previous one; if different, schedule `centerView()` (or `resetTransform()` followed by `centerView()`) on the next animation frame
- [x] 3.3 Verify the auto-fit happens *after* `dangerouslySetInnerHTML` has flushed (use `requestAnimationFrame` or a layout effect) so the library sees the real SVG bounds

## 4. Button cluster (mermaid.live-style)

- [x] 4.1 Create `components/viewport-controls.tsx`: a vertical stack of three compact icon buttons (~32px square each, ~4px gap) positioned absolutely at `bottom-4 right-4`, using a slate background with subtle border/shadow consistent with the rest of the UI (no backdrop blur — keep it crisp like mermaid.live)
- [x] 4.2 Cluster contents in order: zoom-in (lucide `Plus`), zoom-out (lucide `Minus`), fit-to-screen / reset (lucide `Maximize2` or `Frame`). Each button has an `aria-label` and a tooltip via `title`
- [x] 4.3 Wire each button to the imperative ref from `DiagramViewport`
- [x] 4.4 Hide the cluster when the empty-state hint is visible (no diagram to interact with)

## 5. Wire `DiagramCanvas` to the new viewport

- [x] 5.1 In `components/diagram-canvas.tsx`, restructure the render tree so the SVG is wrapped by `DiagramViewport`; keep the spinner overlay, error banner, and empty-state hint as siblings outside the transform component (so they are NOT scaled or panned)
- [x] 5.2 Remove the now-redundant `[&_svg]:max-w-full [&_svg]:h-auto` constraint from the SVG container — the viewport component handles sizing — but keep `display: block` on the inner SVG so bounds calculation works
- [x] 5.3 Verify the empty state still renders centered with no toolbar (per spec scenario "Empty state ignores viewport")

## 6. Manual smoke verification

- [x] 6.1 Start the dev server (`npm run dev`) and exercise: render a small flowchart, zoom with the plain mouse wheel (no modifier), confirm cursor anchoring and that the page itself does not scroll
- [x] 6.2 Trackpad pinch test on macOS Safari and Chrome — confirm pinch zooms and is anchored on the centroid
- [x] 6.3 Drag-pan test by clicking directly on the diagram (not just empty space) and dragging; confirm cursor switches to grab/grabbing and the diagram stays at least partially in view at extreme drags
- [x] 6.4 Keyboard shortcuts: focus the canvas, press `+`, `-`, `0`, and arrow keys; confirm each behaves per spec
- [x] 6.5 Trigger a slow render (large diagram) — confirm the spinner appears centered, not scaled by the current zoom
- [x] 6.6 Trigger an invalid-syntax case via the model — confirm the amber error banner is still pinned bottom-center, not translated
- [x] 6.7 Have the model issue `set_diagram` with a brand-new graph while the user is zoomed in — confirm the new diagram auto-fits

## 7. Lint, types, and cleanup

- [x] 7.1 Run `npm run lint` and fix any new warnings introduced by the new components
- [x] 7.2 Confirm TypeScript builds clean (`npm run build` or IDE check) — the library ships its own types
- [x] 7.3 Remove any dead imports or commented-out code from `components/diagram-canvas.tsx`
