## MODIFIED Requirements

### Requirement: Right-side code panel
The system SHALL display a right-side panel showing the current Mermaid source in an editable `<textarea>` styled as a code block (monospace font, code-block visual treatment). The textarea content MUST update in real time when the current diagram changes — whether the change came from a tool call or the user's own typing — and MUST always reflect the value of the current diagram source as held by the diagram store.

#### Scenario: Diagram updates flow to panel
- **WHEN** the current Mermaid source changes via a tool call (`set_diagram` or `patch_diagram`)
- **THEN** the textarea's value updates to display the new source on the next render, with no manual refresh required

#### Scenario: Panel accepts direct editing
- **WHEN** the user focuses the panel and types
- **THEN** the keystrokes are accepted, appear in the textarea, and trigger a commit to the diagram store on every change event

#### Scenario: Empty-state hint via placeholder
- **WHEN** the current Mermaid source is the empty string
- **THEN** the textarea is empty and displays a placeholder hint indicating the user can either speak to the agent or start typing Mermaid directly

## ADDED Requirements

### Requirement: Two-way binding between textarea and diagram store
Edits in the panel's textarea SHALL flow into `diagramStore.commit()` on every change event so the canvas re-renders live as the user types. Updates to the diagram store from any other source (tool calls, hydration from `localStorage`) SHALL flow back into the textarea via the existing `useDiagramCode()` subscription, making the textarea a fully controlled input whose value is always equal to the store's current source.

#### Scenario: Typing re-renders the canvas live
- **WHEN** the user types a character into the textarea and the resulting source is valid Mermaid
- **THEN** within the canvas's existing render-debounce window, the canvas re-renders to reflect the typed change, with no other interaction required

#### Scenario: Manual edits persist across reload
- **WHEN** the user types into the textarea and then reloads the page
- **THEN** the textarea is rehydrated with the user's last-typed value from `localStorage` under the existing `mermaid:last` key

#### Scenario: Tool-call edit overwrites in-flight typed text
- **WHEN** the user is mid-typing in the textarea and a tool call (`set_diagram` or `patch_diagram`) commits a new value to the store
- **THEN** the textarea's value snaps to the tool call's value on the next render; this overwrite is the accepted contention behavior

### Requirement: Invalid intermediate states do not clobber the textarea
Manual keystrokes SHALL be committed to the diagram store unconditionally — they are NOT gated on `parseMermaid` success. While the typed source is unparseable, the textarea MUST continue to show the user's exact typed characters; the canvas surfaces the existing render-error indicator until the source becomes valid again, at which point the canvas re-renders.

#### Scenario: Mid-typing parse failure preserves user text
- **WHEN** the user has typed a partial token that does not parse as Mermaid
- **THEN** the textarea continues to show the partial token verbatim, the diagram store holds that same partial source, and the canvas displays the existing invalid-syntax indicator without the textarea reverting

#### Scenario: Recovery on next valid keystroke
- **WHEN** the user, while in an unparseable state, types additional characters that complete a valid Mermaid source
- **THEN** the canvas re-renders the new diagram and the invalid-syntax indicator clears, with no manual refresh required

### Requirement: Native textarea editing affordances are preserved
The textarea SHALL support the browser's native undo (`Cmd/Ctrl+Z`) and redo (`Cmd/Ctrl+Shift+Z`) for the textarea content, native selection, and native paste. Spellcheck, autocomplete, autocorrect, autocapitalize, and Grammarly-style DOM injection MUST be disabled on the textarea so that Mermaid identifiers are not flagged or rewritten.

#### Scenario: Native undo restores prior text
- **WHEN** the user types, then presses `Cmd/Ctrl+Z` while focused in the textarea
- **THEN** the textarea reverts to its prior content using the browser's native undo stack, and the resulting `change` event commits that prior content to the diagram store

#### Scenario: Spellcheck and autocorrect are off
- **WHEN** the user types Mermaid identifiers like `flowchart` or `sequenceDiagram`
- **THEN** the browser does not underline them as misspellings and does not autocorrect or autocapitalize them

### Requirement: Line-number gutter
The panel SHALL render a left-side gutter showing 1-based line numbers for the current source, in the same monospace font, font size, and line-height as the textarea. The gutter MUST scroll vertically in lockstep with the textarea so that each gutter number stays visually aligned with its corresponding source line. The gutter MUST NOT show a horizontal scrollbar regardless of source line length. When the source is empty, the gutter SHALL render the single number `1`.

#### Scenario: Gutter shows one number per source line
- **WHEN** the source contains N newline-separated lines
- **THEN** the gutter renders the integers 1 through N, each on its own visual row, right-aligned

#### Scenario: Vertical scroll stays in sync
- **WHEN** the user scrolls the textarea vertically (via wheel, keyboard, or touchpad)
- **THEN** the gutter's `scrollTop` updates to match the textarea's `scrollTop` so each visible line number stays aligned with its source line

#### Scenario: Gutter ignores horizontal overflow
- **WHEN** a source line is wider than the textarea's content area and produces a horizontal scrollbar in the textarea
- **THEN** the gutter does not show a horizontal scrollbar and its line numbers stay fixed at the left edge of the panel

### Requirement: Source lines do not soft-wrap
Long source lines SHALL NOT soft-wrap inside the textarea. The textarea MUST display its content with `white-space: pre` semantics and SHALL provide both horizontal and vertical scrollbars (or equivalent overflow affordances) when content exceeds the visible area. Each newline character in the source MUST correspond to exactly one visual row, so that gutter line numbers remain trustworthy.

#### Scenario: Long line scrolls horizontally
- **WHEN** the user types or pastes a single line wider than the textarea content area
- **THEN** the textarea exposes a horizontal scrollbar and the line is not split across two visual rows

#### Scenario: Newlines map 1:1 to visual rows
- **WHEN** the source has N lines separated by newline characters
- **THEN** the textarea renders exactly N visual rows, matching the gutter's count

### Requirement: User-resizable panel width with persistence
The panel SHALL provide a draggable handle on its left edge that lets the user resize the panel's width by clicking, holding, and moving horizontally. The width MUST be clamped to a sensible range (no narrower than the panel header would allow, no wider than a reasonable fraction of the viewport). The committed width SHALL be persisted to `localStorage` under the key `ui:codePanel:width` and restored on mount. While the user is actively dragging the handle, the canvas MUST resize live (no animated transition lag), and any width-change CSS transition MUST be suppressed for the duration of the drag.

#### Scenario: Drag widens or narrows the panel
- **WHEN** the user clicks and holds the resize handle on the panel's left edge and moves the pointer left or right
- **THEN** the panel's width changes live to follow the pointer (clamped to the configured min/max bounds), and the canvas's right edge tracks the panel's new left edge with no animation lag

#### Scenario: Released width persists across reload
- **WHEN** the user releases the resize handle at a given width and then reloads the page
- **THEN** the panel re-mounts at that same width, restored from `localStorage` key `ui:codePanel:width`

#### Scenario: Width is clamped to a sensible range
- **WHEN** the user drags the handle past the configured min or max bound
- **THEN** the panel width stops at the bound and the pointer can continue moving without the panel shrinking below or growing beyond it

#### Scenario: Resize handle is hidden while collapsed
- **WHEN** the panel is in the collapsed state
- **THEN** the resize handle is not rendered and the only width control is the existing collapse/expand toggle
