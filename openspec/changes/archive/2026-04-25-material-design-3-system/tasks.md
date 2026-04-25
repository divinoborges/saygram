## 1. Foundation: dependencies and fonts

- [x] 1.1 Add `@material/web` and `@material/material-color-utilities` to `package.json`; reinstall lockfile (defer `lucide-react` removal to G10 so the build stays green between component migrations)
- [x] 1.2 In `app/layout.tsx`, replace `Geist` and `Geist_Mono` (`next/font/google`) with `Roboto_Flex` (UI) and `Roboto_Mono` (code), expose them as CSS variables `--font-roboto-flex` and `--font-roboto-mono` on `<body>`
- [x] 1.3 In `app/layout.tsx`'s `<head>`, add the Material Symbols variable-font stylesheet `<link>` (outlined style, weight 400, optical size 24)

## 2. Token surface

- [x] 2.1 Create `lib/m3-theme.ts` exporting `applyM3Theme(seed: number, scheme: "light" | "dark")` that uses `@material/material-color-utilities` `themeFromSourceColor()` and writes every color token of the chosen scheme to `:root` as `--md-sys-color-*` CSS custom properties (including derived surface-container tones from the neutral palette)
- [x] 2.2 Embed the M3 static tokens in `app/globals.css` `:root` (typescale, shape, elevation, motion) — these don't depend on the seed
- [x] 2.3 Create `lib/theme-pref.ts` with `getThemePref(): "system" | "light" | "dark"` and `setThemePref(v)` backed by `localStorage` key `ui:theme`; export a `resolveScheme(pref)` that returns `"light"` or `"dark"` based on `pref` and the OS `prefers-color-scheme`; export `themeInitScript` for use in layout's `<head>`
- [x] 2.4 In `app/layout.tsx`, emit a synchronous `<script>` in `<head>` (rendered from `themeInitScript`) that reads `localStorage` `ui:theme` and sets `document.documentElement.dataset.theme` before first paint to avoid scheme flash
- [x] 2.5 In `components/app.tsx`, call `applyM3Theme(DEFAULT_SEED, resolveScheme(getThemePref()))` on mount and re-apply when `prefers-color-scheme` changes

## 3. Web-component registration and base styling

- [x] 3.1 Create `lib/m3-elements.ts` that imports the `@material/web` definitions actually used (filled-tonal-button, filled-tonal-icon-button, icon-button, assist-chip, circular-progress, icon, ripple, elevation); imported once from `components/app.tsx`
- [x] 3.2 In `app/globals.css`, set body font/color/background from M3 tokens and add `html { color-scheme: light dark; }`
- [x] 3.3 In `app/globals.css`, add the `.material-symbols-outlined` rule with font-variation-settings; load the variable font via `@import url(...)`
- [x] 3.4 Lock down `tailwind.config.ts`: drop the legacy `background`/`foreground` color extensions; layout-only utility classes only

## 4. Component migration: status bar

- [x] 4.1 Replaced the custom div chip with `<md-assist-chip>` driven by per-state CSS-custom-property overrides (`--md-assist-chip-container-color` etc.) sourced from M3 semantic tokens
- [x] 4.2 Start/stop and mic toggles are `<md-filled-tonal-icon-button>` with Material Symbols (`play_arrow` / `stop` / `mic` / `mic_off`)
- [x] 4.3 `lucide-react` import gone from `status-bar.tsx`; only layout Tailwind classes remain
- [x] 4.4 Click handlers wire via React's `onClick` — React 19 forwards to custom elements

## 5. Component migration: code side panel

- [x] 5.1 Panel-edge chevron now uses `<md-icon-button>` + Material Symbols
- [x] 5.2 "Copy code" is `<md-filled-tonal-button>` with `content_copy` → `check` slot swap and "Copy code" → "Copied!" label flash
- [x] 5.3 Header label, code textarea, and panel surface bound to M3 tokens (typescale, surface-container, on-surface, outline-variant)
- [x] 5.4 Clipboard fallback toast unchanged in API; rendering will switch to M3 snackbar in G7

## 6. Component migration: diagram canvas, viewport controls, empty state, error banner, spinner

- [x] 6.1 Empty state shows an `auto_awesome` Material Symbol above body-large text on `on-surface-variant`
- [x] 6.2 Loading overlay uses `<md-circular-progress indeterminate>` on a token-derived translucent surface
- [x] 6.3 Parse-error banner is an M3 error tonal surface with `error` Material Symbol leading icon
- [x] 6.4 Viewport zoom controls are three `<md-icon-button>`s (`add`, `remove`, `fit_screen`) inside a surface-container row with corner-large radius

## 7. Toast → snackbar host migration

- [x] 7.1 Rebuilt `components/toast-host.tsx` as an M3-token-styled snackbar (since `@material/web` doesn't ship `<md-snackbar>` — the spec was satisfied by a token-driven custom element matching M3 visual rules). `kind` → M3 semantic color mapping: `info → inverse-surface/inverse-on-surface`, `warning → secondary-container/on-secondary-container`, `error → error-container/on-error-container`
- [x] 7.2 `lib/toast.ts` API unchanged; auto-dismiss timing 4 s short / 7 s for long messages (>50 chars)
- [x] 7.3 The host wraps with `role="status" aria-live="polite"` so screen readers announce

## 8. Logs panel

- [x] 8.1 Surface uses `--md-sys-color-surface-container-high`; entries on body-small + Roboto Mono; title uses title-medium typescale
- [x] 8.2 Close button is `<md-icon-button>` + `close` Material Symbol
- [x] 8.3 Open-trigger is `<md-icon-button>` + `code` Material Symbol

## 9. Theme preference UI (small)

- [x] 9.1 Built `components/theme-toggle.tsx` — `<md-icon-button>` cycling system → light → dark with `brightness_auto` / `light_mode` / `dark_mode` Material Symbols. Mounted in app top-right.
- [x] 9.2 Cycle handler calls `applyM3Theme(DEFAULT_SEED, resolveScheme(next))` and persists via `setThemePref`, which also updates `<html data-theme>` through `applyM3Theme`.

## 10. Tailwind cleanup and final verification

- [x] 10.1 Swept components for non-layout Tailwind utilities; only one residual `rounded-full` on the status pulse dot was replaced with `borderRadius: var(--md-sys-shape-corner-full)` inline style
- [x] 10.2 No `from "lucide-react"` matches in components/lib/app
- [x] 10.3 `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean (build: 319 kB first-load JS, +53 kB vs pre-M3)
- [ ] 10.4 Verify in the browser using `npm run dev`: page renders in dark scheme by default; status chip cycles through tokens correctly across `disconnected → connecting → listening → model_speaking → error`; copy button shows the M3 ripple and "Copied!" swap; clipboard-denied path shows a warning M3 snackbar; theme toggle switches `light`/`dark`/`system` without flash; reload preserves the selected theme; the diagram canvas, panel, viewport controls, logs, and snackbars all use Material Symbols with no `lucide-react` SVG anywhere; the empty-state hint shows a Material Symbol above the body-large text
