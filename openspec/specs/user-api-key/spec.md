# user-api-key Specification

## Purpose
TBD - created by archiving change add-user-api-key. Update Purpose after archive.
## Requirements
### Requirement: API key entry dialog
The system SHALL provide a modal dialog that lets the user enter, view (masked), replace, and clear an OpenAI API key. The dialog MUST contain a password-type input field, a Save action, a Clear action (visible only when a key is currently saved), a masked display of the currently saved key in `sk-…<last 4>` form, and disclosure text explaining that the key is stored only in the user's browser and is sent only at session start to this app's server, which forwards it to OpenAI to mint a short-lived client secret.

#### Scenario: Open the dialog from the trigger control
- **WHEN** the user clicks the API-key trigger control in the app chrome
- **THEN** a modal dialog opens, focus moves to the input field, and pressing Escape or clicking the scrim closes the dialog without saving any unsaved input

#### Scenario: Save a new key
- **WHEN** the dialog is open, the user enters a value of at least 20 characters that starts with `sk-`, and clicks Save
- **THEN** the dialog persists the value to browser storage, replaces the input area with the masked `sk-…XXXX` summary, and closes; the next session-start request will use this key

#### Scenario: Reject malformed input
- **WHEN** the user enters a value that does not start with `sk-` or is shorter than 20 characters and clicks Save
- **THEN** the dialog stays open, the field shows an inline error ("This doesn't look like an OpenAI API key — they start with `sk-`"), and the existing saved key (if any) is unchanged

#### Scenario: Clear the saved key
- **WHEN** a key is currently saved and the user clicks Clear
- **THEN** the saved key is removed from browser storage, the masked summary disappears, the dialog stays open with an empty input, and subsequent session-start requests will fall back to the server-side env var (if any)

#### Scenario: Disclosure text is present
- **WHEN** the dialog is open
- **THEN** a single sentence is visible reading something equivalent to: "Your key is stored only in this browser. It's sent to this app's server only when you start a session, and forwarded to OpenAI to issue a short-lived client secret."

### Requirement: Trigger control in app chrome
The system SHALL render an icon-button trigger for the API-key dialog in the top-right corner of the app, immediately to the left of the existing theme toggle. The button MUST use a Material Symbol consistent with a key (`key` or `vpn_key`) and MUST visibly indicate when no key is configured anywhere — neither in browser storage nor on the server.

#### Scenario: Trigger is reachable when disconnected
- **WHEN** the app first mounts in the disconnected state
- **THEN** the trigger button is visible at the top-right of the app, focusable by keyboard, and labeled for screen readers (e.g. `aria-label="OpenAI API key"`)

#### Scenario: Affordance when no key is configured
- **WHEN** there is no key in browser storage AND the server has reported via session-start that it has no env-side key either
- **THEN** the trigger button shows a small visible badge or dot, and its accessible label includes the words "API key required" or equivalent

#### Scenario: No badge when a key is available
- **WHEN** a key is saved in browser storage, OR the server reported having an env-side key
- **THEN** the trigger button is rendered without the "required" badge

### Requirement: Browser-side storage of the key
The system SHALL store the user-supplied key only in the user's own browser, in `localStorage` under a single namespaced key, and SHALL NEVER persist the key on the server, never include it in telemetry, never include it in logs, and never include it in client-side analytics events.

#### Scenario: Persistence across page reloads
- **WHEN** the user saves a key via the dialog and reloads the page
- **THEN** the saved key is still active for the next session-start request without prompting the user again

#### Scenario: Storage is origin-scoped
- **WHEN** the user opens the same app on a different origin (e.g. localhost vs. the production deploy)
- **THEN** the keys saved on the two origins are independent — saving on one does not affect the other

#### Scenario: No outbound transmission outside session-start
- **WHEN** the user saves or clears the key, navigates the app, opens panels, edits the diagram, or interacts with any feature other than session-start
- **THEN** no network request leaves the browser carrying the key

### Requirement: Auto-open on first session-start when no key is available
The system SHALL automatically open the API-key dialog when the user attempts to start a Realtime session and the server reports that no key is available (no header was sent and no env var is configured), with an explanatory message at the top of the dialog.

#### Scenario: Connect with no key anywhere
- **WHEN** the user clicks the start-session control while no key is in browser storage and the server has no env-side key
- **THEN** the session-start attempt fails fast, the API-key dialog opens automatically, an in-dialog message reads something equivalent to "Add your OpenAI API key to start a session", focus moves to the input field, and the status indicator returns to `disconnected` (not stuck on `connecting`)

#### Scenario: Connect succeeds after key is provided
- **WHEN** the dialog has been auto-opened, the user enters a valid-looking key, clicks Save, and clicks the start-session control again
- **THEN** the session-start request includes the new key, the dialog closes, and the status indicator transitions normally through `connecting` and onward

### Requirement: Surface an OpenAI rejection inline
The system SHALL, when OpenAI rejects the key during session-start (HTTP 401 from `client_secrets`), surface the error inside the API-key dialog rather than as a transient toast, and SHALL keep the dialog open so the user can correct the key without losing their place.

#### Scenario: OpenAI rejects the user-supplied key
- **WHEN** the user clicks the start-session control with a saved-but-rejected key, and the server's call to `client_secrets` returns 401
- **THEN** the API-key dialog opens, shows an inline error ("OpenAI rejected this key — check it and try again"), preserves the masked summary so the user can see *which* key was tried, and the status indicator returns to `disconnected`

