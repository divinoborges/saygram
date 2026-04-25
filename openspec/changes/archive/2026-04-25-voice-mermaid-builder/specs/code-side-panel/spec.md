## ADDED Requirements

### Requirement: Right-side code panel
The system SHALL display a right-side panel showing the current Mermaid source in a read-only code block with monospace font and code-block styling. The panel content MUST update in real time when the current diagram changes.

#### Scenario: Diagram updates flow to panel
- **WHEN** the current Mermaid source changes via any tool call
- **THEN** the side panel updates to display the new source immediately, with no manual refresh required

#### Scenario: Panel is read-only
- **WHEN** the user attempts to edit the source in the panel
- **THEN** no edit is accepted; the panel does not provide a typing affordance

### Requirement: Collapsible panel with persisted state
The panel SHALL provide a collapse/expand toggle button visible on the panel edge at all times. When collapsed, the diagram canvas MUST expand to fill the freed space. The collapsed/expanded state SHALL be persisted in `localStorage` under the key `ui:codePanel` and restored on mount.

#### Scenario: Collapse expands canvas
- **WHEN** the user clicks the toggle while the panel is expanded
- **THEN** the panel collapses, the canvas grows to fill the freed horizontal space, and `localStorage.setItem("ui:codePanel", "collapsed")` is invoked

#### Scenario: Expand restores panel
- **WHEN** the user clicks the toggle while the panel is collapsed
- **THEN** the panel expands to its default width, the canvas resizes accordingly, and `localStorage.setItem("ui:codePanel", "expanded")` is invoked

#### Scenario: State restored on mount
- **WHEN** the app mounts and `localStorage` key `ui:codePanel` is `"collapsed"`
- **THEN** the panel renders in collapsed state from first paint

### Requirement: Copy-code button
The panel header SHALL include a "Copy code" button. Clicking it MUST call `navigator.clipboard.writeText()` with the current Mermaid source. On success, the button MUST display a transient "Copied!" confirmation for approximately 2 seconds. The button MUST be disabled when no source exists.

#### Scenario: Successful copy
- **WHEN** the user clicks "Copy code" with a non-empty current source and the Clipboard API succeeds
- **THEN** the source is written to the clipboard and the button label shows "Copied!" for ~2 seconds, then reverts to "Copy code"

#### Scenario: No source yet
- **WHEN** the current Mermaid source is empty
- **THEN** the "Copy code" button is disabled and not clickable

#### Scenario: Clipboard API failure fallback
- **WHEN** `navigator.clipboard.writeText()` rejects (denied, unavailable, or insecure context)
- **THEN** the system selects the source text in the panel so the user can copy manually with Cmd/Ctrl+C and surfaces a toast/banner notifying them of the fallback
