---
name: editor-core
description: The Editor composition contract — build one renderable project. Use for composition structure, the `data-*` timing attributes, `class="clip"`, tracks, sub-compositions, variables, framework-owned media playback, deterministic-render rules, and validation. Read before writing composition HTML.
---

## Configured workspace and output brand

Read `STUDIO.json` at the installed Studio root. Its `projects`, `library`, `operations` and `brands` paths are relative to that root and may point to separate sibling folders. Resolve those paths before reading production policy or creating work; literal `projects/` examples below refer to the configured projects root. Keep runtime and skills separate from client content. Use project manifests for native edit paths.

For new projects use the selected external brand pack and pin its identity/hash and snapshot with the project. Read the project's `brand/brand.json` and bundled rules before authoring. Director, Animator and Editor must use that same snapshot. A changed Studio default affects new projects only. JStudio-specific fonts, logos and copy below apply only to JStudio projects or preserved legacy projects; they never override another selected brand. Editor product identity is independent of output branding. Existing unpinned projects retain their original assets and require an explicit brand migration before replacement.

## Complete-candidate approval — authoritative Studio policy

Default to one human creative approval of the complete encoded candidate: final picture, narration, captions, transitions and intended mix. Build and internally check that candidate before asking for approval. Storyboards, stills, voice choices and isolated animation reviews are optional decision aids when requested or when a material unresolved choice prevents useful production; they are not routine prerequisites. Preserve any explicit project-specific restriction on production or spending.

Use the guarded review-only import, exchange and render routes to assemble unapproved animation into the complete candidate. Review-only status permits preparation and private review, never delivery as approved, publication or external sharing. Retain immutable component mappings and source/media integrity checks. A complete-cut decision approves that actual composition, not independent viewing of every source clip.

Record a plain “Approved” as creative approval when the exact candidate is unambiguous. Do not infer watched/listened attestations or demand a second formulaic confirmation. Actual playback/listening coverage remains separate and honest; perform available internal QA and disclose capability limits. After approval, deliver the exact approved bytes by verified copy/promotion, without rerendering, trimming, re-encoding or routine renewed approval. Changed rendered bytes need a new candidate decision.

Keep render-affecting source, assets, fonts, timing, settings and media in dependency inventories. Administrative logs, status updates and evolving construction notes are not render inputs and must not stale unchanged output. A material story/claim change calls for content review, not an automatic assertion that the encoded bytes changed. Never invent user approval or publish without separate authorization.

## JStudio routing — takes precedence over upstream workflow defaults

Within JStudio, the installed `director` Director owns intake, project location, complete-candidate review, optional intermediate decisions, handoffs and delivery. Read its `SKILL.md` and `references/animation-engine.md` before production. Any upstream instruction below to choose a different workflow owner, skip the complete-candidate decision, or create a separate `videos/` project is superseded here.

All video editing, assembly, clip timing, static captions, audio mixing and final export use native Editor in `projects/<slug>/editor/`. All newly authored animation uses Animator source in the same project's `animation/`, including 2D/3D scenes, kinetic text, logo motion, animated diagrams, camera choreography and designed animated transitions. Render versioned clips, inspect them through Director, then stage them in Editor using guarded review-only imports until the complete candidate is approved. Do not substitute GSAP/CSS/Lottie/another native animation runtime for Animator when creating animation. Standard editorial cuts/dissolves and timing existing media remain native editing; a designed motion sequence goes to Animator. Preserve existing native compositions and approved animation; do not convert them automatically. Native animation documentation below remains reference for inspecting and maintaining existing source, not an alternative new-animation route.

Use the matched installed skills and pinned runtime through Studio's `npm run editor --` and `npm run animation --` commands. Do not run upstream CLI upgrades, skill refresh/install commands or moving `@latest` tools during ordinary Studio production. Tool updates belong in Builder with matched validation and deliberate deployment. If Animator cannot support a requested format (for example transparent overlays), report the capability gap to Director rather than silently switching engines.

# Editor Core

**Agent pitfalls (read first):**

- Center with flex/`inset`, not CSS `transform: translate(-50%,-50%)` on a node you then GSAP `x`/`y`. Lint: `gsap_css_transform_conflict`. Use `fromTo` or `xPercent`/`yPercent`.
- Do not add a scene-exit `tl.set(..., {visibility:"hidden"})`. The runtime already hides timed clips. Opacity fades on inner nodes (or `opacity` on `.clip`) are enough. Caption hard-kills are a different rule.
- `window.__timelines["id"]` must match the root `data-composition-id`.
- After `render`, read the summary's second line: `beginframe` vs `screenshot`, GPU mode, stage timings. `screenshot` + `software gpu` on Linux is the slow path.

