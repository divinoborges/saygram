## Why

The repository's `README.md` still describes the original "Realtime Solar System Demo" — a 3D Spline scene driven by voice — but the codebase has been completely repurposed into **Voice Mermaid Builder**, a voice-driven Mermaid diagram editor (see `app/layout.tsx` metadata, `components/app.tsx`, `lib/diagram-tools.ts`, `lib/config.ts`). New visitors landing on the GitHub page get a misleading description of the product, instructions that point at deleted files (`components/scene.tsx`, `lib/components-mapping.tsx`), and screenshots/flows that no longer match the UI. We also want a prominent "Live Demo" entry-point badge alongside the existing license/stack badges so people can try the app in one click.

## What Changes

- **BREAKING (docs only):** Replace the entire body of `README.md` with content describing the current Voice Mermaid Builder app — purpose, screenshot, setup, BYO-API-key flow, voice/diagram interaction model, export/persistence behavior, and customization points (`lib/config.ts`, `lib/diagram-tools.ts`, `lib/m3-theme.ts`).
- Add a **Live Demo** badge linking to the deployed app (the target URL is captured as a `<LIVE_DEMO_URL>` placeholder in this change; the operator fills it in before publishing).
- Keep and refresh the existing badge row (License, Built with Next.js, Powered by OpenAI Realtime API) and add badges that reflect the actual stack now in `package.json`: React 19, TypeScript, Tailwind CSS, Mermaid, Material 3.
- Remove all references to Spline, the solar system scene, planet/moon/ISS interactions, the `mouseDown`/`emitEvent` examples, and the deleted files.
- Document the new feature surface that already exists in code: voice-driven `set_diagram`/`patch_diagram` tools, supported Mermaid types, the editable side panel, viewport pan/zoom controls, PDF/SVG/PNG export, M3 theming, localStorage persistence of the diagram and panel state, and the BYO-key + `.env` + system env resolution order (the BYO-key paragraph already in the current README is correct and is preserved).
- Keep the existing `public/screenshot.png` reference (the file is the new UI screenshot) and drop the stale `public/screenshot.jpg` mention.
- Preserve the MIT License section unchanged.

This change is documentation-only. No source code, dependencies, or runtime behavior change.

## Capabilities

### New Capabilities
- `project-readme`: The repository's `README.md` as a documentation surface — title, badge row (including a Live Demo badge), description, screenshot, setup instructions, feature/interaction model, customization pointers, and license. Owns what visitors see on GitHub and what self-hosters follow to get the app running.

### Modified Capabilities
<!-- None. No spec under openspec/specs/ describes README content today, so this is purely additive at the spec layer. -->

## Impact

- **Code:** none.
- **Files modified:** `README.md` (full rewrite).
- **Files referenced (read-only, for accuracy):** `app/layout.tsx`, `app/page.tsx`, `app/api/session/route.ts`, `components/app.tsx`, `components/api-key-dialog.tsx`, `components/diagram-canvas.tsx`, `components/code-side-panel.tsx`, `components/export-controls.tsx`, `components/status-bar.tsx`, `lib/config.ts`, `lib/diagram-tools.ts`, `lib/diagram-store.ts`, `lib/diagram-export.ts`, `lib/api-key.ts`, `lib/m3-theme.ts`, `package.json`.
- **Dependencies:** none added or changed. Badge images are served from `img.shields.io`, so no new package is required.
- **Deploy:** the operator must paste the live demo URL into the `<LIVE_DEMO_URL>` placeholder before merging (or accept the placeholder for now and replace it in a follow-up).
- **SEO/social:** GitHub repo description and social previews will look more accurate; OpenGraph/Twitter cards already point at the new screenshot via `app/layout.tsx`, so no change is needed there.
- **Risk:** very low. Rendering risk only (broken Markdown / broken badge image URLs). Verify by viewing the rendered README on a Markdown previewer or pushing to a draft branch on GitHub.
