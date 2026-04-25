## ADDED Requirements

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