Editor renders video from HTML. A composition is an HTML file whose DOM declares timing with `data-*` attributes, whose animation runtime is seekable, and whose media playback is owned by the framework.

This skill is the **technical contract** — how to build one hyperframes project. The body below is the build guide; per-topic detail lives in `references/` (index next), read on demand. Process docs (brief, storyboard, review, production, dispatch, frame-worker) live in `/hyperframes` → `references/`. Other concerns live in the sibling domain skills — `editor-animation`, `editor-creative`, `media-use`, `editor-cli`, `editor-registry`. The capability map in `/hyperframes` says what each one covers.

## References

| File                                    | Read it to…                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/minimal-composition.md`     | start from the smallest renderable composition skeleton                                                                                                             |
| `references/composition-patterns.md`    | choose monolithic vs modular; structure a modular `index.html`; pick a sub-comp archetype                                                                           |
| `references/data-attributes.md`         | look up any `data-*` (root / clip / sub-comp host / legacy aliases); use `class="clip"`                                                                             |
| `references/tracks-and-clips.md`        | understand what `data-track-index` does (and does not) control, z-index, time a clip relative to another; list every track and clip with `npx hyperframes timeline` |
| `references/creator-editing-recipes.md` | copy truthful cut/trim/reorder/retime/freeze/camera/mask/crossfade/audio editing recipes and their limits                                                           |
| `references/sub-compositions.md`        | wire a sub-composition (host attrs, `<template>`, per-instance vars) and animate inside it                                                                          |
| `references/variables-and-media.md`     | declare variables; place `<video>`/`<audio>`, set volume, trim                                                                                                      |
| `references/determinism-rules.md`       | build a seekable timeline; determinism bans; layout / text fit                                                                                                      |
| `references/full-screen-motion.md`      | author full-frame motion with shared backgrounds                                                                                                                    |
| `references/tailwind.md`                | work in a Tailwind v4 project (`init --tailwind`; runtime contract differs from Studio's v3)                                                                        |

For animation runtime specifics (GSAP API, Lottie, Three.js, etc.) go to `editor-animation` → `adapters/<runtime>.md`.

## Building a composition

### Two root forms (not interchangeable)

- **Standalone** (top-level `index.html`): root `<div data-composition-id="…">` sits directly in `<body>`, **no `<template>` wrapper**. Wrapping a standalone root hides all content and `lint` rejects it (`standalone_composition_wrapped_in_template`, error).
- **Sub-composition** (loaded via `data-composition-src`): wrap the root in `<template>`. This is the shape to write: the loader also accepts a plain full document and falls back to its `<body>`, but the templated form is what the examples and tooling assume.

> ⚠ Transport rule: for a **templated** sub-composition the assembler drops the file's own `<head>` `<style>`/`<script>` (`packages/core/src/compiler/compositionAssembly.ts`, the `hasTemplate` gate), so put `<style>`/`<script>` **inside** the template. `<link>` is hoisted either way.
> ⚠ Host-id convention: give the host slot, the inner template, and the `window.__timelines["<id>"]` key the **same** id. A different local id is supported (the assembler falls back to the first root in the file) but the mismatch is silent, so match them unless you have a reason not to.

File shape, host wiring, and the pre-render checklist → `references/sub-compositions.md`.

### Root must be sized (silent layout bug)

The standalone root authors `width`/`height: 100%`. Canvas size is `data-width`/`data-height`. The runtime stamps those pixels onto the composition root. Do not hardcode `1920px`/`1080px` on `#root`. Skeleton → `references/minimal-composition.md`.

### One paused timeline

Each composition registers **exactly one** `gsap.timeline({ paused: true })` at `window.__timelines["<id>"]` (key = root `data-composition-id`). Building it inside an async callback (`document.fonts.ready`) is supported; what matters is that you **register only after the build completes**. Render length is the root's `data-duration`, **not** the timeline's length: a timeline that runs past it is cut off, and one that ends early holds its last frame. Omit the root `data-duration` and the length is inferred instead (timeline, media window, or adapter). You do not need `window.__timelines = window.__timelines || {}`: the runtime creates the registry before your inline scripts run, and `lint` no longer asks for it. Don't manually nest sub-timelines into the host; the runtime auto-nests registered child timelines. Full contract (incl. non-GSAP runtimes) → `references/determinism-rules.md` + `editor-animation/adapters/`.

### First-pass lint gotchas (a guaranteed first build failure)

Rules that `lint` **does** catch, but only after the fact. Write them right the first time:

