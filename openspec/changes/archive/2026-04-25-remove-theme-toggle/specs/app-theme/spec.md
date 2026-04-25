## ADDED Requirements

### Requirement: Color scheme always follows the OS preference
The app SHALL resolve its color scheme strictly from the OS-level `prefers-color-scheme` media query. The system MUST NOT read or write any user-facing theme preference in storage, and MUST NOT expose any UI control that lets the user override the OS scheme.

#### Scenario: OS in dark mode at first paint
- **WHEN** the user opens the app for the first time on an OS configured for dark mode
- **THEN** the app renders in the dark scheme from the very first frame, with `<html data-theme="dark">` set by the inline pre-paint script

#### Scenario: OS in light mode at first paint
- **WHEN** the user opens the app on an OS configured for light mode
- **THEN** the app renders in the light scheme from the first frame, with `<html data-theme="light">` set by the inline pre-paint script

#### Scenario: Stored legacy preference is ignored
- **WHEN** the user's browser has a leftover `localStorage` entry under the key `ui:theme` (a relic of the removed toggle) and the OS is in dark mode
- **THEN** the app renders in the dark scheme regardless of the stored value, and the system does not read or rewrite that key

### Requirement: No user-facing theme toggle in the UI
The app chrome SHALL NOT render any control (button, menu item, settings entry, or otherwise) that changes the color scheme. The previously shipped icon-button cycle through `system` / `light` / `dark` MUST be removed.

#### Scenario: Toggle is absent from chrome
- **WHEN** the app is rendered in any state (connected, disconnected, panel expanded, panel collapsed)
- **THEN** no theme toggle button is visible anywhere in the chrome, and no equivalent control is reachable through the UI

### Requirement: Pre-paint init script sets `data-theme` from the OS scheme
The HTML document SHALL include an inline script in `<head>`, emitted before any stylesheet that depends on `data-theme`, that synchronously sets `document.documentElement.dataset.theme` to `"light"` or `"dark"` based on `window.matchMedia("(prefers-color-scheme: dark)").matches`. The script MUST NOT consult `localStorage` or any other persisted preference. If the script throws (for example, `matchMedia` unavailable), it MUST fall back to setting `data-theme` to `"dark"`.

#### Scenario: Script runs before first paint
- **WHEN** the browser parses the document head
- **THEN** the inline script executes and sets `<html data-theme="...">` before stylesheets that consume the M3 token variables resolve, so there is no flash of the wrong scheme

#### Scenario: matchMedia throws or is unavailable
- **WHEN** the inline script's call to `window.matchMedia(...)` throws at runtime
- **THEN** the script catches the error and sets `<html data-theme="dark">` as a safe default

### Requirement: Live OS scheme changes update the applied theme
While the app is mounted, it SHALL subscribe to `prefers-color-scheme` changes and, on each change, recompute and apply the M3 theme tokens for the new scheme so the rendered UI updates without a reload.

#### Scenario: User flips OS appearance mid-session
- **WHEN** the user changes their OS appearance from light to dark (or vice versa) while the app is open
- **THEN** the app re-applies the M3 theme for the new scheme, `<html data-theme>` updates, and the visible UI repaints in the new scheme without requiring a refresh

#### Scenario: Subscription is torn down on unmount
- **WHEN** the component that owns the `prefers-color-scheme` listener unmounts
- **THEN** the listener is removed and no further theme re-application occurs from that subscription
