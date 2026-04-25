## ADDED Requirements

### Requirement: Status bar positioned at bottom-center of the diagram canvas
The connection status pill, start/stop button, and microphone toggle SHALL render as a single horizontal cluster anchored at the bottom-center of the diagram canvas region, with the cluster horizontally centered over the visible canvas in both panel-expanded and panel-collapsed states. The cluster MUST NOT overlap the right-side code panel header (where the "Copy code" button lives) regardless of panel state.

#### Scenario: Panel expanded
- **WHEN** the right-side code panel is in its expanded state
- **THEN** the status cluster is centered horizontally over the visible canvas region (i.e., the area to the left of the expanded panel) and sits near the bottom edge of that region with a small visual gap, and its rendered position does not horizontally overlap the panel's "Copy code" button

#### Scenario: Panel collapsed
- **WHEN** the user collapses the right-side code panel
- **THEN** the canvas region grows to fill the freed horizontal space, and the status cluster re-centers over the new wider region without any further user action

#### Scenario: Disconnected at mount
- **WHEN** the app first mounts and the session is `disconnected`
- **THEN** the cluster is already visible at the bottom-center of the canvas region with the disconnected pill and an enabled start button — it is not hidden or positioned off-screen
