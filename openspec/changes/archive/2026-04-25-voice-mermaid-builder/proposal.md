## Why

The `openai-realtime-solar-system` template demonstrates the OpenAI Realtime API by manipulating a 3D scene, but the same primitives (voice in, model-driven tool calls, visual output) map cleanly onto a much higher-utility experience: building Mermaid diagrams by voice. Diagrams are something users routinely want to draft and iterate on quickly — voice is faster than dragging shapes, and the model can hold the whole diagram in context and make targeted edits ("rename that node", "make the arrow dashed") instead of forcing the user to rewrite Mermaid by hand.

## What Changes

- **BREAKING**: Remove the Spline 3D scene integration (`@splinetool/react-spline`, `@splinetool/runtime`), the solar-system scene component, the charting stack used to render the legacy `display_data` tool output (`chart.js`, `react-chartjs-2`, `recharts`, `components/charts/*`, `lib/components-mapping.tsx`), the `app/api/iss/route.ts` endpoint, and all solar-system-specific tool definitions. The app pivots fully — the previous experience does not coexist.
- Replace the 3D canvas with a Mermaid diagram canvas that parses and renders inline SVG via the `mermaid` npm package, with parse-before-render validation, debounced re-render, and a delayed loading indicator.
- Replace the existing tool set with exactly two model-facing tools: `set_diagram` (full replace, with `diagram_type` parameter) and `patch_diagram` (uniqueness-checked find/replace).
- Rewrite the system instructions (in English) to define a diagram-architect persona, enumerate supported Mermaid types, set rules for tool selection, language handling, ambiguity prompting, and a multilingual "panic reset" path.
- Inject the current Mermaid code into model context on every tool result and on session start (after loading from `localStorage`).
- Persist the last diagram and the side-panel collapsed state in `localStorage`; restore on mount.
- Add a right-side collapsible panel showing the raw Mermaid code with a one-click copy button (with clipboard-API fallback).
- Add a connection-status indicator with states `disconnected`, `connecting`, `listening`, `model speaking`, `error`, plus a start/stop button. The diagram canvas and code panel remain functional (read-only) when disconnected.
- Tool descriptions, parameter descriptions, and system prompt remain in English regardless of the user's spoken language.

## Capabilities

### New Capabilities
- `mermaid-canvas`: Live Mermaid rendering on the main canvas, including validation, invalid-syntax recovery, debounced re-render, delayed loading indicator, and empty state.
- `diagram-tools`: The two-tool model contract (`set_diagram`, `patch_diagram`), their result-payload contract, system instructions for the diagram-architect persona, current-diagram context injection, and the multilingual panic-reset path.
- `diagram-persistence`: `localStorage`-backed save/restore of the current Mermaid diagram across reloads, including quota/private-browsing safety.
- `code-side-panel`: Right-side collapsible panel showing the Mermaid source, a "Copy code" button with clipboard fallback and transient confirmation, and persisted collapsed/expanded state.
- `voice-session`: Connect/disconnect lifecycle for the Realtime WebRTC session, the user-visible status indicator, and read-only behavior of the rest of the UI when disconnected.

### Modified Capabilities
<!-- None — `openspec/specs/` is empty; this is the project's first specced change. -->

## Impact

- **Code removal**: `components/scene.tsx` (Spline integration and tool dispatch), `components/scene.css`, `components/charts/chart.tsx`, `components/charts/pie-chart.tsx`, `lib/components-mapping.tsx`, `app/api/iss/route.ts`, and the solar-system tool definitions in `lib/config.ts` (`focus_planet`, `display_data`, `reset_camera`, `show_orbit`, `show_moons`, `get_iss_position`).
- **Dependencies**: Add `mermaid`. Remove `@splinetool/react-spline`, `@splinetool/runtime`, `chart.js`, `react-chartjs-2`, `recharts`, and any other solar-system-only packages no longer referenced after the cleanup.
- **Realtime session**: Keep the existing ephemeral-key endpoint and WebRTC connection scaffolding; rewrite `session.update` payload (instructions + tools) and replace tool-call handlers.
- **Persistence**: New `localStorage` keys `mermaid:last` and `ui:codePanel`.
- **UI shell**: Two-pane layout (canvas + collapsible side panel) plus status pill replaces the single 3D canvas.
- **Out of scope (non-goals)**: multi-diagram management, undo/redo, version history, collaborative editing, server-side persistence, manual code editing in the panel, image/PDF export, auth, mobile-specific layout.
- **Browser support**: Chromium and Safari are primary targets (WebRTC + Clipboard API); Firefox secondary.
