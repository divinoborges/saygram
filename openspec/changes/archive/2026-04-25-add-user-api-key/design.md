## Context

Today the realtime session is bootstrapped exclusively from a server-side `OPENAI_API_KEY` env var:

1. Browser `GET /api/session`.
2. Server reads `process.env.OPENAI_API_KEY`, POSTs to `https://api.openai.com/v1/realtime/client_secrets` with that key as Bearer.
3. Server returns the short-lived client secret (a *different* token, not the original key) to the browser.
4. Browser uses that client secret as Bearer when posting the SDP offer to `https://api.openai.com/v1/realtime/calls`.

The user's actual key never leaves the server. We want to keep that property when the key originates from a visitor: their key only ever sits in their own browser and is sent (over HTTPS) to our server only at the moment a session starts, then discarded. The deployed server holds no env key for the public flow; self-hosters keep `.env` working.

The realtime `client_secrets` endpoint is the trust hinge. Calling it directly from the browser (skipping our server entirely) would be cleanest, but OpenAI has not historically advertised CORS support for that endpoint — we cannot rely on it. So the server proxy approach stays.

## Goals / Non-Goals

**Goals:**
- A visitor with their own OpenAI key can paste it into a UI dialog and start a session without any server-side env config.
- A self-hoster who sets `OPENAI_API_KEY` in `.env` keeps the existing zero-prompt experience.
- When both exist (env set on server AND user supplied a key), the user's key takes precedence — the user is the one paying for it.
- The user's key is stored only in `localStorage` on the user's own browser, never persisted or logged on the server.
- Clear, recoverable UX when no key is configured anywhere — opens the dialog, doesn't silently fail.
- A way to mask, view-the-last-4, replace, and clear the saved key.

**Non-Goals:**
- No server-side accounts, no auth, no per-user storage of keys on our infrastructure.
- No "test this key" call before session start — the session-start error path already surfaces invalid keys; a separate validation request would just spend the user's quota.
- No multi-key/profile management, no team mode, no key rotation reminders.
- No browser-direct call to OpenAI's `client_secrets` endpoint (deferred until/unless OpenAI confirms CORS allows it).
- No encryption-at-rest in `localStorage` — `localStorage` is plaintext by design and any encryption key would be co-located, providing only theatre.
- No support for organization or project headers — the bare `Authorization: Bearer sk-…` is enough for `client_secrets` per OpenAI's API.

## Decisions

### Decision 1: Header-based proxy (browser → our server → OpenAI)

**Choice**: When the browser has a saved key, it sends `GET /api/session` with `Authorization: Bearer <user-key>`. The server reads that header, falls back to `process.env.OPENAI_API_KEY` if absent, and uses the resolved key only to POST `client_secrets`. Header is not logged, not echoed, not persisted.

**Why**: Preserves the existing trust boundary — the user's key is in-memory on the server for one outbound API call and then discarded. Works without any browser/CORS dependency on OpenAI's endpoint policy.

**Alternative considered**: Browser calls `client_secrets` directly with the user's key. **Rejected** for the CORS uncertainty above. If OpenAI later confirms CORS is open we can revisit — that would remove our server from the path entirely.

**Alternative considered**: Send the key in a request body field instead of a header. **Rejected** — bodies on `GET` are awkward and tooling sometimes logs request bodies even when it scrubs `Authorization` headers. The standard `Authorization: Bearer` is precisely the channel intended for credentials and is conventionally redacted by frameworks/proxies.

### Decision 2: Resolution order — user key (header) > env

**Choice**: If both are present, the request header wins. If only env is set, env wins. If neither, return a structured 401.

**Why**: The user is paying for their key; if they took the trouble to enter one, they meant to use it (e.g. their own org with higher rate limits). The env var becomes a fallback for self-hosters and for the operator's own pre-deploy testing.

### Decision 3: Storage — `localStorage` under a single key

**Choice**: Store in `window.localStorage` under `openai:apiKey`. Hydrate on app mount. No fallback to `sessionStorage` (annoying — survives a tab close).

**Why**: Matches how the rest of the app persists user state (the diagram source uses the same pattern in `lib/diagram-store.ts`). Plain text is acceptable for `localStorage` because the user is the asset owner; warning them in the dialog is the right control.

**Risks called out below**: XSS on the origin can read the key (same risk as any localStorage-backed credential).

### Decision 4: Format validation — light, not strict

**Choice**: On save, accept any non-empty string that starts with `sk-` and is between 20 and 200 characters after trimming. Don't try harder (no checksum, no API call).

