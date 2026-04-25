## 1. Reposition the status bar

- [x] 1.1 In `components/status-bar.tsx`, drop `absolute top-4 right-4 z-30` from the root `<div>` and leave it as a positioning-agnostic flex cluster (keep `flex items-center gap-2` and inner content unchanged)
- [x] 1.2 In `components/app.tsx`, move the `<StatusBar>` mount inside the existing canvas wrapper div (the one with `absolute top-0 left-0 h-full transition-[right] right-{10|96}`)
- [x] 1.3 Wrap the `<StatusBar>` mount with positioning classes that anchor it to the bottom-center of the canvas wrapper: `absolute bottom-4 left-1/2 -translate-x-1/2 z-30`
- [x] 1.4 Verify `npx tsc --noEmit` and `npm run lint` are clean
- [ ] 1.5 Verify in the browser using `npm run dev`: with the panel expanded, the cluster sits at the bottom-center of the visible canvas region and does not horizontally overlap the panel's "Copy code" button; collapse the panel and confirm the cluster re-centers over the now-wider canvas region; reload while disconnected and confirm the cluster is visible at the bottom of the canvas with the disconnected pill and an enabled start button
