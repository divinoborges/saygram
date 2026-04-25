# diagram-export Specification

## Purpose
TBD - created by archiving change add-diagram-export. Update Purpose after archive.
## Requirements
### Requirement: Export trigger on the diagram canvas
The system SHALL render an export trigger control on the diagram canvas, positioned adjacent to the existing viewport controls toolbar but as a visually separate control group with a clear gap between the two groups so the trigger does not appear bundled with the navigation controls.

#### Scenario: Trigger is visible when canvas is shown
- **WHEN** the diagram canvas is mounted and the viewport controls (zoom in / zoom out / fit) are visible
- **THEN** an export trigger control is also visible, sharing the same visual style as the viewport controls (surface, shape, elevation), but rendered as a separate group with a visible gap between it and the viewport controls cluster

#### Scenario: Trigger does not move when zooming or panning
- **WHEN** the user pans or zooms the diagram
- **THEN** the export trigger control stays fixed in its on-canvas position alongside the viewport controls; it does not pan or zoom with the diagram content

### Requirement: Format selection menu
The system SHALL open a menu when the export trigger is activated, offering exactly three formats: SVG, PNG, and PDF. Selecting an item starts the corresponding export and closes the menu.

#### Scenario: Open menu by click
- **WHEN** the user clicks (or activates via keyboard) the export trigger and there is a valid current render
- **THEN** a menu opens anchored to the trigger, listing three items in this order: SVG, PNG, PDF

#### Scenario: Keyboard navigation
- **WHEN** the menu is open and the user presses Up/Down arrows
- **THEN** focus moves between the three items; pressing Enter or Space activates the focused item; pressing Escape closes the menu and returns focus to the trigger

#### Scenario: Click outside dismisses
- **WHEN** the menu is open and the user clicks outside it
- **THEN** the menu closes without starting an export

### Requirement: Disabled state when no valid render exists
The system SHALL disable the export trigger whenever there is no valid rendered diagram on the canvas (empty Mermaid source, or a parse error has occurred and there is no prior valid render to fall back to).

#### Scenario: Empty source disables export
- **WHEN** the current Mermaid source is empty and the canvas is showing the empty-state hint
- **THEN** the export trigger is rendered in a disabled state, is not focusable for activation, exposes `aria-disabled="true"`, and a tooltip on hover or focus reads something like "Render a diagram first"

#### Scenario: Parse error with no prior render keeps disabled
- **WHEN** the very first Mermaid source produced by the model fails `mermaid.parse` and no prior valid render exists
- **THEN** the export trigger remains disabled

#### Scenario: Parse error with prior valid render keeps export enabled
- **WHEN** a candidate Mermaid source fails to parse but a previous valid render is still visible on the canvas
- **THEN** the export trigger remains enabled and exports the still-visible previous valid render

### Requirement: SVG export
The system SHALL, when the user selects SVG, download the currently rendered diagram as a single `.svg` file containing the serialized SVG of the live canvas render. The exported SVG MUST be self-contained — it MUST NOT depend on stylesheets external to the file for its rendered appearance, including for fonts, fills, and strokes on text and shape elements.

#### Scenario: SVG download contains the current render
- **WHEN** the user activates the SVG menu item with a valid render present
- **THEN** the browser downloads a file whose contents, when opened in a browser or vector editor, visually match what was on the canvas at the moment of click (same nodes, edges, labels, colors)

#### Scenario: SVG renders correctly without the app's CSS
- **WHEN** the downloaded `.svg` is opened in a context that does not include the application's stylesheet (e.g. directly in a browser tab or imported into a vector editor)
- **THEN** text labels render with the same font family and size as on the canvas, and shapes retain their fill and stroke

### Requirement: PNG export
The system SHALL, when the user selects PNG, download the currently rendered diagram as a single `.png` file rasterized at 2× the diagram's natural pixel dimensions, with a transparent background.

#### Scenario: PNG download is high-DPI
- **WHEN** the user activates the PNG menu item with a valid render present whose viewBox is W × H
- **THEN** the downloaded PNG has pixel dimensions of approximately 2W × 2H (subject to the maximum-size cap below)

#### Scenario: PNG background is transparent
- **WHEN** the downloaded PNG is opened in an editor that shows transparency
- **THEN** the area outside the diagram shapes is fully transparent (no white or themed-surface fill)

#### Scenario: Very large diagrams are bounded
- **WHEN** applying the 2× scale would produce an image whose longer side exceeds 8192 pixels
- **THEN** the system reduces the effective scale so the longer side equals 8192 pixels, preserving aspect ratio

### Requirement: PDF export
The system SHALL, when the user selects PDF, download the currently rendered diagram as a single-page `.pdf` file whose page is sized to the diagram bounds and whose contents are vector (not a rasterized image embedded in PDF).

#### Scenario: PDF download is single-page
- **WHEN** the user activates the PDF menu item with a valid render present
- **THEN** the downloaded PDF has exactly one page, sized so the diagram fits the page without cropping

#### Scenario: PDF contents remain crisp at high zoom
- **WHEN** the downloaded PDF is opened and zoomed to 400%
- **THEN** lines, shapes, and text remain crisp (vector), not pixelated

#### Scenario: PDF dependencies are loaded only on demand
- **WHEN** the user has not selected the PDF menu item during the current page session
- **THEN** the PDF generation libraries are not part of the initial JavaScript bundle and are not fetched

#### Scenario: PDF preparation feedback for slow loads
- **WHEN** the user selects PDF and the dynamic import of the PDF libraries takes longer than approximately 200ms
- **THEN** a transient indicator (e.g. a toast or inline progress) is shown informing the user that the PDF is being prepared, and is dismissed when the download starts

### Requirement: Filename convention
The system SHALL name every exported file `diagram-<timestamp>.<ext>`, where `<timestamp>` is the user's local time formatted as `YYYYMMDD-HHmmss`, and `<ext>` is `svg`, `png`, or `pdf` depending on the chosen format. Filenames MUST contain only characters that are safe across Windows, macOS, and Linux file systems.

#### Scenario: Two exports in succession do not collide
- **WHEN** the user exports the same diagram twice within the same minute, choosing different formats both times
- **THEN** the two filenames differ at least by their extension, and within the same format two exports separated by at least one second produce two different filenames

#### Scenario: Filename is filesystem-safe
- **WHEN** any export is downloaded
- **THEN** the resulting filename contains no characters reserved on Windows (`:`, `*`, `?`, `"`, `<`, `>`, `|`, `\`, `/`)

### Requirement: Export uses the live render, not a re-render
The system SHALL produce all three export formats from the SVG element currently displayed on the canvas. The export action MUST NOT trigger a fresh `mermaid.render()` call, MUST NOT mutate the live SVG, and MUST NOT cause a visible flicker or re-layout of the canvas.

#### Scenario: Export does not re-render
- **WHEN** the user activates any of the three export options
- **THEN** there is no visible re-render or flicker on the canvas during the export

#### Scenario: Export does not mutate the live SVG
- **WHEN** an export completes (success or failure)
- **THEN** the SVG on the canvas is structurally identical to its state immediately before the export (no leftover inlined styles, no removed children, no added wrapper elements)

