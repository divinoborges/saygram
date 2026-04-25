# material-design-tokens Specification

## Purpose

Defines the Material Design 3 token surface (color, typography, shape, elevation, motion) generated from a seed and exposed as CSS custom properties, plus the user theme preference (system / light / dark) and its persistence.

## Requirements

### Requirement: M3 color tokens generated from a seed
The system SHALL generate the full Material Design 3 color token set (both light and dark schemes) from a single seed color using `@material/material-color-utilities`, and expose every resulting token as a CSS custom property under `:root` (light) or `:root[data-theme="dark"]` (dark). The seed color SHALL be a single configurable constant.

#### Scenario: Tokens are present at first paint
- **WHEN** the page loads
- **THEN** `getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary')` returns a non-empty color value, and the same is true for the full M3 color token surface (`--md-sys-color-on-primary`, `--md-sys-color-primary-container`, `--md-sys-color-on-primary-container`, `--md-sys-color-secondary` and its companions, `--md-sys-color-tertiary` and companions, `--md-sys-color-error` and companions, `--md-sys-color-surface`, `--md-sys-color-surface-container`, `--md-sys-color-surface-container-high`, `--md-sys-color-on-surface`, `--md-sys-color-on-surface-variant`, `--md-sys-color-outline`, `--md-sys-color-inverse-surface`, `--md-sys-color-inverse-on-surface`)

#### Scenario: Light/dark scheme switch
- **WHEN** the active theme is changed (system / light / dark) via the user preference
- **THEN** `data-theme` on `<html>` updates and every M3 color token resolves to its scheme-appropriate value with no page reload

### Requirement: M3 typography tokens
The system SHALL expose the full M3 typescale (display/headline/title/body/label × large/medium/small) as CSS custom properties consumable by components. The system SHALL load Roboto Flex (UI) and Roboto Mono (code) via `next/font/google` and bind them to the typescale tokens.

#### Scenario: Typescale tokens resolve
- **WHEN** a component reads `var(--md-sys-typescale-body-large-font)` (or any of the 15 typescale tokens)
- **THEN** the resolved value is a complete CSS `font` shorthand string referencing the Roboto Flex font family with the M3-spec size, weight, line-height, and letter-spacing for that style

#### Scenario: Roboto Mono available for code
- **WHEN** the code panel applies its mono typescale token
- **THEN** the rendered text uses Roboto Mono served by Next.js's font system (no FOUT / no external CDN call at runtime)

### Requirement: M3 shape, elevation, and motion tokens
The system SHALL expose M3 shape tokens (`--md-sys-shape-corner-{none,extra-small,small,medium,large,extra-large,full}`), elevation tokens (`--md-sys-elevation-level-{0..5}`), and motion tokens (duration `--md-sys-motion-duration-{short,medium,long,extra-long}-{1..4}` and easing `--md-sys-motion-easing-{linear,standard,emphasized,emphasized-decelerate,emphasized-accelerate}`).

#### Scenario: Shape token resolves
- **WHEN** a component sets `border-radius: var(--md-sys-shape-corner-medium);`
- **THEN** the corner radius matches the M3 baseline value (12px for corner-medium)

#### Scenario: Motion token resolves
- **WHEN** a component sets `transition: opacity var(--md-sys-motion-duration-medium-2) var(--md-sys-motion-easing-standard);`
- **THEN** the transition runs at the M3-spec duration and easing curve

### Requirement: User theme preference persists
The system SHALL allow the user to select among `system`, `light`, and `dark` themes; SHALL persist the choice in `localStorage` under the key `ui:theme`; and SHALL apply the saved choice before first paint on subsequent loads (no flash of the wrong theme).

#### Scenario: User selects dark
- **WHEN** the user picks `dark` from the theme control
- **THEN** `localStorage.setItem('ui:theme', 'dark')` is called and `data-theme="dark"` is set on `<html>` immediately

#### Scenario: Saved preference applied before paint
- **WHEN** the page loads with `localStorage` `ui:theme` set to `light`
- **THEN** `data-theme="light"` is set on `<html>` synchronously before the first React render, with no visible flash of the dark scheme

#### Scenario: System preference fallback
- **WHEN** `localStorage` has no `ui:theme` value and the user's OS preference is `prefers-color-scheme: dark`
- **THEN** the app renders in dark scheme; if the OS preference changes while the app is open, the scheme follows
