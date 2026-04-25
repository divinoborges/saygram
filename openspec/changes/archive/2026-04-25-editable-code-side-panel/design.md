## Context

`components/code-side-panel.tsx` currently renders the Mermaid source inside a `<pre>` element with `select-text` styling and a "Copy code" button. The panel subscribes to the diagram store via `useDiagramCode()` (which wraps `useSyncExternalStore`); whenever the store commits a new value, the panel re-renders. The store is also where `set_diagram` and `patch_diagram` tool calls land — they call `diagramStore.commit(newCode)` which validates persistence to `localStorage` (key `mermaid:last`) and notifies subscribers.

The canvas (`components/diagram-canvas.tsx`) takes `code` as a prop and runs a 50 ms-debounced `parseMermaid` → `renderMermaid` pipeline keyed on that prop, surfacing errors via the `parseError` banner and `renderError` state.

Everything needed for live editing is therefore already in place except an editable input. This design is small: swap the `<pre>` for a `<textarea>`, wire its `onChange` to `diagramStore.commit()`, and let the existing subscription/debounce/render path do the rest.

The asymmetry worth thinking through: the panel is *both* a sink (the agent writes via tool calls → store → panel) and a source (user types → store → canvas). Both directions go through `diagramStore.commit()`, so there is one source of truth. A loop between "user types → store update → panel re-render" must not clobber the user's caret position or in-progress text, which is the main UX risk this design has to address.

## Goals / Non-Goals

**Goals:**
- The user can type into the side panel and the canvas re-renders live.
- Tool-call updates from the voice agent continue to flow into the panel (the panel and the agent share the diagram store).
- Invalid intermediate states (mid-typing) do not erase the user's text. The textarea always shows the user's current characters; only the canvas reflects whether the source parses.
- Edits persist to `localStorage` under the existing `mermaid:last` key, with the existing `safeSetItem` failure path.
- Native browser undo/redo works inside the textarea.

**Non-Goals:**
- Mermaid syntax highlighting / autocomplete / linting in the panel.
- A custom undo stack on top of the textarea.
- Pushing manual edits into an active realtime session mid-stream — the agent only re-syncs at the next `session.update` (i.e., next session start).
- A diff/merge UI when the agent edits while the user is typing. Last writer wins; the textarea snaps to whatever the store last committed.
- Switching to Monaco / CodeMirror / any third-party editor.

## Decisions

### Decision: Plain controlled `<textarea>`, not a code-editor library

The panel's textarea is rendered with `value={code}` from `useDiagramCode()` and an `onChange` that calls `diagramStore.commit(e.target.value)`.

**Why over the alternative**: Mermaid is a small, line-oriented DSL and the panel is ~384 px wide. Users typing here are doing trivial edits (rename a node, fix a typo, add an arrow), not authoring 200-line graphs. A `<textarea>` ships with native selection, native undo/redo, native IME, native scroll, and zero bundle cost.

**Alternatives considered**:
- *Monaco Editor* — rejected. ~3 MB of JS, configuration sprawl, and we'd be adopting a heavyweight dependency for a feature whose entire spec fits in a paragraph.
- *CodeMirror 6* — rejected for the same reason. Lighter than Monaco but still pulls in a multi-package ecosystem and asks us to maintain a Mermaid grammar to get the features that justify the bundle.
- *Custom contenteditable div* — rejected. Reinvents textarea behavior badly (caret handling, paste, IME composition, undo all become bespoke problems).

### Decision: Commit on every keystroke (no debounce in the panel)

The textarea's `onChange` calls `diagramStore.commit(value)` synchronously. There is no debounce between keystroke and store commit.

**Why**:
1. The render pipeline in `diagram-canvas.tsx` is *already* debounced 50 ms (`DEBOUNCE_MS`). Adding a second debounce in the panel layers two timers and makes the canvas lag the textarea by `panelDebounce + canvasDebounce`, which feels unresponsive at the human-perception level.
2. `diagramStore.commit()` is cheap: it sets a string, calls `localStorage.setItem`, and notifies one subscriber set. Per-keystroke is fine.
3. Persistence on every keystroke is the *desired* behavior — if the user types, navigates away, and refreshes, they expect their last keystroke to be there.

