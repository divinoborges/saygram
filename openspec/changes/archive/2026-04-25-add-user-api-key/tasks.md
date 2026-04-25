## 1. Browser key store

- [x] 1.1 Create `lib/api-key.ts` with: `getStoredKey()` (read from `localStorage` under `openai:apiKey`), `setStoredKey(value: string): { ok: true } | { ok: false; reason: 'too_short' | 'wrong_prefix' }`, `clearStoredKey()`, `maskKey(value: string): string` (`sk-…<last 4>`), and `useStoredKey()` hook backed by `useSyncExternalStore` (mirrors the pattern in `lib/diagram-store.ts`).
- [x] 1.2 In `setStoredKey`, trim, then validate: must start with `sk-`, length 20–200; reject otherwise without persisting. Notify subscribers on persist/clear.
- [x] 1.3 Add a `hydrate()` call so the in-memory cache catches up with `localStorage` on first client render (mirroring `diagramStore.hydrate()`); call it from the existing hydrate `useEffect` in `components/app.tsx`.

## 2. Server-side resolution

- [x] 2.1 Update `app/api/session/route.ts` to accept the `Authorization` header on `GET`. Read the `Authorization` value, strip the `Bearer ` prefix (case-insensitive), trim, treat empty as absent.
- [x] 2.2 Resolve the key in order: header value > `process.env.OPENAI_API_KEY` > none. When neither is present, return `401` with JSON body `{ ok: false, error: "no_key" }` and `Cache-Control: no-store`.
- [x] 2.3 Use the resolved key to call `https://api.openai.com/v1/realtime/client_secrets`. If OpenAI returns 401, translate to `401` with body `{ ok: false, error: "invalid_key" }` and the same cache header. Other non-2xx responses return their status code with a generic error body (no key in body).
- [x] 2.4 Audit the route: no `console.log` of the request, headers, env, or any object that could include the key. Errors logged via `console.error` must reference only the upstream OpenAI status code and a static message — never a header value, never the key, never the env var.
- [x] 2.5 Set `Cache-Control: no-store` on every response from the route (success, `no_key`, `invalid_key`, generic error).

## 3. Session bootstrap on the client

- [x] 3.1 In `components/app.tsx`'s `startSession`, before calling `fetch("/api/session")`, read the saved key via `getStoredKey()`. If present, attach `Authorization: Bearer <key>` to the request. Don't add the header when no key is saved.
- [x] 3.2 After the fetch, if the response is `401`, parse the body. If `error === "no_key"`, transition status to `disconnected`, set a piece of state `pendingNoKey: true`, and trigger the API-key dialog to open with the explanatory message. If `error === "invalid_key"`, do the same but trigger the dialog with the inline rejection error.
- [x] 3.3 On the success path, capture from response headers (e.g. an `X-Session-Source: env|user`) whether the server used env vs. the user header — used by the trigger button to decide whether to show the "key required" badge across the app session.
- [x] 3.4 Adjust the existing error handling so that 401 cases do not transition to the global `error` status — they are handled by the dialog flow instead.

## 4. API-key dialog UI

- [x] 4.1 Create `components/api-key-dialog.tsx` — a controlled modal (open/close props, plus a reason for opening: `"manual" | "no_key" | "invalid_key"`) using existing M3 surface tokens. Layout: title "OpenAI API Key", optional banner message keyed by reason, password-type input, masked summary `sk-…XXXX` of the saved key when present, Save button, Clear button (visible only when a saved key exists), disclosure paragraph, link "Get an API key" pointing at `https://platform.openai.com/api-keys`.
- [x] 4.2 Implement keyboard support: Escape closes, focus is moved to the input on open, focus is restored to the trigger on close, Tab cycles within the dialog.
- [x] 4.3 On Save: call `setStoredKey(value)`. On `{ ok: false, reason: "wrong_prefix" }`, show inline error "This doesn't look like an OpenAI API key — they start with `sk-`". On `{ ok: false, reason: "too_short" }`, show "That key looks too short to be valid." On success, replace the input area with the masked summary and close the dialog (unless reason was `invalid_key`, in which case stay open and clear the inline error so the user can retry).
- [x] 4.4 On Clear: call `clearStoredKey()`. Stay open with an empty input.
- [x] 4.5 Render the dialog above all other floating UI (z-index above toasts and the Logs panel) and dim the rest of the app with a backdrop using `--md-sys-color-scrim` at appropriate opacity.

