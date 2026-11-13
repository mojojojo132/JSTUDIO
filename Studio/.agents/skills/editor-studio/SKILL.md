---
name: editor-studio
description: >
  Use when building or editing a Editor project that people open in
  Studio: how the timeline should be laid out so it reads well (one caption
  track, one element kind per track, every scene a sub-composition) and where
  captions and key content may sit (safe zones). Don't use for how to perform an
  individual edit (split, trim, retime, volume, copy, swap): that is
  `creator-editing-recipes.md` in `/editor-core`.
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

# Editor Studio conventions

Studio draws one timeline row per top-level element. A project that follows the
rules below opens as a short, readable timeline; one that does not opens as a wall
of unlabeled rows the user cannot edit. These are conventions for what to build.
For how to change a clip, follow `/editor-core` `references/creator-editing-recipes.md`
and never invent a different form of the same edit.

## 1. Every scene is a sub-composition

The root composition holds only timed hosts, media and audio. Any scene with nested
structure (a div containing children, a title with a subtitle, a chart) is its own
file loaded with `data-composition-src`, wiring in
`references/sub-compositions.md`.

Nested markup left inside the root does not become a row of its own. It hides inside
one opaque row that cannot be trimmed or moved part by part.

Author as if a structure lint rejects any violation.

## 2. One caption track

- All captions live on one track: a single sub-composition host (one `data-track-index`)
  marked `data-track-kind="captions"` that carries every caption group in order.
- Never one row per caption group, and never captions mixed onto a track with
  another kind.
- Word-timing rules are unchanged: see `/embedded-captions` and the `caption_*` lint rules.

## 3. One element kind per track

Group by kind so each row is one thing the user can select, mute or drag as a set.

| Kind                                    | `data-track-kind`      |
| --------------------------------------- | ---------------------- |
| Base video / A-roll                     | `video` (from the tag) |
| Scenes, overlays, graphics              | `graphics`             |
| Captions                                | `captions`             |
| Audio (voiceover, music, sound effects) | `audio` (from the tag) |

Put `data-track-kind` on sub-composition hosts. Video and audio kinds come from the tag, so
`<video>` and `<audio>` need no attribute. Give each kind its own `data-track-index`; the number
is display only; it never changes what renders on top. Use CSS for
layering.

## 4. Safe zones

Any ruler or safe-box overlay lives in the preview pane, never inside the composition, so
do not add guide elements to the HTML.
Both framings (wide and vertical) use the same two safe boxes, Premiere's defaults. The preview
toggle draws them with a tick at the midpoint of every edge. Source:
`ACTION_SAFE_PERCENT` and `TITLE_SAFE_PERCENT` in `packages/studio/src/utils/previewSafeMargins.ts`.

| Box         | Share of the frame | Inset on every edge |
| ----------- | ------------------ | ------------------- |
| Action-safe | 90%                | 5%                  |
| Title-safe  | 80%                | 10%                 |

- Safe margins: everything visible stays inside the action-safe box (90%), and captions and key content stay inside the title-safe box (80%).
- Two-up and 50/50 layouts keep each half's content inside the title-safe box.

## Checking your work

Run `hyperframes lint` and fix every finding. Then open the project in Studio and
check that the timeline shows a base row, one row per scene host, one caption row and the audio rows.
