## Context

`README.md` is the first surface a visitor or potential contributor sees. The current file is a verbatim leftover from when this repository was the OpenAI Realtime Solar System Demo (3D Spline scene of planets, voice-driven planet/moon/ISS animations). The codebase has since been rewritten into **Voice Mermaid Builder**: a Next.js 15 / React 19 app that uses the OpenAI Realtime API + WebRTC to let a user dictate, edit, and export Mermaid diagrams by voice. The `app/layout.tsx` metadata already advertises this product, but `README.md` does not, so GitHub-rendered docs and any AI/search index pulling from the README describe a non-existent product. The previous `add-user-api-key` change already added a correct paragraph about the BYO-key flow to the README; the rest of the file is stale.

Constraints:

- Documentation-only change. We must not touch any source files, badges in any other doc, or `LICENSE`.
- The repository's git remote is still `openai/openai-realtime-solar-system`; the README should not assume the GitHub slug will be renamed (so we don't hardcode badge URLs that would break if the repo is renamed later — see Decisions).
- The live demo URL is not yet known; the operator chose a `<LIVE_DEMO_URL>` placeholder for now.
- The screenshot file already in the repo is `public/screenshot.png` (the new UI). The old `public/screenshot.jpg` is unrelated to current UI and should not be referenced.
- Stack facts must be sourced from `package.json` and the actual `app/`/`components/`/`lib/` tree, not from memory.

Stakeholders: repo owner (Divino), self-hosters cloning the repo, public visitors landing on the deployed app.

## Goals / Non-Goals

**Goals:**

- Replace the README body so it accurately describes Voice Mermaid Builder: what it is, what it looks like, how to run it, how to bring your own API key, what voice interactions exist, what tools the model can call, how export/persistence/theming work, and how to customize.
- Add a **Live Demo** badge as the first item in the badge row, hyperlinking to the deployed app.
- Keep a small, scannable badge row that reflects the *current* stack (Next.js 15, React 19, TypeScript, Tailwind, Mermaid, Material 3, OpenAI Realtime API, MIT License). Avoid badge inflation.
- Preserve the BYO-key paragraph already present (it is correct and was the contract of the `add-user-api-key` change).
- Keep the file under one screen of intro before the first instruction (so the GitHub viewport shows badges + tagline + screenshot above the fold).

**Non-Goals:**

- Translating the README into Portuguese (the rest of the repo is English; mixing would hurt scannability). The user's voice/diagram UX itself is multilingual at runtime, and the README mentions that, but the README itself stays English.
- Documenting internals that belong in `openspec/specs/` (M3 token derivation, panel-state persistence schema, diagram-tools tool-call contract). README links into the codebase for those; specs are the source of truth.
- Producing a marketing landing page. The README is reference docs with a friendly intro, not a sales page.
- Adding badges for things that are not load-bearing (build status without CI configured, code coverage without a coverage workflow, package version when the package is `private: true`). Badges that 404 or always show "unknown" are worse than no badge.
- Rewriting `LICENSE`, `package.json` `name` field, or the GitHub repo description. Those are out of scope for a README rewrite.

## Decisions

### Decision: Use shields.io static badges, not dynamic ones

Use `https://img.shields.io/badge/<label>-<message>-<color>` static URLs for stack badges (Next.js, React, TypeScript, Tailwind, Mermaid, Material 3, OpenAI Realtime API). Use the existing `https://img.shields.io/badge/License-MIT-green.svg` style for the license badge.

**Why over alternatives:**

- *Dynamic shields (e.g., `img.shields.io/github/package-json/v/<owner>/<repo>`)*: would break the moment the repo is renamed or made private, and the package is `"private": true` so the version field is `0.1.0` and not meaningful. Static badges have no such failure mode.
- *Custom SVGs in `public/`*: extra files to maintain, no benefit over shields.io for a docs use case.
- *No badges at all*: the user explicitly asked for badges including a Live Demo badge.

### Decision: Live Demo badge is the first badge, in a distinctive color