**Alternatives considered**:
- *Debounce 100–300 ms before commit* — rejected. It saves nothing measurable on `commit` and introduces a window where the panel has typed text the store doesn't yet have, complicating reconciliation if the agent fires a tool call during that window.
- *Commit only on blur* — rejected. Defeats the entire premise ("edition se refletir instantaneamente no canvas").

### Decision: Parse failures don't clobber the textarea

Today, `set_diagram` rejects code that fails `parseMermaid` and the store does not commit. For *manual edits* we deliberately commit unconditionally — the user is allowed to be mid-keystroke. The canvas already handles "code present but unparseable" via its `parseError` / `renderError` paths, showing the existing amber banner ("Invalid diagram syntax — asking the model to retry").

The banner copy is currently agent-flavored ("asking the model to retry"). For manual edits this wording is misleading, but rewording it is a separate UX touch-up — out of scope for this change. We accept the temporary copy mismatch; if it becomes a complaint we'll change the banner text in a follow-up. (Note: the existing `parseError` is set by tool-call failures, not by manual edits. Manual edits surface only `renderError` from the canvas's own pipeline, whose banner does not auto-trigger an agent retry. So the user-visible banner during typing is the *render* error, which uses the same copy. Same fix lands in the same follow-up.)

**Why over the alternative**: If we required parse-success before commit, the user couldn't even insert a partial line — every intermediate keystroke between two valid states would be discarded. The textarea would feel broken.

### Decision: Tool-call updates overwrite the textarea via the existing subscription

Because the textarea is fully controlled by `code` from `useDiagramCode()`, when `set_diagram` or `patch_diagram` commits a new value the textarea's `value` changes on the next render — automatically. No extra wiring.

This means: if the user is mid-keystroke and the agent fires a tool call, the textarea snaps to the agent's version and the user's in-flight characters are lost. We accept this as the simple, predictable behavior. In practice tool calls fire after the agent finishes a response burst, not while the user is silently typing — the user is talking *to* the agent or typing *instead of* talking, rarely both.

**Alternatives considered**:
- *Lock the textarea while a tool call is in flight* — rejected. Adds state, blocks the user for a transient moment, and creates a more confusing experience than just letting the source-of-truth win.
- *Diff/merge agent edits with user buffer* — rejected. Massive complexity for a contention case the workflow doesn't actually create.

### Decision: Caret preservation is left to React's controlled-input behavior

When the textarea is controlled and the new `value` prop equals what the user just typed (the round-trip case: user types → onChange → commit → re-render → value=newCode), React preserves the caret naturally. We don't need a custom `selectionStart`/`selectionEnd` cache for the typing path.

The only path where the caret can jump is when the *agent* writes a different value. That is the same case as "tool-call updates overwrite the textarea" above; we accept the caret reset there because the content the user was looking at no longer exists.

**Alternatives considered**:
- *Save and restore caret across every render* — rejected as premature; React's controlled input handles the typing path on its own.

### Decision: Line numbers via a synced sibling `<pre>`, not a code-editor library

A sibling `<div>` rendered to the left of the textarea contains a `<pre>` whose content is `Array.from({length: N}, (_, i) => i+1).join("\n")`. Both the gutter `<pre>` and the textarea use the same `font` shorthand and the same monospace `font-family` override, so their line metrics match. The textarea's `onScroll` writes its `scrollTop` into the gutter container's `scrollTop`, keeping the visible numbers row-aligned with their source lines. The gutter container has `overflow: hidden` so horizontal scrolling in the textarea does not cause numbers to slide sideways; programmatic `scrollTop` writes still work despite `overflow: hidden`.

