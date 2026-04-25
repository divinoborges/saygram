## 1. Implementation — editable textarea

- [x] 1.1 In `components/code-side-panel.tsx`, add an `onChange?: (value: string) => void` prop to `CodeSidePanelProps` alongside the existing `code`, `collapsed`, and `onToggle` props.
- [x] 1.2 Replace the `<pre>` element with a `<textarea>` that:
  - Has `value={code}`
  - Calls `onChange?.(e.target.value)` from its `onChange` handler
  - Uses `flex-1 overflow-auto p-3 bg-transparent border-0 outline-none resize-none whitespace-pre` (no soft-wrap, both scrollbars enabled — line numbers stay trustworthy)
  - Inherits typography from `var(--md-sys-typescale-body-medium-font)` with `font-family: var(--md-ref-typeface-mono)` and `color: var(--md-sys-color-on-surface)`
  - Sets `placeholder="No diagram yet — speak or start typing Mermaid…"`
  - Sets `spellCheck={false}`, `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="off"`, and `data-gramm="false"`
- [x] 1.3 Remove the `codeRef` / `useRef<HTMLPreElement>` and the manual range-selection fallback inside `handleCopy`. Keep the `navigator.clipboard.writeText(code)` happy path and the toast on rejection.
- [x] 1.4 Keep the empty-state guard inside `handleCopy` (`if (!code) return;`) and keep the disabled state on the Copy button (`disabled={!code}`).
- [x] 1.5 In `components/app.tsx`, pass `onChange={(value) => diagramStore.commit(value)}` into `<CodeSidePanel />`.
- [x] 1.6 Confirm no other callers of `CodeSidePanel` exist (`grep -r "CodeSidePanel" components/ app/`).

## 2. Implementation — line-number gutter

- [x] 2.1 In `components/code-side-panel.tsx`, derive `lineCount = code.length === 0 ? 1 : code.split("\n").length` and memoize a string of `1..lineCount` joined by `\n`.
- [x] 2.2 Render a left-side gutter `<div>` next to the textarea, containing a `<pre>` with the joined line numbers. Mark the gutter `aria-hidden`, `select-none`, right-aligned, with `borderRight: 1px solid var(--md-sys-color-outline-variant)` and `minWidth: \`${gutterDigits + 1}ch\``.
- [x] 2.3 Use the same `font` shorthand and same monospace `font-family` override on the gutter `<pre>` as the textarea so line metrics match. Set `overflow: hidden` on the gutter container.
- [x] 2.4 Sync vertical scroll: on the textarea's `onScroll`, write `e.currentTarget.scrollTop` into `gutterRef.current.scrollTop`.

## 3. Implementation — resizable panel width

- [x] 3.1 In `lib/panel-state.ts`, add a parallel `panelWidthState` store (hydrate / get / set / setResizing / isResizing / subscribe), backed by `localStorage` key `ui:codePanel:width`. Width is clamped to `[280, 800]` px in `set()`. Default is 384 px.
- [x] 3.2 Export `usePanelWidth()` and `usePanelResizing()` hooks via `useSyncExternalStore`.
- [x] 3.3 Export shared layout constants: `PANEL_COLLAPSED_WIDTH`, `PANEL_DEFAULT_WIDTH`, `PANEL_MIN_WIDTH`, `PANEL_MAX_WIDTH`.
- [x] 3.4 In `components/app.tsx`, call `panelWidthState.hydrate()` in the existing mount effect, read `usePanelWidth()` and `usePanelResizing()`, and replace `right-10`/`right-96` Tailwind classes with `style={{ right: panelCollapsed ? PANEL_COLLAPSED_WIDTH : panelWidth }}`. Drop the `transition-[right]` class while `isPanelResizing` is true.
- [x] 3.5 In `components/code-side-panel.tsx`, drive the aside's width via `style={{ width: collapsed ? PANEL_COLLAPSED_WIDTH : panelWidth }}` and drop `transition-[width]` while `isResizing` is true.
- [x] 3.6 Render a 6 px-wide `<div role="separator" aria-orientation="vertical">` overlaying the panel's left edge with `cursor: col-resize`, `touch-action: none`, and `z-30`. Hide it when `collapsed`.
- [x] 3.7 On `pointerdown` (left button only), call `setPointerCapture`, snapshot `startX` and `startWidth = panelWidthState.get()`, set `panelWidthState.setResizing(true)`, and attach `pointermove` / `pointerup` / `pointercancel` listeners to the handle.
- [x] 3.8 On `pointermove`, call `panelWidthState.set(startWidth - (ev.clientX - startX))`. On `pointerup`/`pointercancel`, release pointer capture, remove listeners, and `panelWidthState.setResizing(false)`.

## 4. Manual verification

- [ ] 4.1 Run `npm run dev`, load the app, and type a small Mermaid graph (e.g., `flowchart LR\nA-->B`) into the textarea. The canvas must render the graph live within ~50 ms of the last keystroke.
- [ ] 4.2 Edit a node label by deleting and retyping inside the textarea. The canvas must update on each keystroke (debounced) and never revert the textarea contents.
- [ ] 4.3 Mid-edit, type a deliberately invalid character. The textarea must keep showing what was typed; the canvas must show the existing amber "Invalid diagram syntax" indicator. Then complete the syntax — the canvas must re-render and the indicator must clear.
- [ ] 4.4 Press `Cmd/Ctrl+Z` inside the textarea — the prior textarea content must come back, the store must commit that prior value (canvas re-renders), and `Cmd/Ctrl+Shift+Z` must redo.
- [ ] 4.5 Reload the page after typing. The textarea must be rehydrated from `localStorage` (`mermaid:last`).
- [ ] 4.6 Start a realtime session and ask the agent to make a diagram change. The textarea must update to reflect the tool-call output.
- [ ] 4.7 Verify Mermaid keywords (`flowchart`, `sequenceDiagram`, etc.) are NOT underlined as spelling errors and are NOT autocapitalized.
- [ ] 4.8 Verify the existing collapse/expand toggle, the empty-state placeholder, and the Copy-code button still behave as specified.
- [ ] 4.9 Type a long single line (wider than the panel). Confirm the textarea exposes a horizontal scrollbar — the line does NOT wrap — and the gutter does NOT scroll horizontally with it.
- [ ] 4.10 Scroll the textarea vertically (mouse wheel, arrow keys, drag selection past the bottom). Confirm the gutter's line numbers stay aligned with each visible source line.
- [ ] 4.11 Drag the resize handle on the panel's left edge inward and outward. Confirm the panel widens/narrows live, the canvas's right edge tracks it with no animation lag, and the width is clamped at the 280 px / 800 px bounds.
- [ ] 4.12 Resize the panel, reload the page, confirm the panel re-mounts at the same width.

## 5. Spec sync

- [x] 5.1 Run `openspec validate editable-code-side-panel` and confirm it passes.
- [ ] 5.2 After implementation lands and is verified, run `openspec archive editable-code-side-panel` to merge the spec delta into `openspec/specs/code-side-panel/spec.md`.
