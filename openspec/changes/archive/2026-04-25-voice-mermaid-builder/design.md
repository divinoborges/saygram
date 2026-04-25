## Context

The starting codebase is a Next.js + React app demonstrating the OpenAI Realtime API by manipulating a hosted Spline 3D solar-system scene through model-driven tool calls over a WebRTC session. (No Three.js / `react-three-fiber` is in use — the 3D layer is `@splinetool/react-spline` + `@splinetool/runtime`, which proxies model events into a Spline-hosted scene.) The Realtime connection scaffolding in `components/app.tsx` (ephemeral-key endpoint, `RTCPeerConnection` setup, audio track wiring, `session.update` flow, tool-call dispatch) is working and worth preserving. Everything visible — the Spline scene component, the solar-system-specific tools, and the chart-rendering layer (`chart.js`, `react-chartjs-2`, `recharts`, `components/charts/*`, `lib/components-mapping.tsx`) used by the legacy `display_data` tool — is being replaced. The `app/api/iss/route.ts` endpoint is also solar-system-specific and goes away with the rest.

The new product is a voice-driven Mermaid diagram builder. The user speaks (in any language), and the model uses two tools to create or edit Mermaid code that the app parses, validates, and renders as inline SVG on the main canvas. A right-side collapsible panel exposes the raw Mermaid source with a copy-to-clipboard button. The current diagram persists in `localStorage` and is restored on reload.

Constraints:
- One current diagram, no multi-diagram management or undo/redo (out of scope for v1).
- Browser-only persistence (no server, no auth).
- All developer-facing strings (system prompt, tool descriptions) must stay in English regardless of the user's spoken language.
- Desktop-first; Chromium and Safari are primary targets, Firefox secondary.

## Goals / Non-Goals

**Goals:**
- Define the model contract (two tools and their payload shape) so model behavior is predictable across diagram types and languages.
- Define a validation-gated render path so invalid model output never blanks or breaks the canvas.
- Define how the current diagram is fed back to the model on every turn so edits stay incremental.
- Define a UI shell (canvas + collapsible code panel + status pill) and a persistence model that survives reloads.
- Cleanly remove all 3D / solar-system scaffolding so the new app builds without dead code.

**Non-Goals:**
- Manual code editing in the panel, version history, undo, multi-diagram libraries, image/PDF export, server-side persistence, mobile-tuned layout, accounts/billing, fine-grained per-diagram-type tools.

## Decisions

### D1. Two tools: `set_diagram` (full replace) and `patch_diagram` (uniqueness-checked find/replace)

Both tools live at the same level on the model. `set_diagram` takes the full Mermaid source and a `diagram_type` discriminator; `patch_diagram` takes `{ find, replace }` operating on the current source.

Rationale: the model handles diagram structure best when it can either restate the whole thing (initial creation, type switch, big restructure) or perform a tight surgical edit (rename a node, change an arrow style). A single "edit" tool would force the model to either always rewrite (lossy and slow) or invent an ad-hoc patch format. We considered diff-based patches (line ranges, unified diff) and per-diagram-type tools (`add_class_method`, `add_sequence_message`, etc.), and rejected both: diffs are fiddly to generate over voice-driven edits, and per-type tools would explode the API surface and require the model to track diagram type in tool selection. The hybrid covers all 16 supported Mermaid types uniformly.

### D2. `patch_diagram` requires `find` to match exactly once

If `find` appears 0 times or ≥ 2 times, the tool returns `{ ok: false, error: "find substring matched N times, must be exactly 1", mermaid_code }` and applies no change. The model is instructed to retry with a more specific `find` (longer surrounding context) or fall back to `set_diagram`.

Rationale: silently replacing all occurrences would corrupt diagrams the moment the model targets a generic substring (e.g., the label `"User"` appearing on multiple nodes). Returning the failure with the current code lets the model self-correct in one extra turn. Alternatives considered: an `nth-occurrence` parameter (extra cognitive load, easy to miscount), a `count` field (silently masks ambiguity). Exactly-one is the simplest contract that prevents silent corruption.

### D3. Uniform tool result payload: `{ ok, error?, mermaid_code, diagram_type? }`

Both tools always return the full current Mermaid source on every call — success or failure. Failure also includes a human-readable `error` string. `diagram_type` is included on `set_diagram` results.

Rationale: the model needs the current diagram in context to make the next edit accurate, and it shouldn't have to memorize different shapes per tool. Same shape, every time.

### D4. Validation gate via `mermaid.parse()` before committing render state

On every tool call, after constructing the candidate next code, the app calls `mermaid.parse(candidate)`. Only on resolution does the candidate become the new state and trigger a render. On rejection, the previous valid code stays in state and the parse error flows back to the model in the tool result.

Rationale: Mermaid's `parse()` is cheap and authoritative. Letting invalid code reach `render()` either blanks the canvas or throws unpredictably depending on the diagram type. Validating up front gives us one consistent error path.

### D5. Initial diagram context injected via `session.update` instructions, not a synthetic conversation item