- Never pair a CSS initial `transform` with a GSAP tween on the **same** property — the CSS value and the tween's start fight and `lint` rejects it with `gsap_css_transform_conflict`. Set the initial state inside the tween with `gsap.fromTo(el, { x: -40 }, { x: 0 })` instead of a CSS `transform: translateX(-40px)`.
- Never put `crossorigin` on `<video>`/`<audio>`. `lint` rejects it unconditionally with `media_crossorigin_breaks_preview` (error), including for canvas/WebGL/WebAudio readback. There is no suppression.
- Never give a `<video data-start>` an ancestor that also carries `data-start`. `lint` rejects it with `video_nested_in_timed_element` (error). Time the wrapper **or** the video, not both.
- Every `<audio>` needs an `id`. `lint` rejects it with `media_missing_id`, and an id-less `<audio>` is never picked up by the mixer, so the render is **silent**.
- Never tween a `.clip` with `autoAlpha` or `visibility` — `lint` rejects it with `gsap_animates_clip_element`. Animate a child instead.
- A named CSS `font-family` needs an in-file `@font-face` to a shipped local file, or `lint` fires `font_family_without_font_face`.
- Sub-composition `#root` uses `width`/`height: 100%` (or `inset: 0`), not hardcoded `1920px`/`1080px`. Canvas size is `data-width`/`data-height`.

A lint **error** also switches off the layout and contrast audits: `check` then reports `0 sample(s)` and `0/0 text checks`, which reads like a clean file but means nothing ran. Clear lint errors before you trust those numbers.

### Non-negotiable rules (silent bugs automated gates may miss)

Surfaced here; full rationale in the linked reference. Do not violate:

- No render-time clocks / unseeded `Math.random` / network / input-state; no `repeat: -1` (use a finite count). → `determinism-rules.md`
- Never tween `display`, `visibility`, or `autoAlpha` on a `.clip` element. The framework owns clip visibility, and `lint` rejects it (`gsap_animates_clip_element`). Animate a child instead. → `determinism-rules.md`
- No `<br>` in body text; transformed elements must be block-level + sized; pulsing absolute decoratives need peak clearance. → `determinism-rules.md`
- `<video>`/`<audio>` are found by a flat document query, so the framework seeks and decodes them at **any nesting depth** (including inside a sub-comp `<template>` or wrapper). One hard limit: `lint` errors if a `<video data-start>` sits inside another **plain** element that also has `data-start`, and the failure is real (wrong source frames, then the clip vanishes mid-slot), so put the timing on the wrapper or on the video, never both. Sub-composition hosts are exempt: media inside a sub-composition renders correctly. The other caveat is timelines, not placement: a sub-comp timeline can't animate host-root elements. → `variables-and-media.md`
- Keep every `id` unique across the **assembled** page (prefix sub-comp ids with the composition id, `#<id>-hero`) so your own `#id` CSS and `getElementById` calls resolve. Frame injection no longer depends on it: the compiler stamps a document-unique `data-hf-render-id` on every `video[src]`/`audio[src]`/`img[src]`. Media that uses `<source>` children instead of a `src` attribute is **not** stamped, so unique ids still matter there. → `composition-patterns.md`
- A full-screen fill on the composition **root** is fine on a normal render. It is dropped only on the layered-composite path (HDR content, or a composition using shader transitions), where the engine forces every composition root transparent so the layer beneath shows through. If your composition uses shader transitions or HDR media, put the fill on a full-bleed **child** (`position:absolute; inset:0`). → `composition-patterns.md`

## Editing existing compositions

- Read the files first. Preserve unrelated timing, tracks, IDs, variables, media paths.
- To know what is on a project's timeline (tracks, clips, starts, ends, what plays), run `npx hyperframes timeline [--json]` instead of reading `index.html` and every sub-composition file.
- Match existing composition IDs and timeline keys.
- Adding a clip: set its `data-start`/`data-duration` intentionally against the clips around it. `data-track-index` is a Studio display lane, not a timing constraint, so it does not need to be free.
- `data-hidden` on any composition element hides it in BOTH preview and render, overriding its time window; it is non-destructive/reversible and toggled by Studio's timeline eye icon.
- Adding a sub-composition: verify its internal `data-composition-id` before wiring the host.

## Validation

Use `editor-cli` for command details

- [ ] `npx hyperframes check` passes (0 findings across lint, runtime, layout, motion, and contrast)
- [ ] Projects with sub-compositions: `npx hyperframes snapshot --at <midpoints>` and eyeball each frame
- [ ] `npx hyperframes preview --background` for review (the user can edit anything in Studio's timeline, and the server survives the invoking command)
- [ ] `npx hyperframes render` only after the user approves
