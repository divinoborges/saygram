## Context

The project is a Next.js 15 + React 19 app using Tailwind 3 utility classes for styling and `lucide-react` for icons. There is no design system today — colors, radii, and typography are picked ad-hoc per component. The user wants a wholesale migration to Material Design 3 (https://m3.material.io), end to end: tokens, typography, icons, components, motion. The product is small (eight components) and recently restructured, so a full rewrite of the visual layer is feasible in a single change rather than a phased rollout.

The Realtime / WebRTC layer, the diagram store, the tool dispatch, and the persistence helpers are unaffected by this change — it is chrome-only.

## Goals / Non-Goals

**Goals:**
- Every visible chrome element follows M3: color tokens (HCT-derived), typography scale (Roboto Flex), shape, elevation, motion, components, icons.
- A seed color drives the entire palette, so re-skinning to a brand color in the future is one constant.
- Token-first: components consume `var(--md-sys-*)` variables, not hard-coded values.
- Tailwind survives but is restricted to layout primitives (flex, grid, gap, sizing, positioning). Visual properties (color, typography, radius, shadow) come from tokens.
- Light + dark schemes both ship; user preference persists.

**Non-Goals:**
- Custom-bespoke brand color or typography overrides — ship with M3 baseline indigo and Roboto Flex defaults.
- Animated theme transitions, fancy color-emphasis customization, or M3 expressive variants.
- Replacing the Mermaid SVG output's own coloring (Mermaid's diagrams render with their own theme — out of scope; future work could thread our token palette into Mermaid's `themeVariables`).
- Migrating the rendered Mermaid SVG to M3 surface treatments (white-on-light is fine for diagrams).
- Mobile layout overhaul.

## Decisions

### D1. Component library: `@material/web` (Google's official M3 web components)

Use `@material/web` — Google's canonical implementation of M3 as web components. React 19 has native custom-element support, so `<md-filled-button>`, `<md-icon-button>`, `<md-assist-chip>`, `<md-circular-progress>`, `<md-snackbar>`, etc. drop into JSX directly. Events fire as DOM `CustomEvent`s and React 19 forwards `on*` props to them.

**Alternatives considered:**
- **MUI v6** — more polished React DX, but its M3 support is partial (still primarily Material 2 with M3 expressive theming layered on). Doesn't ship M3 chip/snackbar variants identically. The user explicitly cited m3.material.io, so fidelity matters.
- **Custom CSS-only with M3 tokens** — feasible for a small product but reinvents accessibility, focus rings, ripple, and motion that `@material/web` ships for free.
- **Community React M3 libraries** — quality varies; none are official. Risk of abandonment.

`@material/web` is the closest to "Material Design from Google".

### D2. Color: HCT palette generated from a seed via `@material/material-color-utilities`

At app load (or build time, baked into a CSS file), call `themeFromSourceColor(0xff6750A4)` (M3 baseline indigo) to produce a `Theme` containing both `light` and `dark` `Scheme`s. Iterate the scheme's keys and write each as a CSS custom property under `:root` (light) and `:root[data-theme="dark"]` (dark): e.g. `--md-sys-color-primary: #6750a4` etc. The full M3 color token set (~30 properties × 2 schemes) lands in `app/globals.css` (generated) or inlined via a Next.js `<script>` runtime call — runtime keeps the seed editable without a rebuild.

Default scheme: `dark`. A small toggle (system / light / dark) writes `data-theme` on `<html>` and persists the preference to `localStorage` under `ui:theme`.

**Why a seed not a static palette:** future re-skin is one number. Today's palette is just `0xff6750A4`. Material color utilities is ~10 kB and runs once at boot.

### D3. Typography: Roboto Flex (UI) + Roboto Mono (code), variable fonts via `next/font/google`

Replace Geist and Geist_Mono in `app/layout.tsx` with Roboto Flex (UI) and Roboto Mono (panel code block). Both come from `next/font/google` so they're self-hosted and CLS-safe. Expose CSS variables `--font-roboto-flex` and `--font-roboto-mono`, then map M3 typescale tokens (`--md-sys-typescale-display-large-font`, etc.) onto them per the spec.

The full M3 typescale (display/headline/title/body/label × large/medium/small = 15 styles) is exposed as CSS variables for components to reference. Components don't write `font-size: ...` directly; they reference the appropriate typescale token via `font: var(--md-sys-typescale-body-large-font);` (a single shorthand the M3 utilities helper produces).

### D4. Icons: Material Symbols (variable font)

Replace `lucide-react` with Material Symbols served as a Google-fonts variable font. Two options:

- **Option A (chosen):** ship the variable font via `<link>` in `app/layout.tsx` and use `<span class="material-symbols-outlined">play_arrow</span>` in JSX. Simplest, smallest cognitive overhead.
- Option B: per-icon SVG components from `react-material-symbols`. Adds a dep and ergonomics for tree-shaking; not worth it for the few icons we use.

Default style: **outlined**. We use weight 400, optical size 24 by default, with M3 sizing scaling from there. About 8 icons across the whole app (play, stop, mic, mic_off, content_copy, check, chevron_right, chevron_left, code, error, warning) — variable-font payload is acceptable.

### D5. Component mapping

A single mapping table drives the migration. Every existing component element gets one M3 equivalent:

| Existing | M3 element | Notes |
| --- | --- | --- |
| status pill (custom div) | `<md-assist-chip>` with leading icon | Color drawn from semantic tokens per state (D6) |
| start/stop button | `<md-filled-tonal-icon-button>` | `play_arrow` / `stop` Material Symbol |
| mic toggle | `<md-filled-tonal-icon-button>` (toggle variant) | `mic` / `mic_off` |
| panel collapse chevron | `<md-icon-button>` | `chevron_right` / `chevron_left` |
| "Copy code" | `<md-filled-tonal-button>` with leading icon | `content_copy` → `check` on success |
| panel header label | `font: var(--md-sys-typescale-label-large-font);` | replaces ad-hoc text-xs uppercase |
| code block | `font-family: var(--font-roboto-mono); color: var(--md-sys-color-on-surface);` | typescale-body-medium for line-height |
| empty-state hint | typescale-body-large + Material Symbol | outlined `auto_awesome` glyph above text |
| loading spinner | `<md-circular-progress indeterminate>` | replaces tailwind-spun border |
| inline parse error banner | M3 error tonal surface (`color: var(--md-sys-color-on-error-container); background: var(--md-sys-color-error-container);`) | rounded shape token (`--md-sys-shape-corner-medium`) |
| viewport zoom cluster | `<md-icon-button>` ×3 inside an M3 surface-container with shape-corner-large | preserves layout |
| toast-host | `<md-snackbar>` | semantic mapping in D7 |
| logs panel | M3 navigation drawer surface, M3 icon-button toggle | keep functional behavior |

### D6. Status state → semantic color mapping

The five session states map to M3 semantic tokens:

| State | Chip container | Dot / label color | Reason |
| --- | --- | --- | --- |
| `disconnected` | `surface-container-high` | `on-surface-variant` | neutral, low emphasis |
| `connecting` | `tertiary-container` | `on-tertiary-container` | M3 tertiary for transitional/processing |
| `listening` | `primary-container` | `on-primary-container` | active state, primary brand |
| `model_speaking` | `secondary-container` | `on-secondary-container` | active but distinct from listening |
| `error` | `error-container` | `on-error-container` | M3 error semantic |

Animations on the dot (pulse for connecting/model_speaking) use `--md-sys-motion-easing-emphasized` with `--md-sys-motion-duration-medium`.

### D7. Toast → snackbar mapping

`toast.emit(message, kind)` maps to M3 snackbar:

| `kind` | Snackbar variant | Color |
| --- | --- | --- |
| `info` | default | `inverse-surface` / `inverse-on-surface` |
| `warning` | default | `secondary-container` / `on-secondary-container` |
| `error` | default | `error-container` / `on-error-container` |

Snackbars stack bottom-end (the current `ToastHost` placement). Auto-dismiss timing follows M3: 4 s for short, 7 s for longer messages. We keep the existing 4 s default since current toasts are short.

### D8. Tailwind: layout-only

After migration, components retain Tailwind utility classes only for `flex`, `grid`, `gap-*`, `size-*`, `w-*`, `h-*`, `min-*`, `max-*`, `relative`/`absolute`/`fixed`, `top-*`/`right-*`/`bottom-*`/`left-*`, `inset-*`, `z-*`, `overflow-*`, `transition-*` (when not coverable by motion tokens). Color (`text-*`, `bg-*`), typography (`text-xs`, `font-mono`, `font-bold`), and radius/shadow (`rounded-*`, `shadow-*`) classes get removed in favor of M3 tokens.

`tailwind.config.ts` does not need to embed the M3 palette — components reference tokens directly by CSS variable. (A future iteration can add Tailwind plugin `@material/material-color-utilities`-style utilities, but it's not required.)

### D9. SSR / hydration

`@material/web` web components are client-only (they rely on `customElements.define`). To avoid hydration mismatches:

- A new `lib/m3-elements.ts` module imports the specific component definitions we use (filled-button, icon-button, chip, snackbar, circular-progress) and is imported once from a `"use client"` boundary at the App root.
- The theme-initialization script (D2) runs in a `<script>` tag emitted from `app/layout.tsx` so the `data-theme` attribute is set before first paint, avoiding light → dark flash.
- Material Symbols `<link>` lives in `app/layout.tsx`'s `<head>` so the icon font is loaded before any component that uses it.

## Risks / Trade-offs

- **Web components in React 19** → Mitigation: React 19 has native custom-element support including event forwarding via `on*` props. Tested patterns exist; if a component (e.g. `<md-snackbar>`) doesn't expose what we need imperatively-cleanly, we wrap it in a small React adapter. Fallback: switch a single problem component to MUI's M3 equivalent, retaining `@material/web` everywhere else.
- **In-flight changes (`add-diagram-pan-zoom`, `shift-scroll-horizontal-pan`)** → Mitigation: this change explicitly does not block on them. Whichever lands first establishes the visual baseline; this proposal's `tasks.md` includes a note to coordinate with whatever set of components exists in `main` at apply time, including any new chrome those changes added.
- **Mermaid SVG visual mismatch** → Mitigation: out of scope (see Non-Goals). A follow-up can pass `themeVariables: {primaryColor: 'var(--md-sys-color-primary)', ...}` to `mermaid.initialize()`.
- **Bundle weight from `@material/web` + Material Symbols** → Mitigation: import only the components we use; `@material/web` is tree-shakeable. Material Symbols variable font is one ~140 kB file, cached on first load. Acceptable trade for design coherence.
- **Token fidelity drift** → Mitigation: the seed-to-palette generator is sourced once at boot; tokens regenerate deterministically. We never hand-edit a generated token — all overrides go through the seed.
- **Light/dark scheme flashes on first paint** → Mitigation: the theme-init script runs synchronously before React hydration, setting `data-theme` from `localStorage` (or `prefers-color-scheme`) before paint. No `useEffect`-based scheme application.

## Migration Plan

This is a chrome-only change, no data or schema migration. The rollout order in `tasks.md` is bottom-up: tokens first, then typography & icons, then components one at a time, then the Tailwind cleanup. Each task should leave the build green so we can land in any order if interrupted. If reverted, `git revert` restores the prior visual layer; no state is lost.
