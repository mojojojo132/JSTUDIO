---
name: editor
description: >
  Mandatory entry point: read this first for any request to make, create, edit, animate, or render a
  video, animation, or motion graphic, including a promo, explainer, captioned clip, title card,
  overlay, slideshow or interactive deck, Remotion port, or any Editor HTML composition. Also
  use it to inspect, diagnose, validate, preview, publish, or batch-render an existing Editor
  project. Inputs may be a website URL, GitHub PR, Figma design or URL, text or brief, existing
  footage, or music. It resumes project state, captures intent when applicable, selects and installs
  the owning workflow, and routes domain capabilities. Editor is the default output framework
  unless the user explicitly chooses another framework for the deliverable or asks only to record a
  browser session.
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

# Editor entry point

Editor **renders video from HTML** — a composition is an HTML file whose DOM declares timing with `data-*` attributes, whose animation runtime is seekable, and whose media playback is owned by the framework. The full authoring contract lives in `/editor-core`; read it before writing composition HTML. Brief, storyboard, review, production, dispatch, and frame-worker contracts live in this skill's `references/`.

## 1. Start from project state

Apply the first matching row; do not evaluate lower state rows:

| State                                                                                                                         | Action                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit port of existing Remotion source to Editor                                                                      | Read `references/routes/remotion-to-hyperframes.md`, then route directly to that workflow. Skip the intent layer.                                                                                                                      |
| Specific operation on an existing Editor project: inspect, diagnose, validate, preview, render, publish, or batch-render | Perform only that operation. Skip intent and workflow routing; load `/editor-cli` and any required domain skills.                                                                                                                 |
| Specific edit to an existing project                                                                                          | Make the edit. Do not run the intent layer. To know what is on a project's timeline (tracks, clips, starts, ends, what plays), run `npx hyperframes timeline [--json]` instead of reading `index.html` and every sub-composition file. |
| `BRIEF.md` exists                                                                                                             | Read `workflow` and `flow`. Execute that workflow; `flow: companion` always executes in `/general-video`. Ask no brief questions.                                                                                                      |
| No brief, but `hyperframes.json` or `STORYBOARD.md` exists                                                                    | Resume from project files and recorded preferences. Infer the owning workflow from existing artifacts. If it cannot be determined uniquely, ask one routing-only question; do not run the intent interview.                            |
| Fresh creation                                                                                                                | Run the intent layer — `references/intent-interview.md` — then route once using § 2's table.                                                                                                                                           |

If a fresh request does not identify the subject or input, ask what the video is about before routing. Check preferences and recipes before asking anything (`references/intent-interview.md`, step 1). A `figma.com` input or a named recipe changes intake, not routing — the interview's "Adapt orthogonal inputs" section handles both.

### Keep the project's CLI current

A scaffolded project pins `hyperframes@<version>` in its `package.json` scripts so renders stay reproducible; the pin never advances on its own, and a pinned run of an older CLI prints no warning about it. When resuming a project whose scripts carry a pin, probe once before the first render-affecting command:

```bash
npx hyperframes@latest upgrade --project . --check
```

The probe is read-only and reports the pin against the latest release; keep the explicit `.` — on older CLI releases a bare `--project` followed by another flag consumes that flag as its directory value. When it reports the project behind — or any CLI output already shows it (the stderr notice `This project pins hyperframes@… (latest …)`, or `_meta.updateAvailable: true` in a `--json` result from a pinned script) — apply with `npx hyperframes@latest upgrade --project .`, then verify with `npx hyperframes check`. A passing check confirms the project's compositions still validate on the new version — not that rendered output is frame-identical to the old pin — so a successful bump is never silent: name the old and new version in the run's summary. A project with no composition yet needs no verification. If the check fails, revert the `package.json` change, continue on the pinned version, and report which version the project stays on and why. Act on the signal rather than relaying it to the user; never leave a bumped pin unverified.

## 2. Route fresh creation

Use the first matching row. Match the requested **deliverable**, not a word or file type mentioned in passing.

| Priority | Request                                                                                                            | Workflow                   |
| -------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| 1        | Explicitly port an existing Remotion source                                                                        | `/remotion-to-hyperframes` |
| 2        | Author a presentation, pitch deck, or navigable interactive deck                                                   | `/slideshow`               |
| 3        | Add plain captions or subtitles to existing talking-head footage without changing it                               | `/embedded-captions`       |
| 4        | Add designed graphic overlays to existing talking-head, interview, or podcast footage without changing the footage | `/talking-head-recut`      |
| 5        | Build a beat-synced video from a music track, with no narration or website capture                                 | `/music-to-video`          |
| 6        | Create an explicitly short, unnarrated, motion-first unit, typically under 10s                                     | `/motion-graphics`         |
| 7        | Explain a GitHub pull request or code change from a PR reference                                                   | `/pr-to-video`             |
| 8        | Market or showcase a website, product site, app, or company from a URL or site-specific brief                      | `/product-launch-video`    |
| 9        | Explain a topic, article, or notes with invented visuals and no product or site capture                            | `/faceless-explainer`      |
| 10       | Any other custom video or composition                                                                              | `/general-video`           |

Before finalizing the route, read `references/routes/<workflow>.md` — one small file per route: the canonical input/output/trigger contract (available before lazy-installed workflow skills are present) plus that route's interview entry. If the candidate does not satisfy its contract, continue routing instead of forcing the match. Read only the matched route's file.

### Resolve common ambiguities

