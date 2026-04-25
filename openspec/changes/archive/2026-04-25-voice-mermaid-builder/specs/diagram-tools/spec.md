## ADDED Requirements

### Requirement: `set_diagram` tool
The system SHALL expose a Realtime tool named `set_diagram` to the model with parameters `{ mermaid_code: string, diagram_type: "flowchart" | "sequence" | "class" | "state" | "er" | "gantt" | "mindmap" | "timeline" | "pie" | "journey" | "gitGraph" | "quadrantChart" | "requirement" | "c4" | "sankey" | "block" | "other" }`. Its English-language description MUST instruct the model: "Use this when creating a new diagram, switching diagram type, or making a structural change too large to express as a patch. Always pass the full, complete Mermaid code, not a fragment."

#### Scenario: Valid full replacement
- **WHEN** the model calls `set_diagram` with `mermaid_code` that parses successfully
- **THEN** the candidate replaces the current diagram, the canvas re-renders, the tool result is `{ ok: true, mermaid_code: <new code>, diagram_type: <given type> }`, and the new code is persisted to `localStorage`

#### Scenario: Invalid replacement
- **WHEN** the model calls `set_diagram` with `mermaid_code` that fails `mermaid.parse()`
- **THEN** the previous valid diagram remains current, no persistence write occurs, and the tool result is `{ ok: false, error: <parse error>, mermaid_code: <previous valid code> }`

#### Scenario: Empty replacement (panic reset)
- **WHEN** the model calls `set_diagram` with an empty `mermaid_code`
- **THEN** the current diagram becomes empty, the canvas returns to the empty state, `localStorage` key `mermaid:last` is cleared, and the tool result is `{ ok: true, mermaid_code: "" }`

### Requirement: `patch_diagram` tool with uniqueness rule
The system SHALL expose a Realtime tool named `patch_diagram` to the model with parameters `{ find: string, replace: string }`. Its English-language description MUST instruct the model: "Use this for small, targeted edits to the existing diagram. `find` must be an exact substring of the current Mermaid code and must be unique. If the substring appears more than once or zero times, the patch will fail and you should retry with a more specific `find` or use `set_diagram` instead." The implementation MUST count occurrences of `find` in the current Mermaid source and only proceed when the count is exactly 1.

#### Scenario: Unique match, valid result
- **WHEN** the model calls `patch_diagram` with a `find` that appears exactly once in the current source and the resulting source parses successfully
- **THEN** the replacement is applied, the candidate replaces the current diagram, the canvas re-renders, the new code is persisted, and the tool result is `{ ok: true, mermaid_code: <new code> }`

#### Scenario: Zero matches
- **WHEN** the model calls `patch_diagram` with a `find` that does not appear in the current source
- **THEN** no change is applied and the tool result is `{ ok: false, error: "find substring matched 0 times, must be exactly 1", mermaid_code: <current code> }`

#### Scenario: Multiple matches
- **WHEN** the model calls `patch_diagram` with a `find` that appears two or more times in the current source
- **THEN** no change is applied and the tool result is `{ ok: false, error: "find substring matched <N> times, must be exactly 1", mermaid_code: <current code> }`

#### Scenario: Replacement produces invalid Mermaid
- **WHEN** the replacement is applied to produce a candidate source that fails `mermaid.parse()`
- **THEN** the patch is reverted, the previous valid source remains current, and the tool result is `{ ok: false, error: <parse error>, mermaid_code: <previous valid code> }`

### Requirement: Uniform tool result payload
Every result returned to the model from `set_diagram` and `patch_diagram` SHALL conform to `{ ok: boolean, error?: string, mermaid_code: string, diagram_type?: string }` and SHALL always include the full current Mermaid source after the call (whether or not the call succeeded).

#### Scenario: Successful call
- **WHEN** any diagram tool call succeeds
- **THEN** the result includes `ok: true` and `mermaid_code` is the full new source

#### Scenario: Failed call
- **WHEN** any diagram tool call fails for any reason
- **THEN** the result includes `ok: false`, a human-readable `error` string, and `mermaid_code` is the full previous valid source

### Requirement: System instructions for diagram-architect persona
The system SHALL send English-language system instructions to the model on session establishment that define the model's role as a Mermaid diagram architect. The instructions MUST:
- Enumerate every supported Mermaid diagram type listed in the `diagram_type` enum.
- Tell the model: "If the user's request is ambiguous about which diagram type fits best, ASK the user to choose before generating. Do not silently pick one."
- Tell the model: "The user may speak any language. Always reply in the user's language. Never put non-English content in tool arguments unless the user explicitly wants labels in that language. When the user has established a label language for the current diagram (by giving labels in a specific language), keep using that language for all subsequent labels until the user signals a switch."
- Tell the model: "Prefer `patch_diagram` for incremental edits. Use `set_diagram` only for new diagrams, type changes, or major restructures."
- Tell the model: "If the user signals they want to start over — phrases like 'reset', 'clear', 'start over', 'começar do zero', 'apagar tudo', 'recomeçar', or equivalents in any language — call `set_diagram` with an empty `mermaid_code` string and confirm briefly out loud."
- Tell the model: "Keep spoken responses concise. The user can see the diagram render — do not narrate the full code aloud."

#### Scenario: Session start
- **WHEN** the Realtime session is established
- **THEN** a `session.update` is sent whose `instructions` contains the diagram-architect persona text in English with all rules above

#### Scenario: Ambiguous request
- **WHEN** the user describes content for which multiple Mermaid types are equally valid
- **THEN** the model asks the user to choose a diagram type before issuing any tool call (verified by behavior; the system instructions enable this behavior)

### Requirement: Inject current diagram into model context
The system SHALL inject the current Mermaid source into the model's context on session establishment, and MUST keep the model's view of the current source up to date via tool results on every subsequent tool call.

#### Scenario: Mount with persisted diagram
- **WHEN** the app mounts, finds a non-empty diagram in `localStorage`, and connects the Realtime session
- **THEN** the system sends a `session.update` whose `instructions` includes the base persona text plus a block stating: "The current diagram is: \n```mermaid\n<code>\n```. Continue editing from here."

#### Scenario: Mount with no persisted diagram
- **WHEN** the app mounts with no diagram in `localStorage` and connects the Realtime session
- **THEN** the system sends a `session.update` whose `instructions` includes the base persona text plus the line: "There is no diagram yet. Wait for the user to describe one."

#### Scenario: Steady-state context refresh
- **WHEN** any subsequent tool call resolves
- **THEN** the tool result returned to the model includes the full current `mermaid_code`, and no additional `session.update` is required to keep the model's view current

### Requirement: Multilingual panic reset
The system SHALL support the model invoking `set_diagram` with empty `mermaid_code` as a "panic reset" path triggered by user phrases in any language.

#### Scenario: Reset in English
- **WHEN** the user says a reset phrase such as "reset", "clear", or "start over"
- **THEN** the model calls `set_diagram` with `mermaid_code: ""`, the canvas returns to empty state, `localStorage` `mermaid:last` is cleared, and the model briefly confirms aloud in the user's language

#### Scenario: Reset in another language
- **WHEN** the user says a reset phrase such as "começar do zero", "apagar tudo", or an equivalent in another language
- **THEN** the same panic-reset behavior is applied
