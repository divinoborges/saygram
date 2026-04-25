## ADDED Requirements

### Requirement: Shift + mouse-wheel pans horizontally
The system SHALL pan the diagram horizontally — and not zoom — when the user scrolls the mouse wheel over the diagram canvas while holding the **Shift** key. Each wheel detent SHALL translate the viewport by a fixed on-screen pan step in the horizontal direction, matching the step used by the arrow-key pan shortcut. The vertical position of the diagram MUST NOT change during a Shift+wheel interaction. Holding Shift MUST NOT require keyboard focus on the canvas — the cursor being over the canvas is sufficient, matching the cursor-anchored zoom behavior.

#### Scenario: Shift + wheel up pans the view to the left
- **WHEN** the user holds Shift and scrolls the mouse wheel upward (negative `deltaY`) with the cursor over the diagram canvas
- **THEN** the diagram translates so that content previously off the left edge becomes visible (i.e. the view pans to the left), the vertical position is unchanged, and the scale is unchanged

#### Scenario: Shift + wheel down pans the view to the right
- **WHEN** the user holds Shift and scrolls the mouse wheel downward (positive `deltaY`) with the cursor over the diagram canvas
- **THEN** the diagram translates so that content previously off the right edge becomes visible (i.e. the view pans to the right), the vertical position is unchanged, and the scale is unchanged

#### Scenario: Shift + wheel does not zoom
- **WHEN** the user holds Shift and scrolls the mouse wheel over the diagram canvas
- **THEN** the diagram scale remains exactly what it was before the event — no zoom-in or zoom-out occurs from the wheel input while Shift is held

#### Scenario: Shift + wheel does not scroll the surrounding page
- **WHEN** the user holds Shift and scrolls the mouse wheel over the diagram canvas while the page itself has horizontal or vertical scroll available
- **THEN** the page does not scroll — the wheel event is consumed by the canvas and the page scroll position is unchanged

#### Scenario: Releasing Shift restores zoom-on-wheel
- **WHEN** the user releases the Shift key and continues to scroll the mouse wheel over the canvas
- **THEN** the wheel input resumes the existing cursor-anchored zoom behavior, with no horizontal translation introduced by the previous Shift+wheel interaction

#### Scenario: Pan step matches arrow-key pan
- **WHEN** the user issues a single Shift + wheel detent in either direction
- **THEN** the resulting horizontal translation in screen pixels equals the translation produced by a single ArrowLeft or ArrowRight press
