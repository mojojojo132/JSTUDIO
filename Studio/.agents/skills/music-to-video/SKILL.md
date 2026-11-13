---
name: music-to-video
description: "Turn a music track (an audio file, a video to pull audio from, or a track generated from a mood brief) into a beat-synced video — lyric video, slideshow, or kinetic promo. The music drives all pacing; any user-supplied images/videos are cut onto the same beat grid, and a complete video needs zero assets. Narrated pieces → the input-matched workflow (see /hyperframes). Unclear → /hyperframes."
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

> **First, keep this skill fresh — confirm with the user before running:** `npx hyperframes skills update music-to-video`. A fast no-op when everything is current; otherwise it refreshes this skill plus the core domain skills it depends on before you rely on them.

# music-to-video — one music-grounded, beat-synced video workflow

Use this skill to turn a **music track** into a beat-synced Editor video. You analyze the track once, lay out the frames, fill in a per-frame plan, and build each frame as a composition. The input is a music track plus optional user images or videos — there is **no narration and no website capture**. Typography and templates are the floor (a complete video needs zero assets); any media the user supplies is cut in on the same beat grid.

You are the **orchestrator**. Work in `videos/<project>/`. Run the steps in order and pass each **Gate** before moving on. Two steps need the user: **Step 3** (plan approval) and **Step 6** (render approval) — both are checkpoint gates per `../editor/references/brief-contract.md` (read it before Step 0): in autonomous mode, post the summary as a heads-up and proceed instead of waiting. Do every step yourself except **Step 4**, where you dispatch **one sub-agent per frame**. Keep design and motion rules out of this file — they live in `references/` and the `frame-worker` sub-agent.

`SKILL_DIR` = this skill directory. `PROJECT_DIR` = `videos/<project-name>/`.

Workflow: Step 0 setup → `hyperframes.json` + `assets/bgm.mp3`; Step 1 analyze → `audiomap.json`; Step 2 skeleton → `STORYBOARD.md` (frames, groups `TBD`); Step 3 plan → complete `STORYBOARD.md` + `frame.md`; Step 4 build → `compositions/frames/NN-*.html`; Step 5 assemble → `index.html`; Step 6 render → `renders/video.mp4`.

## Two ideas that shape everything

- **One analyzer, and you trust it.** `analyze-beatgrid.py` is the only beat analyzer — never re-measure beats with another tool or by ear. Its energy / density / rolls / onsets / silences are always reliable. Its `bpm` and `beats_sec` are reliable **only when the music is genuinely rhythmic**; on calm music the grid is a metronome the tracker imposed, so pace by phrases and energy instead and never hard-cut to it. Deciding which case you're in is each frame's `pacing` (Step 2).
- **One frame = one file; groups live inside.** Step 2 cuts the track into **frames**, and each frame becomes one composition file `compositions/frames/NN-<frame_id>.html`, built by one frame-worker. A frame can subdivide into **groups** (each a template or a motion-primitives combo). Extra density goes _inside_ a group, so **frame count tracks distinct treatments, not beats** — a fast track does not blow up the number of sub-agents.

---

## Step 0: Setup, BGM, and inputs

Goal: Establish the music source, create the Editor project, and note any user-supplied media.

**The brief starts at the intent layer.** Opening rule, in order: **(1)** `BRIEF.md` exists → read it and ask nothing it answers — its `flow`/`storyboard` derive the mode (brief contract § 1). **(2)** No `BRIEF.md` but the project exists → resume from what's on disk; never re-interrogate. **(3)** A fresh creation request that arrived here directly → read `/hyperframes` and run its intent layer (`references/intent-interview.md`): it confirms this route's must-haves (the music source, destination → aspect — `../editor/references/routes/music-to-video.md`) and announces what stays deferred — brand and genre are chosen at Step 3 by design. Write `BRIEF.md` immediately after init (never before — `init` refuses a non-empty directory) and record the preference-backed answers (`brief-format.md`). Edit requests skip all of this.

The **music is the spine** — establish one track before anything else. This skill is tuned for **fast, high-energy BGM**: a strong beat grid drives the cuts (calm tracks work, but pace by phrase rather than beat). If the user supplied audio — a music file, or a video to pull audio from — use it. Otherwise choose the mood from the request and generate a track through `/media-use` (`references/bgm.md`). Before the first authenticated provider action, run `npx hyperframes auth status` and relay its output verbatim. If signed out, apply one branch:

