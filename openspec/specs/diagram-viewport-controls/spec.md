# diagram-viewport-controls Specification

## Purpose

Defines the user-facing pan, zoom, fit-to-screen, on-canvas button cluster, and keyboard shortcuts that let users navigate the rendered Mermaid diagram on the main canvas. Owns the transform/gesture state and the auto-fit behavior on diagram-source changes. Layers on top of the `mermaid-canvas` capability without changing how the SVG is parsed or rendered.

## Requirements

### Requirement: Cursor-anchored zoom via mouse wheel
The system SHALL zoom the diagram in and out when the user scrolls the mouse wheel over the diagram canvas (no keyboard modifier required), anchoring the zoom on the screen position of the cursor so that the diagram point under the cursor remains under the cursor after the zoom.

#### Scenario: Zoom in with wheel up
- **WHEN** the user moves the cursor over a node label and scrolls the mouse wheel upward
- **THEN** the diagram scale increases by approximately one zoom step per wheel detent, and the same node label remains under the cursor

#### Scenario: Zoom out with wheel down
- **WHEN** the user scrolls the wheel downward over the diagram
- **THEN** the diagram scale decreases by approximately one zoom step per wheel detent, anchored on the cursor

#### Scenario: Wheel does not scroll the surrounding page
- **WHEN** the user scrolls the mouse wheel inside the diagram canvas
- **THEN** the page itself does not scroll — only the diagram zoom changes

### Requirement: Pinch-to-zoom on trackpads
The system SHALL zoom the diagram in and out in response to two-finger pinch gestures on a trackpad over the diagram canvas, anchored on the gesture centroid.

#### Scenario: Pinch out to zoom in
- **WHEN** the user performs a pinch-out gesture on a trackpad over the diagram
- **THEN** the diagram scale increases smoothly with the gesture, anchored on the centroid between the two fingers

#### Scenario: Pinch in to zoom out
- **WHEN** the user performs a pinch-in gesture on a trackpad over the diagram
- **THEN** the diagram scale decreases smoothly with the gesture, anchored on the centroid between the two fingers

### Requirement: Click-and-drag panning
The system SHALL pan the diagram in response to a primary-button click-and-drag anywhere on the diagram canvas, including on top of the rendered diagram itself.

#### Scenario: Drag pans the diagram
- **WHEN** the user presses the primary mouse button on the canvas (on the diagram or on empty space), moves the cursor by a delta (dx, dy), and releases
- **THEN** the diagram translates by approximately (dx, dy) in screen pixels, with no change to the current scale

#### Scenario: Cursor signals draggability
- **WHEN** the user hovers over the diagram canvas while not dragging
- **THEN** the cursor reflects a grabbable affordance (e.g. `grab`); during an active drag it reflects the active state (e.g. `grabbing`)

#### Scenario: Drag is bounded by viewport
- **WHEN** the user drags the diagram far enough that it would leave the visible viewport entirely
- **THEN** the diagram remains at least partially visible (it does not slide off-screen and become unrecoverable)

### Requirement: Zoom range
The system SHALL clamp the diagram scale to a minimum of 0.2x (20%) and a maximum of 8x (800%).

#### Scenario: Attempt to zoom below minimum
- **WHEN** the user issues zoom-out actions while already at the minimum scale
- **THEN** the scale remains at the minimum and no further reduction is applied

#### Scenario: Attempt to zoom above maximum
- **WHEN** the user issues zoom-in actions while already at the maximum scale
- **THEN** the scale remains at the maximum and no further increase is applied

### Requirement: On-canvas viewport button cluster (mermaid.live-style)
The system SHALL display a floating cluster of three icon buttons over the diagram canvas — zoom-in, zoom-out, and fit-to-screen / reset — modeled visually on the mermaid.live editor's pan/zoom controls.

#### Scenario: Cluster contains exactly the three documented buttons
- **WHEN** the diagram canvas is rendered with a non-empty diagram
- **THEN** the cluster shows three icon buttons: zoom-in, zoom-out, and fit-to-screen (in that visual order, top to bottom or left to right)

#### Scenario: Zoom-in button increases zoom by one step
- **WHEN** the user clicks the zoom-in button
- **THEN** the diagram scale multiplies by approximately 1.25, clamped to the maximum, anchored on the canvas center

#### Scenario: Zoom-out button decreases zoom by one step
- **WHEN** the user clicks the zoom-out button
- **THEN** the diagram scale divides by approximately 1.25, clamped to the minimum, anchored on the canvas center

#### Scenario: Fit-to-screen button resets the view
- **WHEN** the user clicks the fit-to-screen button
- **THEN** the diagram is centered in the viewport and scaled so that its bounding box fits the available canvas area with comfortable padding

#### Scenario: Cluster does not move with the diagram
- **WHEN** the user pans or zooms the diagram
- **THEN** the button cluster remains fixed in its corner of the canvas, not affected by the viewport transform