On app mount, after loading from `localStorage` and connecting, the app sends a `session.update` whose `instructions` field is the base diagram-architect prompt with the current diagram appended in a `<current_diagram>` block (or the explicit "no diagram yet" line if storage was empty). On subsequent tool calls, the current code returns to the model via the tool result (D3) — no further `session.update` is needed for context refresh.

Rationale: `session.update` is the documented surface for adjusting model behavior mid-session and avoids polluting the conversation history with synthetic turns. We considered a `conversation.item.create` with a system-role item, but it muddles the transcript and behaves inconsistently across Realtime API versions. Using tool results as the steady-state context channel and `session.update` only for the initial load is the cleanest split.

### D6. Render strategy: explicit `mermaid.render()`, debounced, with delayed loading indicator

`mermaid.initialize({ startOnLoad: false })` runs once at module load. The canvas component, on `code` change, debounces (~50ms), calls `mermaid.parse()`, then `mermaid.render(id, code)`, and inserts the returned SVG. The previous SVG remains visible until the new one is ready. A loading indicator is shown only if the parse+render duration exceeds 200ms.

Rationale: rapid back-to-back tool calls (e.g., a `patch_diagram` immediately followed by another) would cause flicker. A small debounce coalesces them. The delayed indicator prevents flashes on small/fast diagrams while still giving feedback on large ones.

### D7. Persistence in `localStorage` with two keys

- `mermaid:last`: the last successfully validated diagram source (string).
- `ui:codePanel`: `"collapsed"` or `"expanded"`.

Writes are wrapped in try/catch to handle quota exceeded and private-browsing exceptions. On read failure, fall back to defaults (empty diagram, panel expanded). Panic reset (`set_diagram` with empty `mermaid_code`) clears `mermaid:last`.

Rationale: simple and reliable for a single-diagram product. IndexedDB would be overkill at this size. Per-key try/catch isolates failure of one key from the other.

### D8. Language handling: English system prompt, user-language reply, label-language continuity

The system prompt is in English and explicitly tells the model: (a) reply in the user's spoken language; (b) keep tool arguments and Mermaid keywords in English; (c) for label content, follow the user's most recent language cue and stay consistent within the current diagram until the user signals a switch; (d) for ambiguous diagram-type requests, ask before generating; (e) on multilingual reset phrases ("reset", "começar do zero", etc.), call `set_diagram` with empty `mermaid_code`.

Rationale: the model is multilingual but tool schemas, validation errors, and Mermaid syntax are language-invariant. Pinning the developer-facing strings to English keeps the tool layer stable; allowing per-diagram label-language continuity matches user expectation.

### D9. UI behavior when disconnected

The canvas and code panel remain functional in read-only mode (using the `localStorage`-loaded code). Only the start/stop button and status pill change. The user can still copy code while disconnected.

Rationale: a stale render is more useful than a blanked screen, and the user often wants to copy the last result after a session ends.

## Risks / Trade-offs

- **Model picks `set_diagram` for trivial edits** → Mitigation: explicit instruction in the system prompt to prefer `patch_diagram` for incremental edits; success-metric tracking ("≥80% incremental edits use patch") lets us tune the prompt later.
- **`patch_diagram` uniqueness fails on repeated labels** → Mitigation: error returns the current code and tells the model to retry with longer context or fall back to `set_diagram`. The model gets one extra turn, no corruption.
- **Mermaid `parse()` API surface changes between minor versions** → Mitigation: pin `mermaid` to a known-good major version in `package.json`; the parse call site is centralized in a single helper so a future migration is a one-file change.
- **`localStorage` quota exceeded for very large diagrams** → Mitigation: try/catch around writes, surface a non-blocking warning toast on failure, keep the in-memory diagram alive for the session even if persistence fails.
- **Clipboard API blocked or denied** → Mitigation: fall back to selecting the code text in the panel and showing a banner instructing the user to press Cmd/Ctrl+C; this is documented in US-010.
- **Race condition: tool call lands while a previous render is in flight** → Mitigation: render is idempotent on the latest `code`; the debounce + state-driven render guarantees only the latest valid code is rendered.
- **WebRTC connection drops mid-session** → Mitigation: status indicator surfaces `error`, start button re-establishes; the persisted diagram means no state is lost.
- **Spline / charting removal misses a transitive dependency or asset reference** → Mitigation: typecheck + lint gate every task group, plus a clean `next build` to surface missing-import errors. The cleanup is its own task group (§1) so it lands as a discrete commit.

## Migration Plan

The change is a hard pivot — no users, no production data. There is no migration in the traditional sense. The rollout sequence is the implementation order in `tasks.md`: scaffold-clean (US-001) before any new feature work, so each subsequent step lands on a green build. If the change is reverted, `git revert` of the merge commit restores the solar-system app; no schema or data state to roll back.

## Open Questions

The PRD's Section 9 explicitly closes all v1 open questions (diagram-type ambiguity, mixed-language labels, panic reset, transcript visibility, large-diagram lag). No new blockers surfaced during design. Items deferred to a future iteration (undo/history, manual code editing, image export) are listed as Non-Goals and do not block v1.