## 5. Trigger button in app chrome

- [x] 5.1 Create `components/api-key-button.tsx` — an icon button (Material Symbol `key` or `vpn_key`) with `aria-label="OpenAI API key"`. When the prop `showRequiredBadge` is true, render a small dot/badge in a `--md-sys-color-error` accent and append "(API key required)" to the accessible label.
- [x] 5.2 In `components/app.tsx`, mount the button in the existing top-right cluster, immediately to the left of `<ThemeToggle />`. Pass `showRequiredBadge = (no stored key) AND (server-source last known to be missing OR session-start has reported `no_key`)`.
- [x] 5.3 Wire the button's `onClick` to open the dialog with reason `"manual"`.

## 6. State plumbing in app

- [x] 6.1 Add to `App` component state: `apiKeyDialogOpen: boolean`, `apiKeyDialogReason: "manual" | "no_key" | "invalid_key"`. Default closed, `"manual"`.
- [x] 6.2 Mount `<ApiKeyDialog />` once at the app root, controlled by these state values.
- [x] 6.3 Track `serverHasEnvKey: boolean | null` (null = unknown) — flipped to `true` whenever a session-start succeeds via env, `false` whenever a session-start returns `no_key`, otherwise unchanged.

## 7. Documentation

- [x] 7.1 Update README to add a section "OpenAI API key" explaining the two paths: (a) self-hosters can set `OPENAI_API_KEY` in `.env`; (b) public deployments can leave it unset and visitors will be prompted to provide their own via the UI; (c) when both are set, the user's browser-stored key wins.
- [x] 7.2 In the README key section, call out the security boundary: key transits the network only as `Authorization: Bearer` to `/api/session`, which uses it once to mint a client secret and discards it; never stored or logged server-side.
- [x] 7.3 Add a one-line note that browser storage is `localStorage` and is therefore readable by any script on the origin, and recommend using a project-scoped key with a usage cap.

## 8. Manual QA

- [ ] 8.1 Self-host scenario: with `OPENAI_API_KEY` set in `.env` and no browser-stored key, verify Connect → session starts; the trigger button shows no required-badge.
- [ ] 8.2 Public-deploy scenario: with no `OPENAI_API_KEY` on the server and no browser-stored key, click Connect → status indicator does not get stuck on `connecting`, the dialog auto-opens with the "Add your OpenAI API key to start a session" message, the status returns to `disconnected`, and after entering a valid key Connect succeeds.
- [ ] 8.3 Invalid-key scenario: save a malformed-but-validation-passing key (e.g. `sk-` + 22 random chars), click Connect → server returns 401 invalid_key, the dialog opens with the inline "OpenAI rejected this key — check it and try again" error, and status returns to `disconnected`.
- [ ] 8.4 Override scenario: with both `.env` set and a browser-stored key set, verify the request carries `Authorization: Bearer <browser-key>` (DevTools → Network) and that the session uses the browser key. Clear it from the dialog → next start falls back to env.
- [ ] 8.5 Persistence: save a key, close and reopen the tab → the key is still there and Connect works without re-entering it.
- [ ] 8.6 Origin scoping: in localhost, save key A; in production deploy, save key B → they don't interfere.
- [ ] 8.7 Hygiene check: with the route's logging at default and DevTools Network panel open during a successful session-start, confirm no log line on the server contains the key and no response body contains the key.
- [ ] 8.8 Accessibility: open the dialog, navigate the entire flow with keyboard only (Tab, Shift-Tab, Enter, Escape) — works; screen reader announces the trigger button label including the "API key required" suffix when no key is configured.