**Why over the alternative**: This is ~15 lines of code, no dependencies, and uses existing CSS variables for typography tokens. It does not pretend to be a real code editor — the gutter is decoration over a textarea, and the contract ("each newline is one row") is honored as long as we keep `white-space: pre` (no soft wrap).

**Alternatives considered**:
- *CodeMirror or Monaco for line numbers* — rejected for the reasons in the textarea decision above. Pulling in a code-editor library to draw a column of integers would be absurd.
- *Render line numbers inside an absolutely-positioned overlay using `transform: translateY(-scrollTop)` instead of native scroll* — works, but native `scrollTop` sync is simpler and free of compositor edge cases.
- *CSS `counter-increment` on each row* — rejected: a textarea has no "rows" in the DOM; the content is a single string. `counter-increment` doesn't apply.

### Decision: `white-space: pre` (no soft wrap), both scrollbars

The textarea renders with `white-space: pre` (Tailwind `whitespace-pre`) and `overflow: auto` (both axes). Long lines do not wrap; they extend off the right edge and produce a horizontal scrollbar. Vertical overflow produces a vertical scrollbar.

**Why**: Line numbers must be trustworthy. If a single 200-character source line wraps into three visual rows, the gutter's "line 5" no longer corresponds to the wrapped row labeled visually as "5" — the contract breaks. `white-space: pre` keeps newlines as the only thing that creates a new row, which is the only way the gutter stays honest.

**Alternatives considered**:
- *`white-space: pre-wrap` with virtual line numbers that account for wraps* — rejected; computing how a textarea soft-wraps a given string in a given width is platform-dependent (different across browsers, fonts, and zoom levels). Not worth chasing.
- *No horizontal scrollbar (visually hidden) but allow horizontal scroll via wheel/keyboard* — rejected as actively user-hostile when a wide line exists; the user has no affordance to know they can scroll.

### Decision: Resize via a thin handle on the left edge with pointer-capture

A 6 px-wide absolutely-positioned `<div role="separator">` overlays the panel's left edge with `cursor: col-resize`. On `pointerdown`, we call `setPointerCapture` on the handle so the drag continues even if the cursor leaves the handle's bounds (or the window). We attach `pointermove` / `pointerup` / `pointercancel` listeners to the handle itself — once captured, all subsequent pointer events for that pointer are routed there. Width is updated live via `panelWidthState.set(startWidth - dx)` (panel grows when the pointer moves left, since the panel is right-anchored). On release, we drop the listeners and clear the resizing flag.

The width is clamped to `[280, 800]` px inside `panelWidthState.set()`. 280 keeps the header buttons readable; 800 keeps the canvas usable on small viewports. We do NOT clamp against viewport width — if the user shrinks the window after sizing, the panel can be wider than the canvas, and that's fine (canvas just has less room).

**Why over the alternative**: Pointer-capture is the modern, cross-input gesture API and avoids the legacy `mousemove`-on-window dance. `localStorage`-backed width matches how `panelState` already persists collapsed/expanded — symmetric API, same hydration timing.

**Alternatives considered**:
- *CSS `resize: horizontal` on the aside* — rejected. Browser-native resize handles only appear on `<textarea>`/`<iframe>`/blocks that have `overflow` set, and they live in the bottom-right corner — not on the left edge of an element. We'd be fighting the platform.
- *A separate npm package (e.g. `react-resizable-panels`)* — rejected. Pulls in a multi-file dependency for ~30 lines of code we can write ourselves and own outright.
- *Event listeners on `window` instead of pointer-capture* — works on every browser but loses the pointer when the user crosses an iframe or a `pointer-events: none` overlay; pointer-capture handles those cases.

### Decision: Suppress the `transition-[right]` / `transition-[width]` during drag

Both the canvas wrapper (`right`) and the panel `<aside>` (`width`) carry a 200 ms ease-out transition for the collapse/expand animation. During a resize drag, we conditionally drop those transition classes (driven by the `isResizing` boolean from `panelWidthState`) so `style.right` / `style.width` updates land instantly. When the drag ends, the flag flips back, transitions re-attach, and the next collapse/expand animation runs smoothly again.

