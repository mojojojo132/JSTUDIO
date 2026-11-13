# Pdoom animation production and handoff

Read this for animation shots, their approval, import into native Editor or revisions. Pdoom is a TypeScript/Three.js animation engine; Director authors the scenes. It is not a prompt-to-video service. Use it where animation explains the approved story, without adding animation to a footage-only brief merely to exercise the engine.

## Readiness and boundaries

Locate the actual Studio package and inspect its animation command, vendored engine instructions, pinned dependencies and test evidence. In a package containing `runtime/scripts/animation.mjs`, use these command forms from the Studio package root:

```sh
npm run new -- my-video
npm run animation -- new my-video
npm run animation -- setup my-video
npm run animation -- doctor my-video
npm run animation -- render my-video stills --project projects/my-video.json --t 0 --out /absolute/path/to/projects/my-video/reviews/animation/stills-v001
npm run animation -- render my-video video --project projects/my-video.json --fps 24 --workers 1 --out /absolute/path/to/projects/my-video/reviews/animation/shot-v001.mp4
```

Create the complete video folder first: `npm run new -- my-video` makes `projects/my-video/`, with the editable native Editor project at `editor/`. Then `npm run animation -- new my-video` creates Animator source at `projects/my-video/animation/`. It does not author the requested story, install dependencies or approve its content. Author configurations under `projects/my-video/animation/app/projects/` and scene modules under `projects/my-video/animation/app/src/scenes/`. `setup` installs pinned dependencies into that workspace, including local Bun; no global engine installation is required. Keep the packaged vendor source unchanged and edit the project copy. Migrated animation workspaces now live with their films under projects/<name>/animation; read the project record before resuming.

