# material-design-components Specification

## Purpose

Defines that all UI chrome is implemented with Material Design 3 components, that all icons use the Material Symbols variable font, that components consume M3 tokens (no hard-coded visual values), and the M3 semantic color mappings for the session status chip and the toast/snackbar surfaces.

## Requirements

### Requirement: All UI chrome uses Material Design 3 components
Every interactive control and surface element in the visible UI SHALL be implemented with `@material/web` Material Design 3 components (or, where a 1:1 component is unavailable, a token-styled element that follows the M3 visual specification). Hand-rolled buttons, chips, and snackbars SHALL NOT remain in the codebase after this change.

#### Scenario: No legacy lucide-react icons remain
- **WHEN** the codebase is scanned for imports
- **THEN** no file imports from `lucide-react`, and `lucide-react` is not listed as a dependency in `package.json`

#### Scenario: Buttons are M3 components
- **WHEN** the user inspects any clickable control (start/stop, mic, copy, panel toggle, viewport zoom, etc.)
- **THEN** the rendered DOM element is an `<md-*-button>` or `<md-*-icon-button>` web component, not a plain `<button>` styled with Tailwind utilities

### Requirement: Material Symbols for all icons
The system SHALL use the Material Symbols variable font (outlined style by default) for every icon glyph in the UI.

#### Scenario: Icon glyphs use Material Symbols
- **WHEN** any icon is rendered
- **THEN** the glyph comes from a `<md-icon>` element (or equivalent) backed by the Material Symbols font, not from a `lucide-react` component or a hand-authored SVG

### Requirement: Components consume M3 tokens, not hard-coded values
Visual properties (color, typography, radius, shadow, motion duration/easing) SHALL be expressed as references to CSS custom properties from the M3 token surface (`var(--md-sys-color-*)`, `var(--md-sys-typescale-*)`, `var(--md-sys-shape-*)`, `var(--md-sys-elevation-*)`, `var(--md-sys-motion-*)`). Components SHALL NOT hard-code colors, font sizes, border radii, shadows, or transition durations.

#### Scenario: Component refers to color tokens
- **WHEN** a developer reads any component file under `components/`
- **THEN** color, typography, radius, shadow, and motion values are written as `var(--md-sys-*)` references; ad-hoc Tailwind utility classes for those properties (`text-slate-*`, `bg-slate-*`, `rounded-full`, `shadow-lg`, `text-xs`, `font-mono`, etc.) are absent

#### Scenario: Tailwind utility classes are layout-only
- **WHEN** a developer reads any component file's `className`
- **THEN** the Tailwind utility classes used belong only to layout categories (`flex`, `grid`, `gap-*`, `size-*`, `w-*`, `h-*`, `min-*`, `max-*`, `relative`/`absolute`/`fixed`, `top-*`/`right-*`/`bottom-*`/`left-*`, `inset-*`, `z-*`, `overflow-*`, `transition-*` modifiers, and similar layout primitives)

### Requirement: Status chip color mapping by session state
The session status chip SHALL map each of the five session states to M3 semantic color tokens per the design's mapping table: `disconnected → surface-container-high / on-surface-variant`, `connecting → tertiary-container / on-tertiary-container`, `listening → primary-container / on-primary-container`, `model_speaking → secondary-container / on-secondary-container`, `error → error-container / on-error-container`.

#### Scenario: Listening state
- **WHEN** the session state is `listening`
- **THEN** the chip's container background resolves from `--md-sys-color-primary-container` and its label/dot color from `--md-sys-color-on-primary-container`

#### Scenario: Error state
- **WHEN** the session state is `error`
- **THEN** the chip's container resolves from `--md-sys-color-error-container` and its label/dot color from `--md-sys-color-on-error-container`

### Requirement: Toast → snackbar mapping
The toast system SHALL render via M3 snackbar surfaces with `kind` mapping: `info → inverse-surface / inverse-on-surface`, `warning → secondary-container / on-secondary-container`, `error → error-container / on-error-container`. Snackbars SHALL stack at the bottom-end of the viewport and auto-dismiss per M3 timings.

#### Scenario: Warning toast
- **WHEN** `toast.emit("...", "warning")` is called
- **THEN** an M3 snackbar appears at bottom-end with secondary-container/on-secondary-container coloring and dismisses automatically after the configured duration

#### Scenario: Error toast
- **WHEN** `toast.emit("...", "error")` is called
- **THEN** an M3 snackbar appears with error-container/on-error-container coloring
