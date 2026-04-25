# project-readme Specification

## Purpose
TBD - created by archiving change rewrite-readme-with-badges. Update Purpose after archive.
## Requirements
### Requirement: README accurately identifies the current product

The repository's `README.md` SHALL identify the project as **Saygram** and describe it as an app that lets the user build and edit Mermaid diagrams by voice using the OpenAI Realtime API + WebRTC. The README MUST NOT reference the deprecated Solar System / Spline product, the deleted files (`components/scene.tsx`, `lib/components-mapping.tsx`, `components/charts/`, `components/controls.tsx`, `app/api/iss/route.ts`), the planet/moon/ISS interactions, or the `spline.current.emitEvent` customization snippet.

#### Scenario: Title and tagline match the app metadata
- **WHEN** a reader views the rendered `README.md`
- **THEN** the H1 title SHALL be "Saygram" (matching `app/layout.tsx` `metadata.title`)
- **AND** the tagline directly under the badge row SHALL be "Build Mermaid diagrams by voice using the OpenAI Realtime API." (matching `app/layout.tsx` `metadata.description`)

#### Scenario: No stale Solar System references
- **WHEN** the file is searched (case-insensitive) for `solar`, `spline`, `planet`, `moon`, `ISS`, `pluto`, `jupiter`, `saturn`, `mercury`, `mars`, `neptune`
- **THEN** zero matches SHALL be found

#### Scenario: No references to deleted files or symbols
- **WHEN** the file is searched for `components/scene.tsx`, `lib/components-mapping`, `components/charts/`, `app/api/iss`, `emitEvent`
- **THEN** zero matches SHALL be found

### Requirement: README exposes a Live Demo badge

The README SHALL render a **Live Demo** badge as the first item in the badge row, hyperlinked to the deployed app's URL. Until the operator provides the URL, the badge link target SHALL be the literal placeholder `<LIVE_DEMO_URL>`. An adjacent HTML comment SHALL remind the operator to replace the placeholder before publishing.

#### Scenario: Live Demo badge is visible and first
- **WHEN** the README is rendered
- **THEN** the first image badge in the badge row SHALL display the label "Live Demo" (or "Try it live" / equivalent)
- **AND** that badge SHALL be wrapped in a Markdown link
- **AND** that link's target SHALL be either a valid `https://...` URL or the literal string `<LIVE_DEMO_URL>`

#### Scenario: Placeholder is greppable
- **WHEN** the URL is still the placeholder
- **THEN** running `git grep '<LIVE_DEMO_URL>' README.md` SHALL return at least one match
- **AND** an HTML comment within ~3 lines of the badge SHALL instruct the reader/operator to replace the placeholder before publishing

### Requirement: README badge row reflects the current stack

The badge row SHALL include badges for the load-bearing pieces of the actual stack listed in `package.json`: License (MIT), Built with Next.js, Powered by OpenAI Realtime API, React 19, TypeScript, Tailwind CSS, Mermaid, Material 3. The badge row MUST NOT include badges that resolve to "unknown" or 404 (e.g., CI status when no workflow exists, package version when `private: true`).

#### Scenario: Required badges present
- **WHEN** the README is rendered
- **THEN** the badge row SHALL contain (in any order after the leading Live Demo badge) badges for: License/MIT, Next.js, OpenAI Realtime API, React, TypeScript, Tailwind, Mermaid, Material 3

#### Scenario: No broken or always-unknown badges
- **WHEN** every badge image URL in the README is fetched
- **THEN** each SHALL return HTTP 200 and an SVG that does NOT contain the text "unknown" or "404"

### Requirement: README documents how to run the app

The README SHALL provide setup instructions sufficient for a self-hoster to clone the repo, install dependencies, configure an OpenAI API key, and run the dev server on `http://localhost:3000`. The instructions MUST preserve the BYO-key flow already documented (UI key in browser `localStorage`, project `.env`, system env var) with the same security caveats.