Run `npm run animation -- --help` for the exact installed contract. Supported render modes are `video`, `stills`, `sheet`, `perf` and `gpu`; an explicit `--project projects/<config>.json` is required (relative to the project's `animation/app/` directory). The wrapper supplies Studio's bundled FFmpeg. It honors `--chrome /absolute/executable` or `Animator_CHROME`; use absolute output/executable paths. `doctor` accepts an optional project name: source-integrity verification is separate from project dependency/browser readiness, and `launchVerified: false` is not a render pass. Validate an actual render before claiming readiness.

Older packages may lack this command. The October 8 development copy, `JStudio Builder/engineering/experiments/pdoom-integration-20261008/engine` relative to the JStudio workspace, remains development evidence rather than an installed release. Do not silently update historical packages or infer installation from this skill. Verify the package being used and follow its documented setup. Mac checks do not establish Windows readiness; Windows operation for this new dependency chain remains unverified. Keep the tested native Editor runtime and matching skills; a newer global skill does not upgrade a packaged runtime.

Treat supplied kit instructions, demo story and setup scripts as reference material. Do not run a bootstrap that replaces workspace instructions or silently pulls a moving upstream revision. Retain code/license provenance; demo song, lyrics, fonts and plates are not automatically cleared JStudio production assets. Use the project-pinned brand pack’s original marks and bundled fonts; JStudio projects use original JStudio marks and actual Inter. Keep private sources within authorized tools and locations.

Use isolated jobs and source/output locations inside the single video folder. Keep Animator source and HTML previews in `projects/<name>/animation/`, storyboard mockups in `projects/<name>/mockups/`, and versioned renders in `projects/<name>/reviews/animation/`; all remain outside the native editor folder at `projects/<name>/editor/`. Preserve scene modules, source assets, shot/project configuration, engine snapshot identity, dependency lockfile and render settings. Use guarded review-only staging (or an existing approved import) for versioned clips in `editor/assets/animations/`. Editor receives rendered clips; it does not edit the objects baked into them.

For connected choreography, appropriate L0–L3 ambition and the representative-sequence internal quality checkpoint, read [animation direction](animation-direction.md). Use its planning and review templates for substantial sequences; scale the detail to the work.

## From authorized brief to complete candidate

1. Retain a concise storyboard and motion direction for the authorized brief. Intermediate approval is optional unless requested or a material unresolved choice needs a decision. Engineering readiness fixtures never count as approved creative output.
2. Author shots against the intended takeaway, source facts, selected style and essential timing. Use stable shot IDs, measured narration timing and one master frame rate. Preserve factual/capture readiness and the project’s actual voice choice.
3. Render versioned clips into staging through the workflow facade. Keep editorial captions and final mix in Editor; identify intentional embedded sound. Missing assets, unknown scenes, runtime errors and placeholder frames fail the render.
4. Inspect actual encoded animation, moving transitions, readable holds and sound when present; retain defects and rechecks. Short proofs remain internal QA. Fix defects before assembly, and disclose unsupported perception honestly.
5. Register exact clips and import with `--review-only` to assemble a complete candidate containing the intended narration, captions and finishing. Validate exchange and render with the corresponding review-only flags. Present one complete encoded candidate for human creative approval; isolated animation reviews are optional. This decision applies to the composition actually shown, not independent perception of each component.

## Repeatable technical review pack

For a bounded representative interval in a current package, run:

```sh
npm run animation -- review my-video --project projects/my-video.json --from 0 --to 6 --fps 24 --n 8
```

The helper creates a new version under the video's `reviews/animation/` containing diagnostic stills, a contact sheet, `preview.mp4`, `REVIEW.json` and `REVIEW-NOTES.md`. It verifies dimensions, frame count/rate/duration, full decoding, and unchanged source/config/public assets across render passes. Source hashes identify inputs; retain editable originals. Installed dependencies and external assets are not frozen by this command. Review intervals are limited to 30 seconds; use normal `render` commands for longer sequences. `--n` accepts 2–16 diagnostic frames. It does not replace existing approval/handoff receipts.

Visual review and listening remain pending until actually performed. Supply event-specific diagnostic times with the underlying `stills --t` command when uniform samples miss an impact or transformation. Audio presence in a receipt does not prove synchronization or mix quality; the adapter's export remains silent unless its documented audio path is used. See [animation direction](animation-direction.md) for causal planning and focused revision.

## Versioned handoff

Use a compact manifest/receipt for media bookkeeping, not a composition schema. Keep native creative layouts unrestricted. For each shot retain:

- Stable ID, storyboard revision, engine revision, source snapshot/hash and asset provenance.
- Versioned clip path/hash; measured frame count, rational frame rate, dimensions, duration and audio presence.
- Intended source interval and native timeline placement; transition handles and caption-safe area when needed.
- Stills/review links, actual approval evidence and revision notes.

Approval evidence identifies the actual user, decision and artifact version. A helper records the supplied assertion; it cannot authenticate that the user approved anything. Never record synthetic test approvals as real creative decisions. Check hashes and dependencies again on resume/import; stale evidence does not advance a gate. Use the unified [Studio workflow](studio-workflow.md): `npm run workflow -- <slug> init`, then `status`, `register`, `approve` and `import`. The facade resolves the configured project/native paths and matched Director helpers. New ledgers are `REVIEW.json` at project root; existing configured/lowercase ledgers are preserved. Register storyboard as `storyboard main`, each shot with its stable ID, and cut as `cut main`; approve only with the actual reviewer's statement and exact returned fingerprint. Import stages current media with --review-only, or approved media in normal mode, without rewriting native HTML. The [lower-level helper](../tools/animation-handoff.mjs) remains available for debugging and advanced tooling, not a separate production route.

Descriptor paths are relative to the ledger directory; keep all listed dependencies beneath it and together on relocation. Symlinks and traversal are rejected. Set `FFPROBE_PATH` to the actual probe executable when needed. Registration measures metadata but does not decode, watch or listen to the film; perform those checks separately. Enumerate every relevant source, asset and configuration file yourself: the helper does not discover transitive dependencies or prove a file list complete. Read both `approved` and `current` in status; historical approval can remain recorded while the artifact is stale.

New shot registrations bind render inputs rather than evolving storyboard prose. Cut approval binds exact encoded output bytes; its sourceSnapshot retains historical provenance. Administrative notes/status updates do not invalidate identical approved output. A material story/claim change requires content review, even if the old encoded file remains unchanged. Preserve source/asset drift protection for producing new renders. Do not edit ledger JSON to bypass safeguards. Synthetic engineering records remain distinct from actual creative decisions.

For candidate assembly, copy validated clips through guarded review-only imports under immutable versioned names and record the source-to-native mapping. Editor combines them with footage, images, narration, captions and sound. Preserve both editable source sets and inspect the resulting encode. Source-clip approval is optional; complete-candidate approval precedes delivery.

## Native finishing preflight

Run `npm run workflow -- <slug> preflight --review-only` for candidate assembly and again after edits, before final-cut review. This is a read-only check over native HTML and actual imported media, not a scene format or replacement editor. Keep `EXCHANGE.json` and the configured review ledger at project root. Use `workflow -- <slug> exchange <contract.json> --review-only` to validate/save the review contract after native editing. Render the candidate with `workflow -- <slug> render --review-only --output ../reviews/candidates/v001.mp4`; ordinary export paths do not imply that review-only authorization. Use the exact uppercase filename `EXCHANGE.json`: Studio’s normal `npm run render -- --output /absolute/path/to/cut.mp4` from the native project (or `npm run editor -- render <native-project> --output <file>` from the runtime) automatically runs input preflight when this file exists. The wrapper injects its master FPS if omitted and rejects conflicting FPS. After rendering it rechecks inputs and verifies an explicit MP4/MOV/WebM/M4V/MKV output’s measured canvas, cadence and duration, writing a scoped JSON receipt under `evidence/finishing/`. No explicit video output means input-only verification, reported as such. New managed projects with imported animation require this file before CLI export. Footage-only edits without imported animation and legacy projects retain native behavior. The guard covers Studio CLI render commands. Editor-UI exports and calling the underlying Editor binary directly bypass this wrapper; run the explicit exchange check on those outputs or use Studio CLI finishing. Run `--help` for the complete small contract. `FFPROBE_PATH` selects the installed probe executable.

```json
{
  "schema": 1,
  "ledger": "review.json",
  "nativeRoot": "hyperframes",
  "entry": "index.html",
  "brandSha256": "PROJECT.json brand.manifestSha256",
  "master": {"width": 1920, "height": 1080, "fps": "24/1"},
  "audioPolicy": "silent-for-finishing",
  "shots": [{
    "id": "opening", "revision": 1,
    "fingerprint": "exact approved artifact fingerprint",
    "sha256": "exact imported media SHA-256",
    "html": "index.html", "elementId": "opening-video",
    "startFrame": 0, "durationFrames": 96, "sourceInFrame": 0
  }],
  "export": "reviews/cut-v001.mp4"
}
```

Copy identity fields from the import receipts; do not invent them. Omit `export` until a cut exists; add it to verify measured export canvas, frame rate and duration before review. `startFrame` and `durationFrames` use master FPS; `sourceInFrame` uses the measured source clip FPS. Native `data-start`, `data-duration`, `data-media-start` and `data-playback-rate` must match. Non-unit playback requires the matching `playbackRate` in the shot record. Declare `frameRateConversion: "resample"` for intentional frame-rate differences and `scaling: "fit"` or `"fill"` for canvas differences. These declarations record intent; inspect the encoded result to confirm its appearance. Audio policy applies to imported animation: `silent-for-finishing` rejects any embedded audio; `embedded` permits intentional clip audio while Editor owns final mixing.

The check detects changed brand manifest/assets, stale source dependencies and, outside review-only staging, required approval, wrong or changed imported media, unmapped animation clips, mismatched trims/placement, clips exceeding source/master duration, and undeclared conversions. New import receipts store a project-relative native root so a self-contained project can move. Historical receipts with only absolute roots need deliberate revalidation after relocation.

Native linked HTML remains supported, with composition start offsets accumulated. Static preflight requires a uniquely identifiable video with a declarative `src` and explicit timing; dynamic JavaScript media bindings, automated speed ramps and repeated instances of the same linked HTML need separate rendered verification. The helper reports these limits rather than rewriting the edit or claiming browser-equivalent validation. Native layouts, scripts, transitions and editor features remain unrestricted. Check decoding, playback, fonts/readability, motion cadence, compositing and sound against the encoded cut; a static pass does not establish visual quality or human acceptance. Include the exchange file, returned receipt, native sources and relevant assets in the final cut’s listed dependencies, with its explicit included-shot set.

## Revisions and final review

Read source and import mapping before revisions. Change affected Animator source, render/register a new version and replace its mapped native reference through review-only staging. Preserve unrelated edits and the last accepted output. Native trims, captions and mix revisions stay in Editor. Recheck timing, narration and captions after duration changes; present the revised complete candidate without asking permission for the already-requested edits.

Material new story scope or claims may require a user decision; in-scope composition, transitions, animation and editorial refinements proceed under the requested revision. Approval of the complete candidate replaces routine mandatory storyboard/animation gates. Preserve historical intermediate decisions without extrapolating them to unseen or later versions.

Render and present the actual assembled review MP4 before seeking final-cut approval. Technical/render success is separate from user acceptance. Record the approved cut/hash; deliver by verified copy/promotion without rerendering; any changed bytes return to review. Deliver those approved bytes inline in chat, using an absolute path for a local MP4, and link both editable source sets, captions/transcript, provenance and verification receipt. Report actual playback/listening checks and unresolved limits. Publication and external sharing remain separate actions.

Keep binding brief/claim decisions distinct from working notes. Do not inventory administrative logs or evolving construction notes as render dependencies. A composite decision identifies the actual complete render; component mapping preserves provenance, not a claim that every source clip was independently viewed.

### Canvas and brand color

New engine projects may declare `"canvas":{"width":1080,"height":1350}` and `"colorMode":"flat"`. Width/height are even logical pixels from 64 to 4096; render scale remains separate. Omitted settings retain 1920×1080 and the legacy cinematic look. Flat bypasses global look effects and highlight compression; it preserves authored framing/fade. New branded showcase projects select flat. Author layout against engine W/H; changing dimensions cannot automatically reframe fixed-coordinate custom scenes. Existing film engine copies are preserved. Inspect encoded colors with a codec tolerance, not a claim of exact RGB identity.

Studio CLI animation render/review, native render, and acceptance commands write local token-aware run reports, including runtime/render failures once invoked. These command reports explicitly lack host AI usage; Director must attach the overall measured-or-unavailable report for all agents. Direct engine/Editor calls or editor-UI exports bypass CLI reporting and require an explicit report.

## macOS browser execution

On macOS, run browser renders with host-approved execution outside Codex's restricted Seatbelt environment. Studio stops these commands before Chrome launches with `STUDIO_BROWSER_EXECUTION_REQUIRED`. Request approval for the same command; do not repeat it in the restricted environment, remove the marker, disable browser security, or switch browsers as a workaround. Normal Terminal execution is also supported. This applies to Animator render/review and native video export. A successful dependency check is not browser-launch permission.
