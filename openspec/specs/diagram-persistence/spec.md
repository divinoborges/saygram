# diagram-persistence Specification

## Purpose

Defines how the current Mermaid diagram is persisted to and restored from `localStorage` so users do not lose work between sessions, and how storage failures are handled gracefully.

## Requirements

### Requirement: Persist current diagram in localStorage
The system SHALL write the current Mermaid source to `localStorage` under the key `mermaid:last` after every successful diagram change (`set_diagram` or `patch_diagram`).

#### Scenario: Successful change writes storage
- **WHEN** a diagram tool call succeeds with a parseable result
- **THEN** `localStorage.setItem("mermaid:last", <new code>)` is invoked

#### Scenario: Failed change does not write storage
- **WHEN** a diagram tool call fails (uniqueness violation, parse error, or otherwise)
- **THEN** no write to `localStorage` key `mermaid:last` occurs

#### Scenario: Panic reset clears storage
- **WHEN** `set_diagram` is called with empty `mermaid_code` and succeeds
- **THEN** `localStorage` key `mermaid:last` is removed (or written to empty string equivalently treated as no diagram)

### Requirement: Restore current diagram on app mount
On app mount, the system SHALL read `localStorage` key `mermaid:last`. If present and non-empty, the diagram MUST be loaded into application state and rendered before the Realtime session connects.

#### Scenario: Persisted diagram exists
- **WHEN** the app mounts and `localStorage` contains a non-empty `mermaid:last` value
- **THEN** the canvas renders the persisted diagram immediately, the side panel shows the persisted source, and after the Realtime session connects the persisted source is included in the initial `session.update` instructions per the diagram-tools capability

#### Scenario: No persisted diagram
- **WHEN** the app mounts and `localStorage` has no `mermaid:last` value
- **THEN** the canvas shows the empty-state hint and after connection the model is told there is no diagram yet

### Requirement: Storage write/read safety
All `localStorage` access SHALL be wrapped in try/catch to handle quota-exceeded errors and private-browsing exceptions. A storage failure MUST NOT propagate as an uncaught exception, MUST NOT block the in-memory diagram state, and SHOULD surface a non-blocking warning to the user when a write fails.

#### Scenario: Quota exceeded on write
- **WHEN** writing the current diagram to `localStorage` throws a quota-exceeded error
- **THEN** the in-memory diagram state remains correct, the canvas continues to render the new diagram, and a non-blocking warning is surfaced to the user; the app does not crash

#### Scenario: Read failure
- **WHEN** reading `localStorage` on mount throws (e.g., disabled storage)
- **THEN** the app falls back to the empty-diagram default and continues without crashing
