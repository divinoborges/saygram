## Why

The app is going to be deployed publicly, so the operator can no longer ship a single `OPENAI_API_KEY` baked into the server's environment without paying for everyone who uses it. Visitors must be able to bring their own OpenAI key. At the same time, anyone running the project locally (or self-hosting) should keep the existing zero-config experience: drop a key in `.env` and it just works. Both paths must coexist without weakening the existing security posture — the user's actual key must never be persisted server-side and never reach any third party except OpenAI itself.

## What Changes

- Add a UI surface for a visitor to paste their own OpenAI API key. Stored only in the browser's `localStorage` under a single key, scoped to the origin.
- Add a browser-side store/helpers (`lib/api-key.ts`) for read/write/clear with a thin masking helper (`sk-…last4`) for display.
- Add a modal/dialog (`components/api-key-dialog.tsx`) with an input field, save/clear buttons, masked display of the currently saved key, and a short disclaimer ("Stored only in your browser. Sent to OpenAI via this app's server only when you start a session, never persisted").
- Add a small entry-point control next to the existing top-right `ThemeToggle` (probably a key icon button) that opens the dialog. Show a subtle "key required" affordance on the control when no key is set anywhere.
- When the browser starts a Realtime session it sends the user-supplied key (if any) to `/api/session` as a `Authorization: Bearer <user-key>` header, alongside the existing GET.
- Update `app/api/session/route.ts` to:
  - Prefer the `Authorization: Bearer` value when present.
  - Fall back to `process.env.OPENAI_API_KEY` when no header is sent.
  - When neither is configured, return a structured `401` body that the UI can recognize and prompt the user to set a key.
  - Never log the key, never store it, never echo it back in responses or error messages.
- Surface a clear UX when no key is available: starting a session opens the API-key dialog automatically with an explanatory message.
- Document the new behavior in `README` (env var stays optional; UI override always takes precedence when set).

## Capabilities

### New Capabilities
- `user-api-key`: User-supplied OpenAI API key flow — UI for entering/clearing/inspecting it, browser storage, transport to the server's session-bootstrap endpoint, server resolution rules (header > env), and the no-key UX.

### Modified Capabilities
- `voice-session`: how the realtime session is started changes — the bootstrap request to `/api/session` now carries an optional `Authorization: Bearer` header, the server resolution order changes, and the failure mode "no key configured anywhere" becomes a recoverable UX state instead of a hard 500.

## Impact

- **Code**:
  - New: `lib/api-key.ts`, `components/api-key-dialog.tsx`, `components/api-key-button.tsx` (or a simple icon button beside `ThemeToggle`).
  - Modified: `app/api/session/route.ts` (read header, fall back to env, structured 401 on absence), `components/app.tsx` (attach header on `fetch("/api/session")`, mount the dialog and the trigger button, handle the new "no key" 401 state).
- **Security**:
  - Key transits the network only over HTTPS, only as a request header to our own session-bootstrap endpoint, only at the moment of session start.
  - Server uses the key in-memory to call `https://api.openai.com/v1/realtime/client_secrets`, then discards it. No logging of headers, no persistence, no telemetry on this code path.
  - Browser stores the key in `localStorage`. Document the implication: any XSS on the origin can read it. Recommend against enabling third-party scripts on this origin.
- **APIs / contracts**: `/api/session` now accepts an optional `Authorization` header; previously it took no auth. No breaking changes for existing self-hosters who only use the env var.
- **Dependencies**: none added.
- **Docs**: README must say "you can set `OPENAI_API_KEY` in `.env` for a zero-prompt local experience, or leave it unset and let users provide their own keys via the UI".
- **Deploy**: the public deployment can ship without setting `OPENAI_API_KEY`.