#### Scenario: Setup steps are runnable end-to-end
- **WHEN** a self-hoster follows the README's "Getting started" / "How to use" steps in order
- **THEN** the steps SHALL include: clone the repo, run `npm install`, configure an OpenAI API key by at least one of the three documented methods, run `npm run dev`, open `http://localhost:3000`
- **AND** each command SHALL be in a fenced ```bash code block

#### Scenario: BYO-key precedence is preserved
- **WHEN** the README's API-key section is read
- **THEN** it SHALL state that the resolution order is: per-visitor key in the UI > project `.env` > system env var
- **AND** it SHALL state that the per-visitor key is stored in browser `localStorage`, sent to the app's `/api/session` route only as `Authorization: Bearer …` at session start, used once to mint a short-lived OpenAI Realtime client secret, and never persisted or logged server-side
- **AND** it SHALL recommend using a project-scoped key with a usage cap rather than a personal admin key

### Requirement: README describes the diagram interaction surface

The README SHALL include a section that describes what the user can do with Saygram: voice-driven diagram creation/editing, the supported Mermaid diagram types, the two model tools (`set_diagram`, `patch_diagram`) sourced from `lib/diagram-tools.ts` / `lib/config.ts`, the editable side panel (`components/code-side-panel.tsx`), the viewport pan/zoom controls (`components/viewport-controls.tsx`), the export controls (PDF/SVG/PNG via `lib/diagram-export.ts` and `components/export-controls.tsx`), the local persistence of the diagram and panel layout, and the M3 (Material 3) theming that follows the OS color scheme.

#### Scenario: Supported diagram types are listed
- **WHEN** the diagram-interaction section is read
- **THEN** it SHALL list the supported Mermaid types as enumerated in `lib/config.ts` `BASE_INSTRUCTIONS` (flowchart, sequence, class, state, er, gantt, mindmap, timeline, pie, journey, gitGraph, quadrantChart, requirement, c4, sankey, block)

#### Scenario: Model tools are documented
- **WHEN** the same section is read
- **THEN** it SHALL describe `set_diagram(mermaid_code, diagram_type)` as the full-replace tool and `patch_diagram(find, replace)` as the targeted-edit tool
- **AND** it SHALL note that `find` must be a unique exact substring or the patch fails

#### Scenario: Multilingual voice behavior is mentioned
- **WHEN** the same section is read
- **THEN** it SHALL note that the user can speak any language and the assistant will reply in the same language (matching `lib/config.ts` `BASE_INSTRUCTIONS`)

### Requirement: README points at the correct customization seams

The "Customization" section of the README SHALL point self-hosters at the actual customization seams that exist in the current code: model behavior (`lib/config.ts` — `BASE_INSTRUCTIONS`, `VOICE`), the tool surface (`lib/diagram-tools.ts`), and theming (`lib/m3-theme.ts`, `lib/theme-pref.ts`). It MUST NOT instruct readers to edit any file that does not exist on `main`.

#### Scenario: Customization pointers reference real files
- **WHEN** every file path mentioned in the Customization section is checked against the working tree
- **THEN** each path SHALL exist on disk

### Requirement: README preserves the MIT License section

The README SHALL retain a final `## License` section stating that the project is MIT-licensed and pointing at the `LICENSE` file. The `LICENSE` file itself MUST NOT be modified by this change.

#### Scenario: License section present
- **WHEN** the README is rendered
- **THEN** a `## License` heading SHALL appear near the end of the file
- **AND** its body SHALL state that the project is licensed under the MIT License and reference `LICENSE`

### Requirement: README screenshot reference is valid

The README SHALL embed a screenshot using a relative path that resolves on disk. The reference MUST point at `./public/screenshot.png` (the current UI screenshot) and MUST NOT reference `./public/screenshot.jpg` (a stale asset from the previous product).

#### Scenario: Screenshot path resolves
- **WHEN** the README is rendered locally
- **THEN** the embedded screenshot path SHALL be `./public/screenshot.png` (or an equivalent relative path that resolves to that file)
- **AND** that file SHALL exist on disk

