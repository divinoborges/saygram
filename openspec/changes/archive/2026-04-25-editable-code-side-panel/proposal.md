## Why

The right-side code panel currently presents the Mermaid source as a read-only `<pre>` block with a single "Copy code" affordance. Users who notice a typo, want to tweak a label, or want to refine the diagram shape have to either (a) ask the voice agent to make the edit — slow and unreliable for trivial changes — or (b) copy the source out, edit it elsewhere, and paste it back into… nothing, since the panel does not accept input. The panel is the natural place to express "I want to change one word" but its read-only contract makes it dead weight for direct manipulation. The diagram store already supports atomic commits with parse validation, so the plumbing for live re-rendering is in place — the only thing missing is an editable surface bound to it.

## What Changes

- **BREAKING (capability-level):** The `code-side-panel` capability stops being read-only. The panel SHALL present the Mermaid source in an editable `<textarea>` (or equivalent) instead of a `<pre>`.
- Edits in the panel SHALL flow into the diagram store on every keystroke (with light debouncing) so the canvas re-renders live as the user types.
- Invalid intermediate states (the user mid-typing a node) MUST NOT throw away the user's text. The panel keeps showing what the user typed; the canvas surfaces a parse-error indicator (reusing the existing `parseError` banner) until the source becomes valid again, at which point the canvas re-renders.
- Edits MUST be persisted to `localStorage` under the same key (`mermaid:last`) the diagram store already uses, so a refresh keeps the user's edits.
- The "Copy code" affordance, the collapse/expand toggle, and the empty-state hint all SHALL continue to work unchanged.
- When a tool call from the voice agent (`set_diagram` / `patch_diagram`) updates the diagram store, the textarea content MUST update to match — the model and the human edit the same source of truth.
- A new keyboard affordance: `Cmd/Ctrl+Z` and `Cmd/Ctrl+Shift+Z` inside the textarea SHALL behave as the browser's native undo/redo for the textarea content. No custom undo stack is introduced; we rely on the native textarea history.
- The panel SHALL render a left-side line-number gutter aligned to the textarea's lines, scrolling vertically in sync via `scrollTop`. Long lines do not soft-wrap (textarea uses `white-space: pre`); the textarea exposes both horizontal and vertical scrollbars so each newline maps 1:1 to a visual row and the gutter stays trustworthy.
- The panel's left edge SHALL be a drag handle: click-hold-drag horizontally resizes the panel width live, clamped to a sensible min/max. The committed width is persisted to `localStorage` under `ui:codePanel:width` and restored on mount; the canvas's right edge tracks the panel width in real time, with the existing right-edge CSS transition suppressed during the drag so resizing feels responsive.

## Capabilities

### New Capabilities
<!-- None — this extends an existing capability. -->

### Modified Capabilities
- `code-side-panel`: The "Panel is read-only" requirement is removed and replaced with an editable-textarea requirement. A new requirement covers two-way sync between the textarea and the diagram store (typed edits push to the store; tool-call updates pull into the textarea). The "Diagram updates flow to panel" requirement is tightened to specify the textarea (not a `<pre>`) as the receiver.

## Impact

- **Code**:
  - `components/code-side-panel.tsx`: replace the `<pre>` with a controlled `<textarea>`; accept an `onChange` prop; add a left gutter `<pre>` that renders 1..N line numbers and syncs `scrollTop` from the textarea's `onScroll`; add a 6 px-wide resize handle on the panel's left edge using pointer-capture; keep the copy button and toggle.
  - `components/app.tsx`: pass an `onChange` handler that calls `diagramStore.commit(newCode)` into `CodeSidePanel`; hydrate `panelWidthState` on mount; replace the static `right-96`/`right-10` Tailwind classes with an inline `style.right` driven by `usePanelWidth()` and `usePanelResizing()`; suppress the right-edge transition while dragging.
  - `lib/panel-state.ts`: add `panelWidthState` (parallel to existing `panelState`) — hydrate/get/set/setResizing/subscribe — backed by `localStorage` key `ui:codePanel:width`, with width clamped to `[280, 800]` px and a default of 384 px; export `usePanelWidth()` and `usePanelResizing()` hooks via `useSyncExternalStore`. Export shared constants (`PANEL_COLLAPSED_WIDTH`, `PANEL_DEFAULT_WIDTH`, `PANEL_MIN_WIDTH`, `PANEL_MAX_WIDTH`) so the panel and the canvas wrapper agree on layout numbers.
  - `lib/diagram-store.ts`: no API change. `commit()` already validates persistence and notifies subscribers; we just call it from a new caller.
  - `components/diagram-canvas.tsx`: no change. Its `useEffect` keyed on `code` already handles re-render and parse-error surfacing for whatever the store emits.
  - `lib/diagram-tools.ts`: no change. Tool-call edits still go through `diagramStore.commit()` and now propagate naturally into the textarea via the `useDiagramCode` subscription.
- **Dependencies**: None added or removed.
- **Realtime/voice flow**: Untouched. The voice agent still owns `set_diagram` / `patch_diagram`. When the user edits manually, the agent's view of the current source is refreshed at the start of the *next* session via `buildInstructions(diagramStore.getCurrent())`; we do not push mid-session updates to the agent (out of scope).
- **Persistence**: Existing diagram source still uses `mermaid:last`; manual edits piggyback on the existing `safeSetItem` path. A new key `ui:codePanel:width` stores the user's preferred panel width as a stringified pixel integer; failures are swallowed (the panel falls back to the 384 px default) and do not produce a toast — width is a UX preference, not user data.
- **Out of scope (non-goals)**:
  - Mermaid syntax highlighting (the textarea is plain monospace text).
  - A custom undo stack beyond the browser's native textarea history.
  - Live push of the user's manual edits into an *active* realtime session — only refreshed on next session start.
  - Multi-cursor or block-selection editor features (no Monaco/CodeMirror integration).
  - Conflict resolution UX when the agent edits the source while the user is mid-keystroke (the last writer wins; the textarea simply re-syncs to whatever the store last committed).
- **Browser support**: Same matrix as the parent capability. `<textarea>` is universal; native undo/redo is universal.
