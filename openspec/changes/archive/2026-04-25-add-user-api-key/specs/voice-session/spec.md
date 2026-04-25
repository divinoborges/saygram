## MODIFIED Requirements

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
