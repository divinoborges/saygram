## 1. Strip the solar-system template

- [x] 1.1 Inventory complete (Spline + chart libs + iss endpoint identified). Cleanup surface: `components/scene.tsx`, `components/scene.css`, `components/charts/`, `lib/components-mapping.tsx`, `app/api/iss/route.ts`, the six solar-system tool definitions in `lib/config.ts`, and Spline/chart deps in `package.json`.
- [x] 1.2 Remove the `<Scene>` mount from `components/app.tsx`, delete `components/scene.tsx` and `components/scene.css`, and replace the scene slot with a placeholder element where the diagram canvas will go
- [x] 1.3 Remove the solar-system tool definitions from `lib/config.ts` (PLANETS, MOONS, the `toolsDefinition` entries for `focus_planet`/`display_data`/`reset_camera`/`show_orbit`/`show_moons`/`get_iss_position`) and remove their dispatch in `components/app.tsx` (e.g. the `get_iss_position` branch)
- [x] 1.4 Delete the chart layer no longer needed for Mermaid: `components/charts/chart.tsx`, `components/charts/pie-chart.tsx`, `lib/components-mapping.tsx`, and any imports referencing them
- [x] 1.5 Delete `app/api/iss/route.ts` (solar-system-only endpoint) and any references to its `/api/iss` URL
- [x] 1.6 Remove `@splinetool/react-spline`, `@splinetool/runtime`, `chart.js`, `react-chartjs-2`, `recharts`, and any other now-unreferenced solar-system-only packages from `package.json`; reinstall lockfile
- [x] 1.7 Confirm `next build` succeeds, typecheck passes, and lint passes; confirm clicking "connect" still establishes a Realtime session against the (now empty) tool set

## 2. Mermaid canvas and validation

- [x] 2.1 Add the `mermaid` npm package (pinned to a known-good major) and a single helper module that calls `mermaid.initialize({ startOnLoad: false })` exactly once
- [x] 2.2 Centralize a `parseMermaid(code)` helper that wraps `mermaid.parse()` and a `renderMermaid(id, code)` helper that wraps `mermaid.render()`, both returning typed results
- [x] 2.3 Build a `<DiagramCanvas code={...} />` component that, on `code` change, debounces ~50ms, parses, renders, and inserts the returned SVG; preserves the previous SVG until the new render is ready
- [x] 2.4 Add the empty-state hint ("Start speaking — describe a diagram or a system you want to visualize.") shown when `code` is empty
- [x] 2.5 Add a delayed loading indicator that appears only when parse+render exceeds ~200ms; remove it as soon as the new SVG is mounted
- [x] 2.6 Mount `<DiagramCanvas>` in the placeholder slot from 1.2; pass it the current Mermaid source from page state (initially empty)
- [x] 2.7 Add the inline non-blocking error banner ("Invalid diagram syntax — asking the model to retry") that appears on parse failure and disappears on the next successful render
- [ ] 2.8 Verify in the browser using the dev-browser skill that valid code renders, invalid code keeps the previous render with the banner, the loading indicator only appears for slow renders, and no React error boundary is triggered

## 3. Diagram tools (`set_diagram`, `patch_diagram`)

- [x] 3.1 Define a shared `DiagramToolResult` type matching `{ ok: boolean, error?: string, mermaid_code: string, diagram_type?: string }`
- [x] 3.2 Implement an in-memory current-diagram store (React state or a small module-level store) that exposes `getCurrent()` and `commit(newCode)` and is the single source of truth for the canvas, the side panel, and the tools
- [x] 3.3 Implement the `set_diagram` handler: validate via `parseMermaid`; on success, commit, persist, and return `{ ok: true, mermaid_code, diagram_type }`; on failure, return `{ ok: false, error, mermaid_code: <previous> }`; on empty code, treat as panic reset (commit empty, clear `mermaid:last`)
- [x] 3.4 Implement the `patch_diagram` handler: count occurrences of `find` in current code; if !== 1, return `{ ok: false, error: "find substring matched <N> times, must be exactly 1", mermaid_code }`; otherwise apply replacement, validate, commit/persist on success, revert on parse failure
- [x] 3.5 Register both tools in the Realtime `session.update` payload with the exact English-language descriptions required by the `diagram-tools` spec, and the `diagram_type` enum from US-004
- [x] 3.6 Wire the data-channel `function_call` handler to dispatch to the two handlers and return their result back to the model with the uniform payload shape

