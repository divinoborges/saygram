## Why

The app's current visual language is ad-hoc Tailwind utility classes plus `lucide-react` icons — coherent enough to ship, but it doesn't read as a "designed" product. The user wants the entire experience to follow Google's Material Design 3 system end to end, drawing from the canonical reference at https://m3.material.io: M3 color tokens (HCT palettes from a seed color), M3 typography scale (display/headline/title/body/label) on Roboto Flex, Material Symbols icons, M3 components (filled buttons, icon buttons, chips, snackbars, progress indicators, top app bars), elevation, and motion. The product is small and recently restructured, so there will never be a cheaper time to align it with a real design system.

## What Changes

- **BREAKING (visual)**: Adopt the Material Design 3 design system across the entire UI. Every visible chrome element changes appearance; layout structure stays the same.
- Add `@material/web` (Google's official M3 web components) as the component library, plus `@material/material-color-utilities` for generating the M3 token palette from a seed color.
- Replace `lucide-react` icons with **Material Symbols** (variable font, outlined style by default) and remove `lucide-react` from dependencies.
- Replace the Geist + Geist Mono fonts in `app/layout.tsx` with **Roboto Flex** (UI) + **Roboto Mono** (code panel), loaded via `next/font/google`.
- Generate M3 color tokens (light + dark schemes) at build/load time from a configurable seed color (default: M3 baseline indigo `#6750A4`) and expose the entire token set as CSS custom properties on `:root`. Components consume tokens by name (`var(--md-sys-color-primary)`, `var(--md-sys-typescale-body-large-font)`, etc.).
- Pick **dark scheme as the default** (matches current product feel) and add a small "system / light / dark" preference that persists to `localStorage`.
- Migrate every existing component to M3 equivalents:
  - `<StatusBar>` cluster → M3 assist chip (status) + filled tonal icon buttons (start/stop, mic), with semantic color tokens for each session state (primary, tertiary, error).
  - `<CodeSidePanel>` → M3 surface-container background, M3 icon button for the collapse chevron, M3 filled-tonal button + Material Symbol for "Copy code", typescale tokens for the panel header and code body.
  - `<DiagramCanvas>` empty state → M3 typescale + supporting outlined Material Symbol; loading spinner → M3 circular `<md-circular-progress>`; inline error banner → M3 error-color surface.
  - `<ViewportControls>` (zoom/fit cluster) → M3 segmented icon button group on a tonal surface.
  - `<Logs>` panel → M3 navigation drawer pattern with surface elevation, M3 icon button toggle.
  - `<ToastHost>` → M3 `<md-snackbar>` (or equivalent) with single-line and two-line variants, M3 motion timings for enter/exit, error/warning/info colour mapping to error/secondary/inverse-surface tokens.
- Establish **shape, elevation, and motion token files** (`md.sys.shape.*`, `md.sys.elevation.*`, `md.sys.motion.*`) with the M3 baseline values; components use them rather than hard-coded radii/shadows/durations.
- Keep Tailwind for layout primitives only (flex, grid, sizing, positioning, gap). Visual tokens (color, typography, radius, shadow, motion) come exclusively from M3 CSS variables — Tailwind utility classes for those properties get removed.

## Capabilities

### New Capabilities
- `material-design-tokens`: The M3 token surface — CSS custom properties for color (light + dark), typography, shape, elevation, motion — the source of truth all components must consume.
- `material-design-components`: The component-level contract — which M3 component each existing UI element maps to, plus semantic-color and typescale rules for state mapping (status pill colors, error banners, snackbar variants).

### Modified Capabilities
- `code-side-panel`: visual chrome migrates to M3 (surface tokens, icon-button toggle, M3 button for "Copy code", Material Symbols icons, M3 typescale on header and code).
- `voice-session`: status indicator uses an M3 assist chip; start/stop and mic toggle become M3 filled-tonal icon buttons with Material Symbols glyphs; status-state-to-color mapping uses M3 semantic tokens (primary, tertiary, error).
- `mermaid-canvas`: the empty-state hint uses an M3 typescale token + outlined Material Symbol; the delayed loading spinner becomes an `<md-circular-progress>`; the inline syntax-error banner becomes an M3 error-tonal surface.

## Impact

- **Code touched**: every component file (`components/*.tsx`), `app/layout.tsx` (fonts), `app/globals.css` (token CSS variables, removal of ad-hoc Tailwind color/typography utilities in components), `tailwind.config.ts` (lock down to layout-only utility classes; expose M3 tokens to Tailwind only if needed for layout-adjacent styling).
- **New files**: `lib/m3-theme.ts` (seed-color → palette generator + scheme application), `app/tokens.css` (or inlined into globals) with the generated token variables, possibly a `lib/m3-elements.ts` to register `@material/web` custom elements once on client.
- **Dependencies**:
  - **Add**: `@material/web`, `@material/material-color-utilities`.
  - **Remove**: `lucide-react`, possibly `tailwind-merge` if no longer used.
  - **Fonts**: switch `next/font/google` from Geist/Geist_Mono to Roboto Flex + Roboto Mono. Add Material Symbols (variable font, served as a CSS link or via `next/font` helper).
- **Behavioral**: no behavior changes. Status states, panel collapse, copy fallback, panic reset, persistence, tool dispatch — all unchanged. This is a chrome-only migration.
- **Bundle**: `@material/web` is tree-shakeable per component; expect a moderate increase. Material Symbols variable font adds ~100–200 kB initial weight (cacheable). Net visual upgrade is worth it.
- **Out of scope**: a brand-bespoke seed color (we ship with M3 baseline indigo, the seed is a one-line change for later); custom typography overrides (we use Roboto Flex's defaults per the M3 spec); animated theme-transition; mobile-specific layout (still desktop-first per the parent product non-goals).
- **Coordination**: the in-flight `add-diagram-pan-zoom` and `shift-scroll-horizontal-pan` changes will need to use M3 tokens for any new chrome they introduce. Whichever lands first establishes the baseline; the second rebases against it.
