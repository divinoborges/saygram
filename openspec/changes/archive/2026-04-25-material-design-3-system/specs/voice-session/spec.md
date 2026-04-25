## MODIFIED Requirements

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
