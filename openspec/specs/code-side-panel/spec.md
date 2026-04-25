# code-side-panel Specification

## Purpose

Defines the right-side code panel that displays the current Mermaid source alongside the diagram canvas, including its collapsible behavior and copy-to-clipboard affordance.
## Requirements
### Requirement: Right-side code panel
The system SHALL display a right-side panel showing the current Mermaid source in a read-only code block. The panel container SHALL use the M3 surface-container background token (`--md-sys-color-surface-container`) with the M3 large shape token applied to the inner code area; the header label SHALL use the M3 typescale `label-large` token; the code block SHALL use Roboto Mono via the M3 typography system with `body-medium` line-height and `--md-sys-color-on-surface` text color. The panel content MUST update in real time when the current diagram changes.

#### Scenario: Diagram updates flow to panel
- **WHEN** the current Mermaid source changes via any tool call
- **THEN** the side panel updates to display the new source immediately, with no manual refresh required

#### Scenario: Panel is read-only
- **WHEN** the user attempts to edit the source in the panel
- **THEN** no edit is accepted; the panel does not provide a typing affordance

#### Scenario: Panel chrome uses M3 tokens
- **WHEN** a developer inspects the rendered panel in DevTools
- **THEN** the panel background, header typography, and code typography all resolve from `var(--md-sys-*)` token references — no hard-coded colors, fonts, or radii appear in the component

### Requirement: Collapsible panel with persisted state
The panel SHALL provide a collapse/expand toggle implemented as an `<md-icon-button>` web component, visible on the panel edge at all times, using Material Symbols `chevron_left` (when expanded) and `chevron_right` (when collapsed) glyphs. When collapsed, the diagram canvas MUST expand to fill the freed space. The collapsed/expanded state SHALL be persisted in `localStorage` under the key `ui:codePanel` and restored on mount.

#### Scenario: Collapse expands canvas
- **WHEN** the user clicks the toggle while the panel is expanded
- **THEN** the panel collapses, the canvas grows to fill the freed horizontal space, and `localStorage.setItem("ui:codePanel", "collapsed")` is invoked

#### Scenario: Expand restores panel
- **WHEN** the user clicks the toggle while the panel is collapsed
- **THEN** the panel expands to its default width, the canvas resizes accordingly, and `localStorage.setItem("ui:codePanel", "expanded")` is invoked

#### Scenario: State restored on mount
- **WHEN** the app mounts and `localStorage` key `ui:codePanel` is `"collapsed"`
- **THEN** the panel renders in collapsed state from first paint

#### Scenario: Toggle is an M3 icon button
- **WHEN** the user inspects the toggle DOM element
- **THEN** it is an `<md-icon-button>` component containing a Material Symbols glyph, not a hand-styled `<button>` with an SVG icon

### Requirement: Copy-code button
The panel header SHALL include a "Copy code" affordance implemented as an `<md-filled-tonal-button>` web component with a leading Material Symbols `content_copy` icon. Clicking it MUST call `navigator.clipboard.writeText()` with the current Mermaid source. On success, the button MUST switch its leading icon to `check` and its label to "Copied!" for approximately 2 seconds before reverting. The button MUST be disabled (via the M3 button's `disabled` attribute) when no source exists.

#### Scenario: Successful copy
- **WHEN** the user clicks "Copy code" with a non-empty current source and the Clipboard API succeeds
- **THEN** the source is written to the clipboard, the button label shows "Copied!" with a `check` Material Symbol for ~2 seconds, then reverts to "Copy code" with a `content_copy` Material Symbol

#### Scenario: No source yet
- **WHEN** the current Mermaid source is empty
- **THEN** the M3 button's `disabled` attribute is set and the button is not clickable

#### Scenario: Clipboard API failure fallback
- **WHEN** `navigator.clipboard.writeText()` rejects (denied, unavailable, or insecure context)
- **THEN** the system selects the source text in the panel so the user can copy manually with Cmd/Ctrl+C and surfaces an M3 snackbar (warning kind) notifying the user of the fallback

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