**Why**: With the transition active, every pointermove during a drag schedules a 200 ms tween; the canvas visibly lags the panel by a fraction of a second per frame, which feels rubbery. Removing the transition for the duration of the drag is the cheapest fix and matches what every real editor does.

### Decision: Empty-state hint moves out of the textarea

The current `<pre>` shows an italic placeholder "No diagram yet — speak to create one." when `code` is empty. A `<textarea>` cannot host JSX children for an empty state, but it has `placeholder=""` for exactly this purpose. We render the same string via `placeholder` and update the copy slightly to reflect that typing is now also a way in: `placeholder="No diagram yet — speak or start typing Mermaid…"`.

**Alternatives considered**:
- *Render an absolutely-positioned overlay div when empty* — rejected. `placeholder` exists. Use it.

### Decision: Disable autocomplete/spellcheck/autocorrect on the textarea

We set `spellCheck={false}`, `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="off"`, and `data-gramm="false"` (Grammarly opt-out). Mermaid identifiers and keywords are not English; spellcheck wavy lines under every node label are visual noise and Grammarly injects DOM that fights React.

## Risks / Trade-offs

- **[Risk] Per-keystroke `commit` writes to `localStorage` on every keystroke, which is a synchronous DOM call** → Mitigation: `localStorage.setItem` of a few-KB string is sub-millisecond on modern browsers; this is the same write path the agent has been using on every tool call without complaint. If a user types extremely fast on a degraded device and we see jank, add a 50–100 ms debounce *only on the persistence side* (move the `safeSetItem` call inside `commit` behind a `setTimeout` per key) — explicitly out of scope for now.
- **[Risk] User loses in-flight characters when the agent fires a tool call mid-typing** → Mitigation: Documented as accepted behavior. Rare in practice. If it bites a user, the textarea's native undo (`Cmd/Ctrl+Z`) restores their text — but the next render will overwrite it again. Not solvable without merging logic.
- **[Risk] Render error banner copy ("asking the model to retry") is misleading for manual edits** → Mitigation: Out of scope for this change. Tracked as a follow-up; the worst case is a slightly confusing banner during a transient invalid state.
- **[Trade-off] Plain textarea has no syntax highlighting** → Accepted. Users debugging tricky diagram syntax will still likely ask the agent to fix it; the textarea is for trivial edits.
- **[Trade-off] We don't surface parse errors *inline* in the panel (only via the canvas banner)** → Accepted for v1. If users find it ambiguous which line broke, we add a small error indicator under the textarea in a follow-up.
- **[Risk] Subpixel line-height drift between gutter `<pre>` and textarea on certain font stacks** → Mitigation: Both elements use the same `font` shorthand (`var(--md-sys-typescale-body-medium-font)`) and the same monospace `font-family` override, so metrics match. If a user reports drift on an unusual platform, set explicit `line-height: 1.5` on both elements as a follow-up; the wiring (synced `scrollTop`) is already correct.
- **[Risk] User shrinks the viewport after sizing the panel to 800 px and the canvas becomes a sliver** → Mitigation: The panel clamps to a hard 800 px max regardless of viewport, by design — the user can re-drag the handle inward. We could add a viewport-relative cap (`min(800, 70vw)`) in a follow-up if this becomes a real complaint; explicit out of scope for now to avoid mid-resize re-clamping that fights the user's pointer.
- **[Risk] `white-space: pre` plus very long lines produces a horizontal scrollbar that conflicts with the resize handle on the left edge** → Mitigation: The horizontal scrollbar appears at the bottom of the textarea, far from the left-edge handle. `pointer-events` defaults route the handle's drag correctly. Verified manually.

## Migration Plan

This is purely additive at the data layer (no schema change, no key change, no API change). Existing diagrams in `localStorage` continue to load as today; the only difference is the `<pre>` becomes a `<textarea>` rendering the same string. No rollback complexity — reverting the change restores read-only behavior with no data loss.
