# mermaid-canvas Specification

## Purpose

Defines how the main canvas renders the current Mermaid source as inline SVG, validates candidates before commit, debounces re-renders, manages a delayed loading indicator, and prevents Mermaid errors from reaching the React error boundary.

## Requirements

### Requirement: Live Mermaid rendering on the main canvas
The system SHALL render the current Mermaid source as inline SVG on the main canvas using the `mermaid` npm package, with `mermaid.initialize({ startOnLoad: false })` invoked once at module load and `mermaid.render()` invoked explicitly on each diagram change. The canvas surface and empty-state typography SHALL use Material Design 3 token references; no hard-coded colors or font sizes appear in the canvas component.

#### Scenario: Render valid diagram
- **WHEN** the current Mermaid source is non-empty and parses successfully
- **THEN** the canvas displays the diagram as inline SVG, centered with comfortable padding and a reasonable max-width, on a surface whose background resolves from `--md-sys-color-surface`

#### Scenario: Empty state
- **WHEN** the current Mermaid source is empty
- **THEN** the canvas displays the empty-state hint "Start speaking — describe a diagram or a system you want to visualize." rendered with the M3 `body-large` typescale token and `--md-sys-color-on-surface-variant` text color, accompanied by an outlined Material Symbol glyph (`auto_awesome` or equivalent) above the text

### Requirement: Validation gate before commit
The system SHALL call `mermaid.parse(candidate)` before committing any candidate Mermaid source to the rendered state. Only sources that resolve from `parse()` MUST replace the previous valid render. The non-blocking error banner shown on parse failure SHALL render as an M3 error tonal surface (`--md-sys-color-error-container` background, `--md-sys-color-on-error-container` foreground, `--md-sys-shape-corner-medium` radius).

#### Scenario: Candidate parses successfully
- **WHEN** a tool call produces a candidate Mermaid source and `mermaid.parse(candidate)` resolves
- **THEN** the candidate becomes the current source, the canvas re-renders, and the tool result returned to the model contains `{ ok: true, mermaid_code: <candidate> }`

#### Scenario: Candidate fails to parse
- **WHEN** a tool call produces a candidate Mermaid source and `mermaid.parse(candidate)` rejects
- **THEN** the previous valid render remains visible, the previous valid source remains the current state, an inline non-blocking M3 error tonal banner appears on the canvas reading "Invalid diagram syntax — asking the model to retry" with a leading `error` Material Symbol, and the tool result returned to the model contains `{ ok: false, error: <parse error message>, mermaid_code: <previous valid source> }`

### Requirement: Debounced re-render
The system SHALL debounce re-renders so that rapid back-to-back diagram changes do not cause visible flicker.

#### Scenario: Two tool calls land within the debounce window
- **WHEN** two successful diagram changes land within ~50ms of each other
- **THEN** the canvas renders only the most recent valid source once, with no intermediate flash of the first

### Requirement: Delayed loading indicator
The system SHALL display a loading indicator while a parse+render is in flight, but only when that work exceeds approximately 200ms. The indicator SHALL be implemented as an `<md-circular-progress indeterminate>` Material Design 3 component. The previous valid render MUST remain visible underneath the indicator until the new render is ready.

#### Scenario: Fast render
- **WHEN** parse and render complete in under 200ms
- **THEN** no loading indicator is displayed

#### Scenario: Slow render
- **WHEN** parse and render exceed 200ms
- **THEN** an `<md-circular-progress indeterminate>` is displayed over the previous render, centered with a subtle scrim using `--md-sys-color-surface-container` at reduced opacity; when the new render is ready the indicator is removed and the new SVG replaces the old

### Requirement: No uncaught exceptions from invalid sources
The system SHALL ensure that no Mermaid parse or render error reaches the React error boundary.

#### Scenario: Model emits malformed Mermaid
- **WHEN** the model produces malformed Mermaid through any tool call
- **THEN** the failure is captured by the validation gate, surfaced via the error banner and tool result, and the React tree continues to render normally with no error boundary fallback shown