**Why**: OpenAI key formats have evolved (`sk-proj-…`, `sk-ant-…` style suffixes for projects). Hard validation would falsely reject valid keys; the real validation is the actual `client_secrets` call when the user starts a session — we surface that error inline in the dialog and the status indicator.

### Decision 5: UI — top-right key button + modal dialog

**Choice**:
- A small icon button (Material Symbol `key` or `vpn_key`) sits at the top-right of the canvas, next to (and immediately to the left of) the existing `ThemeToggle`. The button shows a subtle dot/badge when no key is configured anywhere (no env, no localStorage).
- Clicking opens a modal dialog. Layout: title "OpenAI API Key", an input field (`type="password"`), masked display of the saved key (`sk-…XXXX`) when one exists, Save / Clear actions, and a one-line disclaimer + a link to OpenAI's keys page.
- When the user clicks "Connect" with no key configured anywhere, the dialog opens automatically with a "you need a key to start" message at the top.

**Why**: Modal is honest about the security weight of the action. Top-right placement keeps it discoverable but out of the main canvas surface. Reusing the existing `ThemeToggle` neighbor area keeps the chrome tight.

**Alternative considered**: An always-visible inline form. **Rejected** — clutter, especially on smaller screens.

### Decision 6: Error handling — surfaced where the user is

**Choice**: 
- 401 from `/api/session` with body `{ ok: false, error: "no_key" }` opens the dialog (auto).
- 401 from `/api/session` with body `{ ok: false, error: "invalid_key" }` (i.e. user's key was rejected by OpenAI) shows the error inside the dialog ("OpenAI rejected this key — check it and try again") and keeps it open so the user can fix it.
- 5xx or network errors fall back to a toast.
- Other transient errors surface through the existing status pill (`error` state).

**Why**: Keeps recoverable actions adjacent to the input that produced them. The toast is for things the user can't directly resolve.

### Decision 7: Server hygiene — no logging of the path

**Choice**: In `app/api/session/route.ts`:
- Don't `console.log` the request, headers, or body.
- Catch errors locally; log only the OpenAI API status code and a generic message — never the key, never the headers.
- Set the `Cache-Control: no-store` and `Pragma: no-cache` response headers (defensive against caches that might serve a `client_secrets` response to another visitor — should never happen for a `GET` with auth header but cheap).

**Why**: Anything we log is one breach away from the key. Treating the route as a one-shot, write-only-to-OpenAI proxy is the simplest safe shape.

## Risks / Trade-offs

- **[Key in `localStorage` is XSS-readable]** → if any script on the origin gets compromised, the key leaks. **Mitigation**: document this clearly in the dialog. Recommend (in a follow-up change) a strict CSP. Recommend users use a *project-scoped* OpenAI key with usage limits, not a personal admin key. We will add this guidance text to the dialog.

- **[User pastes a key into someone else's deployment]** → the operator's server theoretically sees the key in-transit. **Mitigation**: server-side hygiene (decision 7); HTTPS everywhere. Disclaimer text in the dialog: "this app's server forwards your key to OpenAI to start a session and does not store it". Out of scope: any cryptographic guarantee — there isn't one possible without a redesign that calls OpenAI directly from the browser.

- **[Operator's `.env` key gets shadowed unexpectedly]** → A self-hoster sets `OPENAI_API_KEY` and is confused why their key isn't being used after a teammate pastes one in the UI on the same machine. **Mitigation**: dialog title shows the active source ("Using key from this browser" / "Using server-side key"), and "Clear" makes it obvious how to revert to the server key.

- **[Header forwarding by edge proxies]** → some hosts (Vercel, Cloudflare) may log request headers in observability tooling unless explicitly told not to. **Mitigation**: document in README that this app sends the OpenAI key only on the `/api/session` route as `Authorization: Bearer` and that operators must verify their host's logging redaction. The operator owns the deployment, so the call is theirs.

- **[Concurrent edit between dialog and session start]** → user edits the key while a session-start request is in flight. **Mitigation**: the request snapshots the key at fetch time (passed as an arg, not read from store inside the API call). The next session-start picks up the new key.

- **[Localhost without HTTPS]** → `localStorage` is fine over `http://localhost` for development, and headers in transit don't leak because everything is on the same machine. No mitigation needed.

## Open Questions

- Should the dialog include a "remember in this browser" checkbox (vs. session-only)? — Not for v1. Default to persistent storage; if the user wants ephemeral, they can clear the key themselves. Add later if requested.
- Should we surface usage/cost? — Out of scope; OpenAI's dashboard is the source of truth.