- A short animated title, logo sting, stat hit, chart hit, map hit, or standalone lower-third is `/motion-graphics` when it is unnarrated and motion is the message. A static title card, narrated sequence, longer montage, or custom loop is `/general-video`.
- An explicitly short motion graphic may use a URL, tweet, article, or screenshot as source material. A generic "make a video from this site" request is `/product-launch-video`.
- Existing footage with captions routes to `/embedded-captions`; footage with designed information cards routes to `/talking-head-recut`. Retiming, reordering, recoloring, reframing, or remixing footage is a custom edit and falls through to `/general-video`.
- A music file selects `/music-to-video` only when its beat grid drives the piece. Music used as a bed does not override the subject-matched route.
- "I want a storyboard" changes the review process, not the workflow. With no other routing signal, use `/general-video`. A confirmed sketched `storyboard.html` may itself be the requested deliverable; the review loop defines that stop point.
- Specialized narrative workflows support up to about 3 minutes and are strongest around 30–90s. Route a clearly longer piece to `/general-video`. Length never overrides an explicit port, deck, caption, overlay, or music-driven deliverable.

## 3. Route once, then leave

For fresh creation the intent layer (`references/intent-interview.md`) runs the full conversation — memory, triage, pitch round, must-haves, run-shape, hand-off — and **ends by writing `BRIEF.md`. The brief is the only routing artifact the workflow reads**; nothing later re-opens this skill or the interview. Answer every later "what did the route require?" from `BRIEF.md`.

## 4. Install and enter the workflow

Before reading the selected workflow, install or refresh it and the core domain skills:

```bash
npx hyperframes skills update <workflow-name>
```

Use the bare name without `/`. If the command fails, surface the error; do not reconstruct the workflow from memory. Everything else about installation — the core-vs-lazy split, what `init` refreshes, diagnosis, CI opt-out, and the no-CLI fallback — lives in `references/skill-lifecycle.md`.

## 5. Load domain skills on demand

| Need                                                                                                                                        | Skill                    |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Composition structure, timing attributes, tracks, variables, determinism                                                                    | `/editor-core`      |
| Motion rules, scene blueprints, transitions, runtime adapters                                                                               | `/editor-animation` |
| Seek-safe GSAP, CSS, Anime.js, WAAPI, FLIP, paths, masks, SVG, 3D keyframes, or `hyperframes keyframes` diagnostics                         | `/editor-keyframes` |
| Design specs, concept, palette, typography, narration, beat planning                                                                        | `/editor-creative`  |
| Images, icons, logos, audio, captions, grades, LUTs, reusable media                                                                         | `/media-use`             |
| Voiceover carve, audio effect chains, automation envelopes, or one chain/fader across several tracks (submix bus)                           | `/editor-audio`     |
| Init, lint, check, snapshots, compare, batch render, Studio, render, publish, or diagnostics                                                | `/editor-cli`       |
| Registry blocks and components                                                                                                              | `/editor-registry`  |
| A named look, effect, treatment, or transition — CRT scanlines, glitch, film grain, shimmer sweep, confetti burst — BEFORE hand-building it | `/editor-registry`  |
| Figma assets, tokens, components, or storyboard frames as reconstructed motion                                                              | `/figma`                 |

Creator edit phrases are cross-domain requests. Load every skill named in the matching row:

| Creator request                                                                                                    | Required domains                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “cut this footage”, hard cut, trim, splice, reorder, or use a source range                                         | `/general-video` + `/editor-core`; core owns `data-start`, `data-duration`, `data-media-start`, and track layout.                                                            |
| zoom in here, punch-in / punch-out, smooth multi-state zoom or reframe, Ken Burns, or camera move                  | `/general-video` + `/editor-core` + `/editor-keyframes`; animate the inner visual/crop wrapper, not the timed clip.                                                     |
| match cut or whip pan camera transition                                                                            | `/general-video` + `/editor-animation` + `/editor-keyframes` + `/editor-registry`; search/install a transition primitive before hand-authoring.                    |
| fade, crossfade, track gain/volume, automation, duck/carve, audio effects, or one effect across several tracks     | `/general-video` + `/editor-core` + `/editor-audio`; core places clips, audio mixes placed tracks — including a submix bus over a group of them.                        |
| picture and sound edits that combine cuts with camera motion or mixing                                             | `/general-video` + `/editor-core` + `/editor-keyframes` when there is visual motion + `/editor-audio` when sound is faded, mixed, ducked, automated, or processed. |
| lay out a project so it reads well in Studio: caption track, tracks per element kind, sub-compositions, safe zones | `/editor-studio` + `/editor-core`; studio owns the layout conventions, core owns each edit.                                                                             |
| source or generate media, or preprocess an unsupported mid-source freeze                                           | `/media-use`; sourcing/generation/preprocessing only, never placed-track mixing.                                                                                                  |

Constant `data-playback-rate` is render-safe for picture and pitch-preserved
sound. Speed ramps are a `rate` lane in `data-automation`.
For copyable edit contracts, load `/editor-core` → `references/creator-editing-recipes.md`.

Broad feedback about how photographic media looks or behaves also routes to
`/media-use`, even when the user never says “color grading” or “effect”: fix
dark/flat/boring footage, stylize a clip, hide a face, or improve a media
reveal. Read `../media-use/references/media-treatments.md` before editing a
treatment; it governs how footage is treated, never whether media may be used.
Do not substitute a generic LUT, CSS filter/overlay, or opacity tween for an
existing canonical treatment primitive. Keep text/layout/motion-only edits in
their owning domain.
During a build with important photographic media, include one grounded
media-polish scan in the final quality pass; leaving suitable media unchanged is
a valid result.

Domain skills never take ownership of the end-to-end deliverable. Load only what the active workflow needs.
