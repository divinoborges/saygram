# voice-session Specification

## Purpose

Defines the Realtime WebRTC voice session lifecycle, the connection status indicator, and the read-only behavior of the canvas and code panel while the session is disconnected.
## Requirements
### Requirement: Realtime WebRTC voice session
The system SHALL establish a WebRTC voice session with the OpenAI Realtime API, reusing the ephemeral-key endpoint and connection scaffolding from the base template. Voice input from the user's microphone MUST flow to the model and audio responses from the model MUST play back to the user.

The session bootstrap request to the server's session-bootstrap endpoint (`/api/session`) MUST include an `Authorization: Bearer <user-key>` header when, and only when, the user has saved a key in their own browser storage. The server-side bootstrap handler MUST resolve the key in the following order:
1. The `Authorization: Bearer` value, if present and non-empty.
2. The server-side `OPENAI_API_KEY` env var, if set and non-empty.
3. Otherwise, return a structured 401 response with body `{ ok: false, error: "no_key" }` so the client can prompt the user to set a key.

When OpenAI rejects the resolved key (HTTP 401 from `client_secrets`), the server MUST return a 401 response with body `{ ok: false, error: "invalid_key" }`. The server MUST NOT log the key, MUST NOT echo the key in any response (success or error), MUST NOT include the key in any persistent storage or telemetry, and MUST set `Cache-Control: no-store` on the response.

#### Scenario: Establish session with browser-supplied key
- **WHEN** the user has saved an API key in their browser and clicks the start button while disconnected
- **THEN** the system fetches an ephemeral key by sending `GET /api/session` with `Authorization: Bearer <user-key>`, the server uses that header value to mint a client secret, the system creates an `RTCPeerConnection`, attaches the user's microphone, opens the data channel, sends the initial `session.update` with the diagram-architect instructions and tool registrations, and transitions the status indicator from `connecting` to `listening`

#### Scenario: Establish session with server-side env key
- **WHEN** the user has not saved a browser key, the server has `OPENAI_API_KEY` set, and the user clicks the start button while disconnected
- **THEN** the system fetches an ephemeral key by sending `GET /api/session` with no `Authorization` header, the server falls back to the env var to mint a client secret, and the rest of the session-establishment flow proceeds as in the previous scenario

#### Scenario: User-supplied key takes precedence over env var
- **WHEN** the user has saved a browser key AND the server also has `OPENAI_API_KEY` set
- **THEN** the bootstrap call uses the browser-supplied key (the `Authorization` header), not the server's env var, to mint the client secret

#### Scenario: No key configured anywhere
- **WHEN** the user clicks the start button while no key is saved in the browser and no `OPENAI_API_KEY` is set on the server
- **THEN** the bootstrap call returns 401 with body `{ ok: false, error: "no_key" }`, no `RTCPeerConnection` is created, no microphone access is requested, the status indicator returns to `disconnected`, and the client opens the API-key dialog with the explanatory message defined by the `user-api-key` capability

#### Scenario: Tear down session
- **WHEN** the user clicks the stop button while connected
- **THEN** the system closes the data channel and `RTCPeerConnection`, releases the microphone track, and transitions the status indicator to `disconnected`

#### Scenario: Server never logs or echoes the key
- **WHEN** any session-bootstrap request is processed (with or without the `Authorization` header)
- **THEN** server logs and the response body MUST NOT contain the value of the `Authorization` header or the env var; the response MUST carry `Cache-Control: no-store`

### Requirement: Connection status indicator
The system SHALL display a visible status indicator implemented as an `<md-assist-chip>` Material Design 3 component, showing exactly one of: `disconnected`, `connecting`, `listening`, `model speaking`, `error`. The chip's container and label colors SHALL come from the M3 semantic color tokens per the state mapping defined by the `material-design-components` capability. The indicator MUST update in response to state transitions in the Realtime session lifecycle. The start/stop button and microphone toggle next to the chip SHALL be `<md-filled-tonal-icon-button>` components using Material Symbols glyphs (`play_arrow` / `stop` for the session toggle, `mic` / `mic_off` for the microphone toggle).

#### Scenario: Connecting
- **WHEN** the user starts a session and the connection handshake is in progress
- **THEN** the chip shows `connecting` with `--md-sys-color-tertiary-container` background and `--md-sys-color-on-tertiary-container` foreground; the leading dot pulses with M3-spec emphasized motion

#### Scenario: Listening
- **WHEN** the session is connected and the user is not currently being responded to
- **THEN** the chip shows `listening` with `--md-sys-color-primary-container` background and `--md-sys-color-on-primary-container` foreground

#### Scenario: Model speaking
- **WHEN** the model is actively producing audio output
- **THEN** the chip shows `model speaking` with `--md-sys-color-secondary-container` background and `--md-sys-color-on-secondary-container` foreground

#### Scenario: Error
- **WHEN** the session encounters an error (failed handshake, dropped connection, fatal API error)
- **THEN** the chip shows `error` with `--md-sys-color-error-container` background and `--md-sys-color-on-error-container` foreground, and the `<md-filled-tonal-icon-button>` start button (showing the `play_arrow` Material Symbol) is enabled to retry

#### Scenario: Cluster uses M3 components only
- **WHEN** a developer inspects the rendered status cluster DOM
- **THEN** the cluster contains an `<md-assist-chip>` and two `<md-filled-tonal-icon-button>` web components — no plain `<div>` styled to look like a chip and no plain `<button>`s with `lucide-react` icons

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

### Requirement: Read-only behavior when disconnected
The diagram canvas and code panel SHALL remain functional in read-only mode while the session is disconnected, using the diagram source loaded from `localStorage`.

#### Scenario: Mount disconnected with persisted diagram
- **WHEN** the app mounts and the user has not yet started a session
- **THEN** the canvas renders the persisted diagram, the side panel shows the persisted source, and the "Copy code" button works

#### Scenario: Disconnected after session
- **WHEN** the user stops a session and the indicator becomes `disconnected`
- **THEN** the canvas continues to display the last successfully validated diagram, the side panel continues to show the source, and the "Copy code" button continues to work

