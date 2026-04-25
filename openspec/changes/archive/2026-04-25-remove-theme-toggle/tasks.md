## 1. Slim `lib/theme-pref.ts`

- [x] 1.1 Remove the `STORAGE_KEY` constant, the `ThemePref` type, the `THEME_PREFS` array, the `isThemePref` guard, and the `getThemePref` / `setThemePref` functions
- [x] 1.2 Replace `resolveScheme(pref: ThemePref)` with a no-arg `resolveScheme(): Scheme` that returns `"dark"` when `window.matchMedia("(prefers-color-scheme: dark)").matches`, otherwise `"light"` (and `"dark"` when `window` is undefined, matching prior SSR fallback)
- [x] 1.3 Rewrite `themeInitScript` so the inline body reads only `window.matchMedia("(prefers-color-scheme: dark)").matches` to set `document.documentElement.dataset.theme`, with the existing try/catch fallback to `"dark"` preserved
- [x] 1.4 Keep `Scheme` exported (still consumed by `lib/m3-theme.ts`)

## 2. Remove the toggle component

- [x] 2.1 Delete `components/theme-toggle.tsx`
- [x] 2.2 In `components/app.tsx`, remove the `import ThemeToggle from "@/components/theme-toggle"` line and the `<ThemeToggle />` JSX usage
- [x] 2.3 In `components/app.tsx`, update the `prefers-color-scheme` subscription so the listener calls `applyM3Theme(DEFAULT_SEED, resolveScheme())` (no `getThemePref()`); update the import from `@/lib/theme-pref` to drop `getThemePref`

## 3. Verify integrations still compile and behave

- [x] 3.1 Confirm `app/layout.tsx` still imports `themeInitScript` from `@/lib/theme-pref` and renders the inline `<script>` unchanged at the call-site level
- [x] 3.2 Confirm `lib/m3-theme.ts` still imports `Scheme` from `@/lib/theme-pref` and is otherwise unchanged
- [x] 3.3 Run `tsc --noEmit` (or `next build` / project type check) and resolve any leftover references to `ThemePref`, `getThemePref`, `setThemePref`, or `THEME_PREFS`

## 4. Manual verification

- [ ] 4.1 Fresh browser profile, OS in dark mode: load the app and confirm first paint is dark with `<html data-theme="dark">` and no toggle button visible
- [ ] 4.2 Fresh browser profile, OS in light mode: confirm first paint is light with `<html data-theme="light">`
- [ ] 4.3 Pre-set `localStorage.setItem("ui:theme", "light")` while OS is in dark mode: confirm the app still renders dark (stored preference is ignored) and no theme-toggle UI appears
- [ ] 4.4 With the app open, flip the OS appearance: confirm the rendered theme updates live without a reload
- [ ] 4.5 Confirm no console errors or unhandled exceptions during any of the above flows

## 5. Spec hygiene

- [x] 5.1 After implementation, archive the change with `openspec archive remove-theme-toggle` (or via `/opsx:archive`) so `specs/app-theme/spec.md` is promoted into `openspec/specs/app-theme/spec.md`