Render the Live Demo badge first in the row, with a vivid color (e.g., `brightgreen` or shields.io's `success`) and a "rocket" or "play" style label so it visually reads as a CTA, not a metadata chip. Wrap it in a Markdown link to `<LIVE_DEMO_URL>`.

**Why over alternatives:**

- *Last in the row*: badges are scanned left-to-right; the CTA should lead.
- *A separate "Try the live demo →" text link instead of a badge*: less visually consistent with the surrounding badge row and the user explicitly asked for a *badge*.

### Decision: Use a `<LIVE_DEMO_URL>` placeholder rather than guessing a Vercel URL

The operator confirmed the URL is not ready yet and chose the placeholder option. Insert the literal string `<LIVE_DEMO_URL>` (with angle brackets) so it stands out as obviously-not-a-real-URL on the rendered page and is trivially `sed`-replaceable.

**Why over alternatives:**

- *Guess `https://voice-mermaid-builder.vercel.app`*: would render a clickable badge that 404s — strictly worse than a visible placeholder.
- *Comment out the badge until the URL is known*: hides the user's explicit request and makes future-them forget to add it back.
- *Omit the badge*: contradicts the explicit ask.

### Decision: Preserve the existing BYO-key paragraph verbatim (subject to minor edits)

The current README already contains a careful, security-reviewed description of the three ways to provide an OpenAI API key (UI / `.env` / system env), including the security caveats about `localStorage` and `Authorization: Bearer` transport. That paragraph is the contract from the `add-user-api-key` change and is still accurate.

**Why over alternatives:**

- *Rewrite from scratch*: high risk of accidentally weakening the security wording (e.g., dropping the "never persisted server-side" claim), and the current text is good.
- *Replace with a one-liner*: loses the operational detail self-hosters need, and the user did not ask to shorten this section.

Allowed minor edits: section heading numbering may shift if surrounding sections are reordered, but the body of the BYO-key paragraph stays intact.

### Decision: Replace the `## Demo flow` section with a `## What you can do` voice/diagram interaction section

The existing "Demo flow" describes a scripted tour of the solar system scene that no longer exists. Replace it with a section that describes the actual interaction model implemented in `lib/diagram-tools.ts` and `lib/config.ts`: the supported Mermaid diagram types (flowchart, sequence, class, state, er, gantt, mindmap, timeline, pie, journey, gitGraph, quadrantChart, requirement, c4, sankey, block — sourced from `BASE_INSTRUCTIONS`), the two tools (`set_diagram`, `patch_diagram`), the side-panel direct-edit affordance (`components/code-side-panel.tsx`), the export controls (PDF/SVG/PNG via `lib/diagram-export.ts`), the viewport controls (`components/viewport-controls.tsx`), and the M3 theme behavior (`lib/m3-theme.ts`, `lib/theme-pref.ts`).

**Why:** Without this section the README has no narrative about what the user can actually do with the app, and a screenshot alone won't convey it.

### Decision: Drop the Spline customization section entirely

The current `## Customization` section talks about editing the Spline scene URL in `components/scene.tsx` and using `spline.current.emitEvent("mouseDown", "object_name")`. Both `components/scene.tsx` and the Spline dependency are gone. Replace this section with pointers to the actual customization seams: model behavior in `lib/config.ts` (`BASE_INSTRUCTIONS`, `VOICE`), tool surface in `lib/diagram-tools.ts`, and theming in `lib/m3-theme.ts`.

**Why:** Following the old instructions would lead to "file not found" errors and an immediate loss of trust in the docs.

### Decision: Tagline / one-liner

Adopt the same tagline already used by `app/layout.tsx` metadata: *"Build Mermaid diagrams by voice using the OpenAI Realtime API."* This keeps the GitHub README, the `<title>`, the OpenGraph card, and the Twitter card aligned, so the product is described consistently no matter where someone first sees it.

### Decision: Markdown style — no emoji icons in section headings; keep the inline planet emoji style only if it stays informative

The old README peppered section headings and bullets with planet emoji (🪐, 🌕, 📊, 🛰️, 👋, 🌌). The new content is about diagrams, not astronomy, so those emoji would be incoherent. Keep the README emoji-light: at most one or two functional icons (e.g., a 🎤 next to "Voice control" if it improves scannability) and none in headings. This matches the "no emoji unless explicitly requested" house style and keeps the file calm.

## Risks / Trade-offs

- **[Risk] Live demo badge points to a placeholder and is shipped without being filled in.** → Mitigation: implementation step (in `tasks.md`) explicitly calls out grepping the file for `<LIVE_DEMO_URL>` before merging, and the placeholder is intentionally non-URL-shaped (angle brackets) so a `git grep '<LIVE_DEMO_URL>'` makes it obvious. Also include a short HTML comment near the badge reminding the reader to replace it.
- **[Risk] Stack badges go stale when dependencies bump (e.g., Next.js 15 → 16).** → Mitigation: keep the badge text generic where possible ("Built with Next.js" rather than "Next.js 15.1"). Only the major-version chips (React 19, Tailwind 3) carry a number — and a major-version bump is exactly the moment someone should be looking at the README anyway.
- **[Risk] Translating the BYO-key security wording loses nuance.** → Mitigation: preserve the existing paragraph as-is; only touch numbering / heading hierarchy around it.
- **[Risk] Removing the Spline section breaks an inbound link from a blog post or documentation.** → Mitigation: low likelihood (this fork has no public posts pointing into deep README anchors); accepted.
- **[Trade-off] We do not add a CI status badge.** No CI workflow is configured in this repo (no `.github/workflows/`), so any badge would render as "unknown" or 404. Skipping is better than shipping a broken chip. If CI is added later, a follow-up change can add the badge.
- **[Trade-off] We keep the README in English even though the repo owner writes to me in Portuguese.** Mixing languages mid-document hurts skim-readability and the BYO-key paragraph is already English. The owner can request a Portuguese variant in a follow-up if desired.
