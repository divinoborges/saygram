## Why

The light/dark/auto theme toggle button adds UI complexity and a localStorage preference that the product no longer wants to expose. Removing it lets the app simply track the user's OS-level color-scheme preference, keeping the chrome cleaner and the theme behavior predictable.

## What Changes

- Remove the visible theme toggle button (`<ThemeToggle />`) from the app chrome.
- Delete the `components/theme-toggle.tsx` component.
- Drop the user-facing theme preference: no more cycling between `system` / `light` / `dark`, and no more `ui:theme` localStorage key.
- Keep automatic OS-driven color-scheme resolution: the app SHALL always follow `prefers-color-scheme` (and continue to react when it changes during a session).
- Simplify `lib/theme-pref.ts` to expose only what is still needed (the inline pre-paint init script and OS-scheme resolution helpers used by `app.tsx` to apply the M3 theme).
- **BREAKING (UI):** Users who previously locked the app to `light` or `dark` via the toggle will, after this change, see the app follow their OS scheme; their stored preference is ignored.

## Capabilities

### New Capabilities
- `app-theme`: How the app resolves and applies its M3 color scheme without any user-facing theme toggle — i.e., always tracking `prefers-color-scheme`, with a pre-paint init script setting `data-theme` on `<html>` and live updates when the OS scheme changes.

### Modified Capabilities
<!-- None. No existing capability spec covers the theme toggle behavior. -->

## Impact

- **UI:** Removes the theme toggle icon button from the layout next to the other top-bar controls in `components/app.tsx`.
- **Code:**
  - `components/app.tsx`: drop the `ThemeToggle` import and usage; the existing `prefers-color-scheme` subscription that calls `applyM3Theme` stays, but is rewritten to no longer read a stored preference.
  - `components/theme-toggle.tsx`: deleted.
  - `lib/theme-pref.ts`: remove `getThemePref`, `setThemePref`, `THEME_PREFS`, the `ThemePref` type, and the localStorage key; keep (or inline equivalents of) `Scheme`, `resolveScheme`-from-OS, and `themeInitScript` rewritten to consult only `matchMedia`.
  - `app/layout.tsx`: still injects the (now simpler) inline init script — no API change for the consumer.
- **Storage:** The `ui:theme` localStorage key is no longer read or written. Existing values are left in place but ignored (no migration / cleanup needed).
- **Dependencies:** None changed.
- **Specs:** Adds `openspec/specs/app-theme/spec.md`.