- **Collaborative:** wait for sign-in or an explicit choice to continue offline with the local provider.
- **Autonomous:** state the status and continue through the available local provider.

If no offline provider can satisfy the required music capability, surface the blocker. Never write keys into a per-repo `.env`. Auth ownership and offline fallbacks live in `/media-use` `references/setup-providers.md` § Providers. The resulting track lands at `assets/bgm.mp3`. Stage supplied images or videos so frames can use them on the beat grid; otherwise typography carries the video.

**Lyric videos:** for lyrics synced to the vocals, get word/line timing by transcribing the track via `/media-use`, or ask the user for the lyrics text and place lines on the beat grid.

Initialize only if `hyperframes.json` is missing. Name `<project>` from the brief in kebab-case, such as `midnight-drive-loop` — never a timestamp. `init` checks the installed skills against the latest on GitHub and updates the global set if any are out of date.

```bash
npx hyperframes init "videos/<project>" --non-interactive --example=blank --skill=music-to-video
mkdir -p "$PROJECT_DIR/assets" "$PROJECT_DIR/renders"
cp "<user-music>" "$PROJECT_DIR/assets/bgm.mp3"   # extract from a video first if needed
# only if the user gave you images/videos:
node <SKILL_DIR>/scripts/stage-assets.mjs --from <dir> --hyperframes "$PROJECT_DIR" --into public
```

The **brand** (font + palette) is chosen at Step 3, not here. Don't pick a genre or a track type up front — assets are just an optional ingredient, and the genre emerges from the per-frame choices.

**Gate:** `hyperframes.json` + `assets/bgm.mp3` exist; aspect / length / fps and (if any) the asset inventory are noted.

---

## Step 1: Analyze the music

Goal: Produce the one canonical timing analysis the whole video is built on.

`analyze-beatgrid.py` is the **only** beat analyzer — never re-measure beats with another tool or by ear. It reads the track once and writes `audiomap.json`: energy phases (level / density / feel), onsets + `onset_rate`, rolls, silences, `hard_stops`, `key_moments`, phrases, tempo / grid, and `audio.duration_sec`. It's deterministic — the same file always gives the same map. Most fields are reliable on any music; `bpm` and `beats_sec` are reliable only when the music is genuinely rhythmic, and judging that is the call you make at Step 2.

Prerequisites: Python 3 with `librosa`, `numpy`, and `soundfile` available. If import fails, install them into the active Python environment before running the analyzer:

```bash
python3 -m pip install librosa numpy soundfile
```

```bash
python3 <SKILL_DIR>/scripts/analyze-beatgrid.py "$PROJECT_DIR/assets/bgm.mp3" \
  -o "$PROJECT_DIR/audiomap.json" --print
```

**Gate:** `audiomap.json` exists; `audio.duration_sec` is known.

---

## Step 2: Frame skeleton (structure only)

Goal: Read the music and lay out the frames — the skeleton of `STORYBOARD.md`.

Read [`references/frame-skeleton.md`](references/frame-skeleton.md). Turn `audiomap.json` into the **skeleton** of `STORYBOARD.md` yourself — there is no intermediate JSON. Cut the track into **frames** at real musical changes (`hard_stops`, SURGE / DROP `key_moments`, the edges of a roll, a stretch with no onsets, a big energy jump), snapping every boundary to an audiomap anchor. For each frame set `span_sec`, `pacing` (the verdict from Step 1's trust call — `beat_cut` when the grid is real, `phrase_flow` when it's a metronome imposed on calm music), `mood`, and a one-line `feel` (the plain music situation Step 3 matches a template against). Only classify and lay out here: leave every frame's `### Groups` as `TBD (Step 3)` and the frontmatter `style` blank — no templates, copy, color, or fonts. Expect ~1–6 frames.

**Gate:** frames tile the track (first at 0, last at `duration_s`); each carries `span_sec` + `pacing` + `mood` + `feel`; every `### Groups` is `TBD`; no content anywhere.

---

## Step 3: Fill the plan (user-gated)

Goal: Turn the skeleton into an approved, complete `STORYBOARD.md`.

Read [`references/planning.md`](references/planning.md), [`storyboard-format.md`](references/storyboard-format.md), [`template-catalog.md`](references/template-catalog.md), [`motion-primitive-catalog.md`](references/motion-primitive-catalog.md), and [`montage.md`](references/montage.md) (only if the user supplied assets). Editing the same file in place, do two things:

