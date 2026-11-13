---
name: remotion-to-hyperframes
description: 'Port an existing Remotion (React) composition''s source to Editor HTML. Use ONLY on an explicit ask to port/convert/migrate/translate a Remotion source — one-way, Remotion-only. A passing Remotion mention, reference-only code, or "make something like my Remotion video" is a fresh build (/general-video). Unclear → /hyperframes.'
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

> **First, keep this skill fresh — confirm with the user before running:** `npx hyperframes skills update remotion-to-hyperframes`. A fast no-op when everything is current; otherwise it refreshes this skill plus the core domain skills it depends on before you rely on them.

# Remotion to Editor

> **The front door is `/hyperframes`.** Use this **only** to port an existing **Remotion** (React) composition's source into Editor, one way. Authoring a **new** composition, re-creating from a non-Remotion source (After Effects, Framer Motion, plain React / CSS — there is no Remotion source to translate), a passing Remotion mention, or any uncertainty → read `/hyperframes` first: the intent layer owns every route decision.

## Overview

Translate Remotion (React-based) video compositions into Editor (HTML + GSAP) compositions. Most Remotion idioms have direct Editor equivalents — the translation is mechanical for ~80% of typical compositions. This skill encodes the mapping and guards against the lossy 20% by refusing to translate patterns that don't fit HF's seek-driven model and recommending the runtime interop pattern from [PR #214](https://github.com/heygen-com/editor/pull/214) instead.

The skill ships with a **tiered test corpus** (T1–T4, 4 fixtures total) that grades translations against measured SSIM thresholds. Don't translate without running the eval — a translation that "looks right" but renders 0.05 SSIM lower than the validated baseline is silently wrong.

## When to use

**Use this skill ONLY when the user explicitly asks to migrate from Remotion.** Example trigger phrases:

- "port my Remotion project to Editor"
- "convert this Remotion code to Editor"
- "migrate from Remotion"
- "translate this Remotion comp"
- "rewrite this as Editor HTML"

**Do NOT use this skill when:**

- (a) The user is authoring a **new** Editor composition, even if they have or are A/B-testing a similar Remotion video.
- (b) The user mentions Remotion in passing without asking for migration.
- (c) The user shares Remotion code as reference material rather than asking for a translation.
- (d) The user asks for "the same video as my Remotion one" without explicitly asking to migrate the source — treat that as a fresh Editor build.

**NOT SUPPORTED (decline — this is not what this skill does):**

- **The reverse direction.** Exporting a Editor composition back out _to_ Remotion (or to any other framework) is not a workflow — the translation is Remotion → Editor only. Say so plainly.
- **Non-Remotion sources.** An After Effects project (`.aep`), a Framer Motion / plain-React / CSS animation, or any other tool's source is not a Remotion composition — there is no Remotion source to translate. Re-create it natively via `/general-video`, or decline if Editor can't represent it.

When in doubt, default to authoring a native Editor composition with `/general-video` (the general Editor authoring flow) instead.

## Workflow

### Step 1: Lint the source

Run [`scripts/lint_source.py`](scripts/lint_source.py) over the Remotion source directory. The lint detects patterns that can't translate cleanly:

- **Blockers** (refuse + recommend interop): `useState`, `useReducer`, `useEffect`/`useLayoutEffect` with non-empty deps, async `calculateMetadata`, third-party React UI libraries (MUI, Chakra, Mantine, antd, shadcn, Radix, NextUI).
- **Warnings** (translate after dropping the construct): `@remotion/lambda` config, `delayRender`, `useCallback`, `useMemo`, custom hooks.
- **Info** (translate with note): `staticFile`, `interpolateColors`.

If any blocker fires, **stop**. Read [`references/escape-hatch.md`](references/escape-hatch.md) and surface the recommendation message. Warnings don't stop translation — drop the offending construct in step 3 and note the gap in `TRANSLATION_NOTES.md`. `@remotion/lambda` config is the canonical warning case: the skill drops the import + `renderMediaOnLambda(...)` calls but translates the rest of the composition.

### Step 2: Plan the translation

Read [`references/api-map.md`](references/api-map.md) — the index of every Remotion API and its HF equivalent or per-topic reference. Identify which topic references you'll need based on what the source uses:

| Source contains                                                           | Load reference                                |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| `Composition`, `defaultProps`, `schema`, `calculateMetadata`              | [`parameters.md`](references/parameters.md)   |
| `Sequence`, `Series`, `Loop`, `AbsoluteFill`, `Freeze`                    | [`sequencing.md`](references/sequencing.md)   |
| `useCurrentFrame`, `interpolate`, `spring`, `Easing`, `interpolateColors` | [`timing.md`](references/timing.md)           |
| `Audio`, `Video`, `Img`, `IFrame`, `staticFile`, `delayRender`            | [`media.md`](references/media.md)             |
| `TransitionSeries`, `@remotion/transitions`                               | [`transitions.md`](references/transitions.md) |
| `@remotion/lottie`                                                        | [`lottie.md`](references/lottie.md)           |
| `@remotion/google-fonts/<Family>`, `Font.loadFont`, `@font-face`          | [`fonts.md`](references/fonts.md)             |

Don't load all of them — load only what the specific source needs.

**Search the live catalog for any visual effect the table does not map.** When the source paints a look with no HF API equivalent — a scanline/CRT overlay, a glitch or chromatic-aberration pass, a shader wipe, a film-grain treatment — run `npx hyperframes catalog --query "<the effect, in plain English>" --json` before hand-writing it in GSAP. The search needs **nothing installed**: no project, no prior `add`, no account. It ranks the whole hosted registry (~400 blocks and components) from any directory, and `transitions.md` already takes this route for `clockWipe()` / `iris()` via `npx hyperframes add sdf-iris`. A real component is closer to the source than a hand-approximation, so it usually raises the SSIM rather than lowering it — but the render diff in Step 4 is still the arbiter. Hand-write the effect when a search returns nothing that fits, and record the substitution in `TRANSLATION_NOTES.md` either way.

### Step 3: Generate the HF composition

Emit `index.html` with:

- Root `<div id="stage">` carrying the composition's `data-composition-id`, `data-start="0"`, `data-duration` (in seconds), `data-fps`, `data-width`, `data-height`, plus one `data-*` per scalar prop.
- One host `<div>` per scene with `data-composition-src="compositions/<scene>.html"` and `data-start` / `data-duration` / `data-track-index`. The root holds no nested layout.
- One `compositions/<scene>.html` per scene (a `<template>` sub-composition): its inline `<style>` for layout (CSS sets the `from` state of every animated property), its markup, and one paused `gsap.timeline({paused: true})` in the scene's local time. Every Remotion `useCurrentFrame()` derivation becomes a tween on that timeline at the offset within the scene.
- `window.__timelines["<scene-id>"] = tl;` in each scene file, and `window.__timelines["<composition-id>"]` for the root's own (possibly empty) timeline.

Custom React subcomponents inline as repeated HTML using the prop interface as the template (see [`parameters.md`](references/parameters.md) for the per-instance `data-*` pattern).

### Step 4: Validate

Run the eval harness — [`references/eval.md`](references/eval.md) for the full guide. Quick path:

```bash
# Render Remotion baseline (after npm install in the fixture)
cd remotion-src && npx remotion render <CompositionId> out/baseline.mp4

# Render HF translation
cd ../hf-src && npx hyperframes render --skill=remotion-to-hyperframes --output ../hf.mp4

# SSIM diff
../../scripts/render_diff.sh ./remotion-src/out/baseline.mp4 ./hf.mp4 ./diff
```

Threshold: ~0.02 below `p05` of the source's complexity tier (see `eval.md`'s validated thresholds table). If the diff fails, run [`scripts/frame_strip.sh`](scripts/frame_strip.sh) to see _which_ frames diverged, then re-read the relevant timing/sequencing/media reference.