## 4. System instructions and context injection

- [x] 4.1 Author the English diagram-architect system prompt covering: persona, list of supported diagram types, ambiguity rule (ask before generating), language rule (reply in user language, English in tool args, label-language continuity), tool-selection rule (prefer patch), panic-reset rule (multilingual phrases), conciseness rule (don't narrate code aloud)
- [x] 4.2 On Realtime session establishment, send a `session.update` whose `instructions` is the persona prompt with the current diagram appended in a `<current_diagram>` block — or the explicit "There is no diagram yet. Wait for the user to describe one." line if storage was empty on mount
- [x] 4.3 Confirm tool results from §3 always include the full current `mermaid_code`, so no further `session.update` is needed mid-session for context refresh
- [ ] 4.4 Manually exercise voice flows in the browser using the dev-browser skill: ambiguous request → model asks for type; small edit → model picks `patch_diagram`; restructure → model picks `set_diagram`; reset phrase in English and in another language → both produce panic reset; non-English speech → reply in same language with English tool arguments

## 5. Persistence

- [x] 5.1 Implement a `localStorage` helper module that wraps `getItem`/`setItem`/`removeItem` for keys `mermaid:last` and `ui:codePanel` in try/catch, returning safe defaults on failure
- [x] 5.2 In the diagram store's `commit`, write `mermaid:last` on successful change; on empty code (panic reset), call `removeItem("mermaid:last")`; surface a non-blocking warning toast if a write throws
- [x] 5.3 On app mount, before connecting the Realtime session, read `mermaid:last` and seed the diagram store; the canvas and side panel render the persisted diagram immediately
- [ ] 5.4 Verify in the browser using the dev-browser skill: create a diagram → reload → diagram is restored; panic reset → reload → empty state; quota-exceeded simulation → app does not crash

## 6. Code side panel and copy button

- [x] 6.1 Build a `<CodeSidePanel code={...} collapsed={...} onToggle={...} />` component with a code-block area (monospace, code-block background) showing the current source read-only
- [x] 6.2 Add a panel-edge collapse/expand toggle button visible at all times; collapsing expands the canvas to fill the freed horizontal space
- [x] 6.3 Persist panel state to `localStorage` key `ui:codePanel` (`"collapsed"` / `"expanded"`); restore on mount before first paint to avoid a layout flash
- [x] 6.4 Add a "Copy code" button in the panel header; on click, call `navigator.clipboard.writeText(currentCode)`; show transient "Copied!" label for ~2 seconds; disable the button when current code is empty
- [x] 6.5 Add the clipboard fallback path: on `writeText` rejection, programmatically select the panel's code text and surface a toast/banner instructing the user to press Cmd/Ctrl+C
- [ ] 6.6 Verify in the browser using the dev-browser skill: collapse/expand toggle persists across reload; copy works on success path; copy fallback works when clipboard is denied (test in an insecure context or by mocking the rejection)

## 7. Status indicator and connect/disconnect controls

- [x] 7.1 Replace any remaining template-era connect UI with a status pill that displays one of `disconnected`, `connecting`, `listening`, `model speaking`, `error` with appropriate color cues
- [x] 7.2 Add a start/stop button that creates / tears down the Realtime session; map session lifecycle events (peer-connection state, data-channel events, audio-output start/stop) to the indicator states
- [x] 7.3 Confirm the canvas and code panel work in read-only mode while disconnected, using the persisted diagram from §5
- [ ] 7.4 Verify in the browser using the dev-browser skill: start → connecting → listening; speak a turn → model speaking → listening; stop → disconnected; force a connection error → indicator shows `error` and start button retries

## 8. Final verification

- [x] 8.1 Run typecheck and lint on the full project; resolve any remaining issues
- [x] 8.2 Run `next build` end-to-end and confirm a clean build with no warnings about unreferenced solar-system assets or unused dependencies
- [ ] 8.3 Run an end-to-end smoke test in the browser using the dev-browser skill: create a non-trivial diagram entirely by voice (≥8 nodes), make small edits, copy the code, paste into the official Mermaid Live Editor, confirm it renders identically; reload the page and confirm restoration
- [ ] 8.4 Confirm against the success metrics from PRD §8: incremental edits land via `patch_diagram` ≥80% of the time during the smoke test; reload preserves the diagram; invalid-syntax cycles are recovered automatically by the model in ≤2 retries