### Requirement: Keyboard shortcuts
The system SHALL support keyboard shortcuts for zoom and pan when the diagram canvas has keyboard focus.

#### Scenario: Plus key zooms in
- **WHEN** the canvas has focus and the user presses `+` (or `=`)
- **THEN** the diagram zooms in by one step, anchored on the canvas center

#### Scenario: Minus key zooms out
- **WHEN** the canvas has focus and the user presses `-`
- **THEN** the diagram zooms out by one step, anchored on the canvas center

#### Scenario: Zero key resets the view
- **WHEN** the canvas has focus and the user presses `0`
- **THEN** the diagram is centered and fitted to the viewport (same outcome as the fit-to-screen button)

#### Scenario: Arrow keys pan the diagram
- **WHEN** the canvas has focus and the user presses an arrow key
- **THEN** the diagram pans by a fixed on-screen distance in that direction

### Requirement: Auto-fit on diagram-source change
The system SHALL automatically center and fit the diagram to the viewport when the underlying Mermaid source changes from one valid value to a different valid value.

#### Scenario: New diagram from the model
- **WHEN** the rendered Mermaid source changes (e.g. the model issues `set_diagram` with a brand-new graph)
- **THEN** after the new SVG is rendered, the viewport is reset so the new diagram is centered and fits with comfortable padding, regardless of the user's previous zoom or pan

#### Scenario: User zoom is preserved across re-renders for the same source
- **WHEN** the canvas re-renders with the same Mermaid source (e.g. the debounce fires twice on identical input)
- **THEN** the user's current zoom level and pan position are preserved

#### Scenario: User zoom is preserved when the source is patched in place
- **WHEN** the user has zoomed in on the diagram, and a `patch_diagram` tool call modifies the Mermaid source while the user is inspecting it

  *Note*: A `patch_diagram` produces a new source string, so under the strict reading of "source change → auto-fit," the view would reset. This scenario clarifies the intended behavior: auto-fit is acceptable here, and the design accepts that the user may need to re-zoom after a patch. Persisting zoom across patches is an explicit non-goal.
- **THEN** the system MAY auto-fit; both behaviors (preserve zoom or auto-fit) satisfy this requirement

### Requirement: Overlays remain unaffected by viewport transform
The system SHALL render the loading spinner, the parse-error banner, and the empty-state hint outside the pan/zoom transform so that they keep their existing on-canvas positions and sizes regardless of the current zoom or pan.

#### Scenario: Loading spinner during zoom
- **WHEN** a render is in flight and exceeds the spinner-delay threshold while the user has zoomed in
- **THEN** the spinner appears centered in the canvas at its normal size, not scaled by the current zoom

#### Scenario: Error banner during pan
- **WHEN** a parse error is active while the user has panned the diagram
- **THEN** the error banner remains anchored to its standard bottom-center canvas position, not translated by the pan

#### Scenario: Empty state ignores viewport
- **WHEN** the diagram source is empty
- **THEN** the empty-state hint is centered in the canvas and the button cluster is hidden (there is nothing to zoom or pan)

### Requirement: Shift + wheel horizontal pan
The system SHALL pan the diagram horizontally — without changing the zoom level — when the user holds the Shift key and scrolls the mouse wheel (or uses an equivalent two-finger trackpad scroll) over the diagram canvas. The horizontal pan distance SHALL be proportional to the wheel event's reported delta, so that fast wheel movements pan further than slow ones. The system SHALL NOT zoom while Shift is held, and SHALL NOT scroll the surrounding page.

#### Scenario: Shift + wheel-down pans the diagram left (content slides right into view)
- **WHEN** the user holds Shift and scrolls the wheel downward over the diagram canvas
- **THEN** the diagram translates horizontally so that content previously off the right edge becomes visible, by a distance proportional to the wheel event's delta, with no change to the zoom level

#### Scenario: Shift + wheel-up pans the diagram right (content slides left into view)
- **WHEN** the user holds Shift and scrolls the wheel upward over the diagram canvas
- **THEN** the diagram translates horizontally in the opposite direction, by a distance proportional to the wheel event's delta, with no change to the zoom level

#### Scenario: Shift + wheel honors the OS-reported axis
- **WHEN** the user holds Shift and scrolls the wheel on a platform that swaps axes itself (e.g. macOS, where `WheelEvent.deltaX` is populated under shift) **OR** on a platform that does not swap (where `deltaY` is populated and `deltaX` is zero)
- **THEN** in both cases the diagram pans horizontally; the system SHALL prefer `deltaX` when it is non-zero and fall back to `deltaY` otherwise

#### Scenario: Shift suppresses zoom
- **WHEN** the user holds Shift and scrolls the wheel over the diagram canvas
- **THEN** the diagram does NOT zoom — the scale before and after the gesture is unchanged

#### Scenario: Page does not scroll behind the canvas
- **WHEN** the user holds Shift and scrolls the wheel over the diagram canvas, regardless of whether the surrounding page would otherwise scroll
- **THEN** the page itself does not scroll; only the diagram pans
