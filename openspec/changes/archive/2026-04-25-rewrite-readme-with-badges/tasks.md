## 1. Verify source-of-truth facts before writing

- [x] 1.1 Re-read `app/layout.tsx` and confirm the H1 title and tagline match `metadata.title` and `metadata.description`
- [x] 1.2 Re-read `lib/config.ts` `BASE_INSTRUCTIONS` and copy the canonical list of supported Mermaid diagram types and the two tool signatures (`set_diagram`, `patch_diagram`)
- [x] 1.3 Re-read `app/api/session/route.ts` and confirm the BYO-key resolution order described in the existing README is still accurate (UI > `.env` > system env)
- [x] 1.4 List the current files referenced by the Customization section (`lib/config.ts`, `lib/diagram-tools.ts`, `lib/m3-theme.ts`, `lib/theme-pref.ts`) and confirm each exists on disk
- [x] 1.5 Confirm `public/screenshot.png` exists; do NOT reference `public/screenshot.jpg`

## 2. Replace the README body

- [x] 2.1 Replace the H1 with `# Voice Mermaid Builder`
- [x] 2.2 Render the badge row as a single line, in this order: Live Demo, License (MIT), Built with Next.js, Powered by OpenAI Realtime API, React 19, TypeScript, Tailwind, Mermaid, Material 3
- [x] 2.3 Wrap the Live Demo badge image in a Markdown link whose target is the literal string `<LIVE_DEMO_URL>`
- [x] 2.4 Add an HTML comment within ~3 lines of the Live Demo badge: `<!-- TODO: replace <LIVE_DEMO_URL> with the public deployment URL before publishing -->`
- [x] 2.5 Write the tagline directly under the badge row: `Build Mermaid diagrams by voice using the OpenAI Realtime API.`
- [x] 2.6 Embed the screenshot with `![screenshot](./public/screenshot.png)` immediately after the tagline

## 3. Write the body sections

- [x] 3.1 Add a `## What you can do` section listing: voice-driven creation/editing, the supported Mermaid diagram types (verbatim from `BASE_INSTRUCTIONS`), the two tools and their failure mode (`patch_diagram` requires unique substring), the editable side panel, viewport pan/zoom, PDF/SVG/PNG export, localStorage persistence (diagram + panel layout + API key), M3 theming that follows the OS color scheme, and multilingual voice (assistant replies in the user's language)
- [x] 3.2 Add a `## Getting started` section with the runnable steps: clone the repo, `npm install`, configure an OpenAI API key (one of the three methods), `npm run dev`, open `http://localhost:3000`. Each command in a fenced ```bash block.
- [x] 3.3 Within `## Getting started`, preserve the existing BYO-key paragraph (the three resolution methods + security caveats about `localStorage` and `Authorization: Bearer`) — copy it forward verbatim from the current `README.md` step 3, adjusting only the surrounding numbering/heading hierarchy
- [x] 3.4 Add a `## Using the app` section describing how to start a session (status bar at the bottom; mic toggle), how to dictate a diagram, how to switch diagram types, how to reset/clear, how to edit code directly in the side panel, and how to export
- [x] 3.5 Add a `## Customization` section pointing at: model behavior (`lib/config.ts` — `BASE_INSTRUCTIONS`, `VOICE`), tool surface (`lib/diagram-tools.ts`), and theming (`lib/m3-theme.ts`, `lib/theme-pref.ts`). Do NOT reference any deleted file.
- [x] 3.6 Add the final `## License` section: one sentence stating MIT and pointing at `LICENSE`

## 4. Cleanup pass

- [x] 4.1 Search the new README (case-insensitive) for `solar`, `spline`, `planet`, `moon`, `iss`, `pluto`, `jupiter`, `saturn`, `mercury`, `mars`, `neptune` — confirm zero matches
- [x] 4.2 Search the new README for `components/scene.tsx`, `lib/components-mapping`, `components/charts/`, `app/api/iss`, `emitEvent`, `screenshot.jpg` — confirm zero matches
- [x] 4.3 Confirm every relative file path mentioned in the README resolves on disk (`lib/config.ts`, `lib/diagram-tools.ts`, `lib/m3-theme.ts`, `lib/theme-pref.ts`, `public/screenshot.png`, `LICENSE`)
- [x] 4.4 Confirm the file contains no headings or section bodies left over from the old solar-system flow (no `## Demo flow`, no planet emoji 🪐🌕📊🛰️🌌)

## 5. Verify badges render

- [x] 5.1 For each shields.io badge URL in the file, fetch it (`curl -sI <url>` or open in a browser) and confirm HTTP 200 and that the SVG body does not contain `unknown` or `404`
- [ ] 5.2 Render the README in a Markdown previewer (or push to a draft branch on GitHub) and visually confirm: the badge row sits on one line at desktop width, the Live Demo badge is first and visually distinct, the screenshot loads, the section ordering reads cleanly
- [x] 5.3 Run `git grep '<LIVE_DEMO_URL>' README.md` — expect at least one match (confirms the placeholder is present and greppable)

## 6. Hand off

- [ ] 6.1 Commit the README change in isolation (no other files in the same commit)
- [ ] 6.2 In the PR description, remind the reviewer / operator that `<LIVE_DEMO_URL>` must be replaced before merging or in an immediate follow-up commit
- [ ] 6.3 Run `openspec status --change rewrite-readme-with-badges` to confirm all artifacts are `done`, then archive the change with `/opsx:archive` once merged
