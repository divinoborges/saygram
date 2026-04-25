## Context

The app currently exposes a 3-state theme control (`system` / `light` / `dark`) implemented in `components/theme-toggle.tsx` and persisted in `localStorage` under `ui:theme` via helpers in `lib/theme-pref.ts`. On every change, `applyM3Theme(DEFAULT_SEED, resolveScheme(pref))` recomputes Material 3 design tokens and `data-theme` is written on `<html>`. A pre-paint inline script in `app/layout.tsx` reads the saved preference so the first frame already shows the correct scheme.

The product wants to drop this user-facing control. The chrome should look cleaner, and the theme should simply follow the OS color scheme — which is already what `prefers-color-scheme` resolution does when no preference is stored.

This is a small, single-module UI/storage change. The reason a design doc is warranted is the migration question: what happens to users who previously locked the app to `light` or `dark` and now have a stale `ui:theme` value in their browser?

## Goals / Non-Goals

**Goals:**
- Remove the visible toggle and all of its state machinery.
- Keep automatic OS color-scheme tracking (initial paint and live `prefers-color-scheme` changes).
- Leave the M3 theme application path (`applyM3Theme`) and the inline pre-paint script in place — only their inputs change.
- Keep the change surgical: no new dependencies, no refactor of `m3-theme.ts`, no UI redesign of surrounding controls.

**Non-Goals:**
- Adding a different theme control somewhere else (settings panel, command menu, etc.).
- Migrating or cleaning up legacy `ui:theme` localStorage values on existing users' machines.
- Re-theming, re-skinning, or changing the M3 seed color.
- Touching unrelated files in the `git status` working tree (diagram store, mermaid canvas, etc.).

## Decisions

### Decision 1: Always follow `prefers-color-scheme`; ignore any stored preference.

**Choice:** Drop the `ui:theme` localStorage key from both reads and writes. The pre-paint script and runtime resolver consult `window.matchMedia("(prefers-color-scheme: dark)")` only.

**Rationale:** This matches what users without a saved preference already get today, which is the most common case. It also keeps the change minimal — we are removing logic, not redirecting it. Honoring stale stored values would mean keeping `getThemePref` and the `ThemePref` union just to support a vestigial code path, defeating the cleanup.

**Alternatives considered:**
- *Migration: read once and clear.* Adds code that runs forever for a transient need. Rejected — the user accepts that locked-light/locked-dark users are returned to OS scheme.
- *Server-side or query-string override.* Out of scope; nobody asked for it.

### Decision 2: Keep `lib/theme-pref.ts` as the home of theme helpers, but slim it.

**Choice:** Keep the file (its imports are referenced from `app/layout.tsx`, `components/app.tsx`, and `lib/m3-theme.ts`), but reduce its public surface to:
- `type Scheme = "light" | "dark"` — still imported by `lib/m3-theme.ts`.
- `resolveScheme(): Scheme` — no-arg, reads `matchMedia` only.
- `themeInitScript: string` — same idea, but the inline body no longer reads `localStorage.getItem("ui:theme")`.

Remove: `ThemePref` type, `THEME_PREFS`, `isThemePref`, `getThemePref`, `setThemePref`, the `STORAGE_KEY` constant, and the `pref`-parameter form of `resolveScheme`.

**Rationale:** Smaller API, fewer call sites to keep in sync. Renaming the file (e.g. to `theme.ts`) was considered but rejected — touching every importer is churn for no behavior gain.

**Alternatives considered:**
- *Inline `resolveScheme`/`themeInitScript` directly in their callers.* Two callers (`layout.tsx`, `app.tsx`) plus the inline-script string makes a single helper module the right shape.
- *Delete the file.* Would force `m3-theme.ts` to redefine `Scheme`. Not worth it.

### Decision 3: Delete `components/theme-toggle.tsx` rather than leaving it unrendered.

**Choice:** Delete the file. Remove the JSX usage and import from `components/app.tsx`.

**Rationale:** Dead code, especially client components with their own state, is a maintenance trap. The `git status` shows the project is mid-refactor of other UI elements; leaving an orphan toggle component would invite confusion.

### Decision 4: Live OS-scheme subscription stays.

**Choice:** Keep the `matchMedia("(prefers-color-scheme: dark)")` change listener in `components/app.tsx` that calls `applyM3Theme(DEFAULT_SEED, resolveScheme(...))` whenever the OS scheme flips. Rewrite the listener to call the no-arg `resolveScheme()` (no `getThemePref()` lookup).

**Rationale:** Without this, switching macOS appearance during a session would not update the rendered theme, which would feel broken.

## Risks / Trade-offs

- **Risk:** A user who previously selected `light` or `dark` on a machine where their OS is the opposite scheme will see the app flip after this ships. → **Mitigation:** Acknowledge the breaking-UI line in `proposal.md`; no in-app migration. The behavior is consistent with "follow your OS" which is what most users expect.
- **Risk:** Stale `ui:theme` localStorage entries linger on user machines forever. → **Mitigation:** Harmless — nothing reads them after this change. Not worth a one-off cleanup script.
- **Trade-off:** Power users lose the ability to override the OS scheme. → Accepted — the product owner has decided the toggle is not pulling its weight.
- **Risk:** First-frame flash if the inline init script breaks. → **Mitigation:** The new script is strictly simpler than the old one (no JSON parsing, no validation branch); the existing try/catch fallback to `dark` is preserved.

## Migration Plan

1. Implement code removals (toggle component, helper functions, JSX usage, init-script body).
2. Verify in a fresh browser profile (no `ui:theme` set) that initial paint and live OS-scheme switching both work.
3. Verify in a profile with `localStorage.setItem("ui:theme", "light")` pre-set, on an OS in dark mode, that the app now resolves to dark (the stored value is ignored).
4. Ship. No rollback hook needed beyond `git revert` — there is no data migration to undo.

## Open Questions

None. The product decision is "remove the button, follow the OS." No remaining ambiguity.