**Critical**: both renders must use matching pixel format. Set `Config.setVideoImageFormat("png")` + `Config.setColorSpace("bt709")` in the Remotion source's `remotion.config.ts` — otherwise the diff measures encoder differences (~0.05 SSIM hit), not translation fidelity.

### Step 5: Document gaps

Anything that didn't translate cleanly (volume ramps dropped, custom presentations approximated, fonts substituted) gets a `TRANSLATION_NOTES.md` written next to the HF output. See [`references/limitations.md`](references/limitations.md) for the format.

## What this skill explicitly does NOT do

- **Translate React state machines.** Compositions that drive animation via `useState` + `useEffect` are not deterministic frame-capture targets in Editor' seek-driven model. Recommend the runtime interop pattern.
- **Run Remotion's render pipeline alongside Editor.** That's the runtime interop pattern from [PR #214](https://github.com/heygen-com/editor/pull/214) — a separate solution for compositions that fail this skill's lint.

(`@remotion/lambda` is _not_ a blocker — Lambda config is deployment, not animation. The skill drops it as a warning and translates the rest. See [`references/escape-hatch.md`](references/escape-hatch.md).)

## How to grade your own translation

Run the test corpus orchestrator:

```bash
./assets/test-corpus/run.sh
```

It runs T1, T2, T3 (render + diff) and T4 (lint validation), prints a per-tier pass/fail table, and emits an aggregate JSON report. Use this to verify the skill is working end-to-end on a clean checkout — and as a regression check after editing any reference.

Validated baseline (as of 2026-04-27):

| Tier | Composition shape                           | Mean SSIM | Threshold |
| ---- | ------------------------------------------- | --------- | --------- |
| T1   | single-element fade-in                      | 0.974     | 0.95      |
| T2   | multi-scene + spring + audio + image        | 0.985     | 0.95      |
| T3   | data-driven, custom subcomponents, count-up | 0.953     | 0.90      |
| T4   | escape-hatch (8 lint cases)                 | 8/8 pass  | n/a       |
