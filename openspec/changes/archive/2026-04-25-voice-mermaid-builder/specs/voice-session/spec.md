## ADDED Requirements

### Requirement: Realtime WebRTC voice session
The system SHALL establish a WebRTC voice session with the OpenAI Realtime API, reusing the ephemeral-key endpoint and connection scaffolding from the base template. Voice input from the user's microphone MUST flow to the model and audio responses from the model MUST play back to the user.

#### Scenario: Establish session
- **WHEN** the user clicks the start button while disconnected
- **THEN** the system fetches an ephemeral key, creates an `RTCPeerConnection`, attaches the user's microphone, opens the data channel, sends the initial `session.update` with the diagram-architect instructions and tool registrations, and transitions the status indicator from `connecting` to `listening`

#### Scenario: Tear down session
- **WHEN** the user clicks the stop button while connected
- **THEN** the system closes the data channel and `RTCPeerConnection`, releases the microphone track, and transitions the status indicator to `disconnected`

### Requirement: Connection status indicator
The system SHALL display a visible status indicator showing exactly one of: `disconnected`, `connecting`, `listening`, `model speaking`, `error`. The indicator MUST update in response to state transitions in the Realtime session lifecycle.

#### Scenario: Connecting
- **WHEN** the user starts a session and the connection handshake is in progress
- **THEN** the indicator shows `connecting`

#### Scenario: Listening
- **WHEN** the session is connected and the user is not currently being responded to
- **THEN** the indicator shows `listening`

#### Scenario: Model speaking
- **WHEN** the model is actively producing audio output
- **THEN** the indicator shows `model speaking`

#### Scenario: Error
- **WHEN** the session encounters an error (failed handshake, dropped connection, fatal API error)
- **THEN** the indicator shows `error` and a start button is available to retry

### Requirement: Read-only behavior when disconnected
The diagram canvas and code panel SHALL remain functional in read-only mode while the session is disconnected, using the diagram source loaded from `localStorage`.

#### Scenario: Mount disconnected with persisted diagram
- **WHEN** the app mounts and the user has not yet started a session
- **THEN** the canvas renders the persisted diagram, the side panel shows the persisted source, and the "Copy code" button works

#### Scenario: Disconnected after session
- **WHEN** the user stops a session and the indicator becomes `disconnected`
- **THEN** the canvas continues to display the last successfully validated diagram, the side panel continues to show the source, and the "Copy code" button continues to work
