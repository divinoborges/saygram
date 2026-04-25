## MODIFIED Requirements

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
