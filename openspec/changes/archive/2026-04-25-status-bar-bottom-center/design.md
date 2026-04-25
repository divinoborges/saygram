## Context

The current `<StatusBar>` (`components/status-bar.tsx`) sets its own root container to `absolute top-4 right-4 z-30`, and is mounted directly under the App's root div. The diagram canvas wrapper is a sibling absolutely-positioned div with `top-0 left-0 h-full right-{10|96}` (where `right-N` shifts based on panel state). The right-side code panel renders the "Copy code" button in its top header strip — exactly where the status bar currently lives — producing the overlap visible in the user's screenshot.

## Goals / Non-Goals

**Goals:**
- The cluster (status pill, start/stop, mic toggle) renders at the bottom-center of the diagram canvas region, not the viewport.
- The cluster tracks the canvas region as the side panel collapses/expands, so it always centers over what the user can actually see.
- No new components, no behavior change, no new dependencies.

**Non-Goals:**
- Restyling the cluster (sizes, colors, icons stay the same).
- Changing what the status pill displays or how lifecycle events drive it.
- Anything about the diagram rendering itself.

## Decisions

### D1. Position the cluster relative to the canvas wrapper, not the viewport

Move the `<StatusBar>` mount inside the existing canvas wrapper div in `app.tsx` (the one with `absolute top-0 left-0 h-full right-{10|96}`). Inside that wrapper, position the cluster with `absolute bottom-4 left-1/2 -translate-x-1/2`. Because the wrapper already follows the panel state, the cluster stays centered over the visible diagram in both panel states.

Rationale: this is the cheapest correct fix. It reuses the wrapper that already handles "the canvas area" as a concept. The alternative (positioning relative to the viewport with a CSS calc that subtracts panel width) would re-implement that logic in two places and drift if the panel width ever changes.

### D2. Strip the absolute positioning from `<StatusBar>` itself

Remove the `absolute top-4 right-4 z-30` from `<StatusBar>`'s root div, leaving only the inline-flex content layout. The parent (the canvas wrapper) decides where the cluster sits. The z-index is reapplied at the new mount point so the cluster stays above the SVG.

Rationale: keeping positioning in the component would force any future relocation to touch both files. Component is now placement-agnostic and reusable.

## Risks / Trade-offs

- **Cluster visually overlaps a tall diagram's bottom edge** → Mitigation: the cluster sits inside the canvas wrapper with `bottom-4` and the wrapper is the scroll container's parent; the SVG already has `max-h-full overflow-auto`, so on tall diagrams the user can scroll. Bottom-4 leaves visual breathing room. If overlap proves annoying we can later add a translucent backdrop blur to the cluster, but it's out of scope here.
- **Reading order / a11y** → No change. Buttons keep their existing `aria-label`s. Status pill has no role change.
- **Mobile layout** → Out of scope per the original PRD non-goals (desktop-first). The new placement is reasonable on mobile too (bottom-center is a familiar "session controls" location), but verifying it is not in scope.