1. **Pick the brand.** Choose one preset from `../editor-creative/frame-presets/` using the table in `../editor-creative/references/design-spec.md` (match the track's mood; **only its fonts and colors matter** — templates own composition). Copy it into `frame.md` **unmodified** and fill the frontmatter `style` (font + a ≤4–6 swatch palette) from it.
2. **Fill every frame.** Decide its groups and give each a treatment: a matched template from the catalog (with bound params and real audiomap anchors), a free-compose from the primitive catalog, or an asset treatment that **obeys `pacing`**. **Before you free-compose a named look, search the live catalog for it**: for every look, effect, treatment or transition the user asked for — "CRT scanlines", "glitch", "film grain", "shimmer sweep" — run `npx hyperframes catalog --query "<the look, in plain English>" --json` and read the top results. `template-catalog.md` and `motion-primitive-catalog.md` list only this skill's own local materials; the search ranks the whole hosted registry (~400 blocks and components) and needs **nothing installed** — no project, no prior `add`, no account. Free-compose a look only after a search for it came back with nothing that fits. Write the copy. You own WHAT (template / primitives + content + anchors); the frame-worker owns HOW — **never write millisecond tweens into the storyboard**.

```bash
node <SKILL_DIR>/scripts/validate-plan.mjs --storyboard "$PROJECT_DIR/STORYBOARD.md" \
  --audiomap "$PROJECT_DIR/audiomap.json" --templates <SKILL_DIR>/references/templates
```

Fix every `✗` (hard errors: duration mismatch, frames not tiling the track, a missing `src`); warnings are best-effort. Then present the frame-by-frame summary in chat as a proposal (`../editor/references/review-loop.md` § 1) and iterate on the user's replies until they approve; for `storyboard: yes`, also write it as `storyboard.html` (`../editor-creative/references/storyboard-recipe.md` § 3) for them to open. In autonomous mode this is a checkpoint gate: post the summary as a heads-up and proceed (the `validate-plan.mjs` pass is a quality gate and still blocks).

**Gate:** `frame.md` is a verbatim preset copy; `validate-plan.mjs` exits 0; the user approved the plan (autonomous: the summary was posted as a heads-up).

---

## Step 4: Build frames from the plan

Goal: Build every frame as a self-contained composition file.

Create `compositions/frames/`. Read [`sub-agents/frame-worker.md`](sub-agents/frame-worker.md) and `../editor/references/subagent-dispatch.md`. Dispatch **one frame-worker per frame**, in parallel where possible (otherwise in waves). Each worker gets exactly one frame and this context:

```text
PROJECT_DIR: <abs path>
frame_id: <NN-frame_id>              # = the frame file stem, e.g. 02-f2; the composition id
Your block: the `## Frame N — <frame_id>` block in PROJECT_DIR/STORYBOARD.md
audiomap: PROJECT_DIR/audiomap.json
frame.md: PROJECT_DIR/frame.md
Materials: for each group, <SKILL_DIR>/references/templates/<id>/index.html (templates) and
           <SKILL_DIR>/references/motion-primitives/<id>/ (free); staged assets/ (asset groups)
Contracts: ../editor-core/references/sub-compositions.md + determinism-rules.md
Canvas: <w>×<h>   Pacing: <beat_cut|phrase_flow>
Write to: PROJECT_DIR/compositions/frames/<frame_id>.html
```

The worker forks the cited materials, converts every anchor to frame-local seconds (`local_t = track_t − span_sec[0]`), gates its groups with 0ms cuts, and writes one seek-safe frame file. **The worker never runs the `hyperframes` CLI** — those commands operate on the assembled project, which doesn't exist yet, so they'd report on the wrong files. The worker just writes to the contract and stops; you verify after assembly (Step 6). As each worker returns, you can confirm its file landed on disk.

**Gate:** every frame has its `compositions/frames/NN-*.html` on disk.

---

## Step 5: Assemble

Goal: Wire the built frames + BGM into the playable `index.html`.

`assemble-index.mjs` is deterministic — no subagent, no judgment. It references each frame file at its cumulative `data-start`, mounts `assets/bgm.mp3` on track 11, and hard-cuts frame → frame (frames tile the track with no gaps, so there is **no transition injector**).

```bash
node <SKILL_DIR>/scripts/assemble-index.mjs --storyboard "$PROJECT_DIR/STORYBOARD.md" \
  --hyperframes "$PROJECT_DIR" --audiomap "$PROJECT_DIR/audiomap.json"
```

Fix any `✗` it reports — a missing or blank frame file means that worker wrote a partial file; re-dispatch it (Step 4) and re-assemble.

**Gate:** `index.html` exists; total duration == `audiomap.audio.duration_sec`.

---

## Step 6: Verify and render

Goal: Verify the assembled video, get user approval, and render the final MP4.

Run the CLI on the **assembled project** — that's the correct unit (the per-frame workers couldn't run it). `check` runs structural lint and the headless-browser runtime, layout, motion, and contrast gate in one pass; `--snapshots` also emits the review frames.

```bash
( cd "$PROJECT_DIR" && npx hyperframes check . --snapshots )
```

Inspect at `t=0`, each frame start, the strongest DROP / SURGE, every `hard_stops[].t`, and the final frame. On failure, make the **cheapest safe fix** yourself: edit the offending `compositions/frames/NN-*.html`. Never change duration or audio timing to hide a sync issue. Once the gates pass, pause for user review, then render only on approval (autonomous mode: ask the one kept question — "preview first, or render?" — then deliver the MP4 with the contact sheet):

```bash
( cd "$PROJECT_DIR" && npx hyperframes render . --skill=music-to-video -q draft -o renders/video.mp4 --fps 30 )
```

**Gate:** `check` passed and the snapshots were inspected; the user approved (autonomous: checks passed and the delivery includes the contact sheet); `renders/video.mp4` exists with audio, duration == `audiomap.audio.duration_sec`. The final reply states the MP4 path and duration.

---

## Resume table

| You have                   | Continue from |
| -------------------------- | ------------- |
| `assets/bgm.mp3` only      | Step 1        |
| `audiomap.json`            | Step 2        |
| `STORYBOARD.md` (skeleton) | Step 3        |
| `STORYBOARD.md` (complete) | Step 4        |
| all frame files            | Step 5        |
| `index.html`               | Step 6        |

## Quick Reference

**Formats:** landscape `1920x1080` by default; portrait `1080x1920`; square `1080x1080`. Set the canvas once in the storyboard frontmatter (`canvas: { w, h, fps }`).

**Scripts** under `scripts/`: `analyze-beatgrid.py` (the one analyzer), `validate-plan.mjs` (plan check), `assemble-index.mjs` (index assembly), `stage-assets.mjs` (stage user media), `lib/storyboard.mjs` (vendored parser). Everything else is the `hyperframes` CLI.

| Read                                                                                                           | When                                                    |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`references/frame-skeleton.md`](references/frame-skeleton.md)                                                 | Step 2: read the music, lay out the frames, set pacing  |
| [`references/planning.md`](references/planning.md) · [`storyboard-format.md`](references/storyboard-format.md) | Step 3: pick the brand, fill each frame, write the plan |
| [`references/template-catalog.md`](references/template-catalog.md)                                             | Step 3: pick a template per group                       |
| [`references/motion-primitive-catalog.md`](references/motion-primitive-catalog.md)                             | Step 3/4: L0 recipes for free-compose                   |
| [`references/montage.md`](references/montage.md)                                                               | Step 3/4: asset treatments (beat-cut / ken-burns)       |
| [`sub-agents/frame-worker.md`](sub-agents/frame-worker.md)                                                     | Step 4: dispatch + build one frame                      |
| `../editor/references/subagent-dispatch.md`                                                               | Step 4: dispatch sub-agents safely                      |
| `../editor-creative/references/design-spec.md`                                                            | Step 3: pick the preset (the brand)                     |

## Directory layout

```
music-to-video/
  SKILL.md
  references/   frame-skeleton.md · planning.md · storyboard-format.md
                template-catalog.md · motion-primitive-catalog.md · montage.md
                templates/<id>/          { index.html (+ assets/ · program.json) }  ← L1 catalog impls
                motion-primitives/<id>/  { index.html (mounts the scene), scene.html (the sub-composition) } (+ ../assets/gsap.min.js shared by recipes) ← L0 catalog impls
  scripts/      analyze-beatgrid.py · assemble-index.mjs · validate-plan.mjs · stage-assets.mjs · lib/storyboard.mjs
  sub-agents/   frame-worker.md   ← the one subagent (one per frame)
```
