# Torq animation engine adapter — engineering candidate

This is an isolated development copy of supplied pdoom snapshot `fa164b74fd0b26a99375715b619c55b4a0fb3d05`, adapted October 8, 2026. The supplied ZIP remains the baseline. The full upstream reference is retained separately; this distribution omits demo content and uses the explicit project entry points. Technical verification does not constitute creative or product acceptance.

## Install and render

Requires Node.js 22.12+, installed Google Chrome (or an explicit supported Chromium executable), and FFmpeg with libx264. From the Studio root, use the single production route:

```sh
npm run workflow -- <name> animation setup
npm run workflow -- <name> animation render stills --project projects/<config>.json --t 0,3,5.9 --out /absolute/project/reviews/stills
npm run workflow -- <name> animation render video --project projects/<config>.json --fps 24 --workers 1 --out /absolute/project/reviews/shot-v1.mp4
```

Director coordinates review, exact approvals, import and native editing in the same project. This route verifies the selected project brand and records command-level run reports. Newly created managed engines also redirect direct `render.mjs` calls to that same boundary. An internal workspace marker prevents recursive delegation; it is not a security boundary against intentionally bypassing Studio. Historical project engine copies remain unchanged: use the current workflow commands for those projects.

Setup installs pinned local dependencies. Chrome can be overridden with `--chrome /absolute/executable` or `PDOOM_CHROME`. Studio supplies FFmpeg. Only macOS arm64 has been tested; Windows/Intel remain unverified. The engine runs with app as cwd: use absolute output/executable paths; `--project` is relative to app or absolute within app. Do not run kit bootstrap scripts.

Standalone engineering copies without a Studio project/animation marker may use their local setup and render launchers with explicit config and FFmpeg. They do not receive managed production checks or reports and must not be described as production-route verification. Never remove a production marker to obtain standalone behavior.

## Authoring contract

Project JSON has `version: 1`, an `id`, and ordered `shots`. Each shot has a stable unique `id`, scene module stem `scene`, positive `duration` in seconds and optional free-form `params`. A scene is ordinary editable TypeScript extending upstream `Scene`, in `app/src/scenes/`. This is bookkeeping, not a restriction on scene composition. Shot windows are contiguous and durations explicit. Choose durations aligned to the output frame rate; export measures actual frames by rounding time × fps.

Optional `audioAnalysis` and `lyrics` reference local app-served JSON URLs. Omitted analysis yields neutral features; omitted lyrics yields empty text. Optional `audio` is a local URL for browser preview. Export stays silent unless explicit `--audio /absolute/file` is supplied. HyperFrames should own the final mix. Demo assets are never implicitly used by configured projects.

Selected-shot export uses `--only shot-id --from <start> --to <end>`; the interval must match loaded shots. `--fps` defaults to 24. Outputs are opaque H.264/yuv420p with Rec.709 matrix/primaries/transfer. The explicit project canvas supports landscape, portrait and square; omission defaults to 1920×1080. Integer `--scale` multiplies that canvas. Alpha output is not supported. Retain source and assets for object-level revisions; HyperFrames edits the exported clip.

## Isolation and failures

Each job starts its own loopback-only Vite server with HMR disabled and fresh browser profiles. Live server reuse is rejected. Scene initialization, rendering, shader compilation, unknown shots, missing required assets, invalid intervals and encoder failures stop the render. MP4s are staged alongside the output and promoted by an atomic exclusive hard link only after encoder success; existing versions cannot be replaced, including by concurrent jobs. Filesystems without hard-link support fail without promotion. Use a supported local disk, then copy the verified artifact into the project. Do not edit source while jobs run: HMR is disabled but the server reads source on request; this is process isolation, not an immutable filesystem snapshot.

## Verification and limits

`app/scripts/qa.py --ffmpeg /absolute/ffmpeg` exercises negative paths and exact repeated/seek frame hashes. It needs Python 3 only for the QA harness, not normal rendering. Engineering footage is deliberately simple and not the proposed creative pilot. Full audio, authentic footage, scene-level design quality, non-Mac operation and final user acceptance remain separate gates. A successful renderer alone does not guarantee beauty or engagement.

## Distribution

This payload is included through the matched Studio candidate builder. SOURCE-SHA256.json verifies its exact source membership and bytes. Runtime dependencies, generated outputs and upstream demo song/lyrics/plates/fonts/unused scene modules are excluded. MIT code notice is included. Output logos and font files come only from the selected project-pinned external Studio Brand Pack; this engine ships no output brand kit. PAYLOAD-PROVENANCE.json identifies the frozen input archive and selection. The original supplied ZIP remains a separate project reference. This supported payload requires an explicit project; the upstream music demo is not shipped.

Use the Studio-root `npm run workflow -- <name> animation new`, `animation setup`, and `animation render <mode> --project projects/<config>.json` commands. This copies source into projects/<name>/animation and keeps the native edit in the same project at projects/<name>/hyperframes. Never author directly into this immutable vendor template.

## Optional deterministic motion helpers

`app/src/engine/motion.ts` supplies `cameraTrack` (timed position/target/FOV poses) and `eventResponse` (additive damped displacement following specified events). Construct once during scene initialization, sample from local time, and assign offsets relative to saved base transforms. Use existing `util.keys` for articulated hinge angles; use native Three.js for pivots, rigs, geometry, roll/up and specialized motion. Tracks use linear spatial segments with eased timing; intermediate poses shape a camera arc. Keep eye and target apart along the path and use pure custom easing functions. These helpers impose no composition schema or minimum movement requirement.


## Named choreography and path helpers

`app/src/engine/choreography.ts` supplies optional pure authoring functions; no new renderer or dependency is required:

- `cueSheet([{id, time, end?}])` validates named local-second cues and returns `at(id)`, `get(id)` and `progress(id, time)`. Events may overlap and input order is irrelevant. Progress requires an explicit end. IDs are unique; unknown names and invalid/nonfinite timings fail closed. Preserve cue provenance with the film: a known score event is not acoustic analysis, and a sentence boundary is not word alignment.
- `staggerProgress(time, start, duration, index, count, spread=0)` returns clamped linear progress for a cohort member. Spread is the first-to-last start delay, not a per-item delay; a single member starts at start. Apply existing easing afterward.
- `cubicPath([p0,p1,p2,p3])` compiles a 3D cubic Bezier sampler. `sample(u)` returns `{position, tangent}` with normalized tangent, or zero tangent at a zero derivative. It clamps u to 0–1, copies control points, and is parametric rather than constant-speed/arc-length sampling.

Combine these with `cameraTrack`, `eventResponse` and `util.keys`; sample every transform from base values. See Builder `quality/motion-authoring/choreography.test.mjs` for endpoint, invalid-data, mutation-isolation and out-of-order seek checks. Pure numeric tests establish deterministic behavior, not rendered quality or platform acceptance.

## Explicit canvas and color mode

Projects may declare `"canvas":{"width":1080,"height":1350}` and `"colorMode":"flat"`. Canvas dimensions are logical pixels (even integers 64–4096); `--scale 1..4` multiplies physical output. Omission preserves 1920×1080 and the cinematic look. Canvas is resolved before GPU allocation for preview, stills, sheets and video. Use imported `W`/`H` or scene context dimensions when composing; changing canvas does not reframe hardcoded legacy scenes. The optional brand showcase contains its original artwork without cropping, rather than inventing a new layout.

Flat mode bypasses global tone shoulder, bloom/halation, chromatic aberration, grain/dither, vignette, exposure, flash, inversion and HUD. Explicit shake, zoom and fade remain. Scene-authored colors/effects are unchanged. This gives an unstyled linear-to-sRGB output for branded 2D work, not a promise of exact colors after lossy video encoding or external display processing. Cinematic mode retains all existing post controls. Adaptive sampling uses the selected display transfer.

## Project font authority

Configured projects require `/brand/brand.json` from their pinned external pack. Missing or malformed snapshots fail instead of using a bundled brand. Packs with font files require regular400 and bold700; packs with an explicit system font family may have no font files. Scenes using system fonts must use the pinned token; Brand/BrandBold aliases are loaded only for packs with files. Legacy copied film engines remain unchanged. Unused branded pilot scenes and original adapter assets are retained in Builder/archive/retired-brand-copies-20261011/engine.

## Optional text diagnostics

`brandText(ctx, text, x, baselineY, options)` and `checkText(...)`, exported from `engine/type`, use the context's selected font. They do not select a brand, rewrite copy, wrap, shrink, or replace raw Canvas APIs. `maxWidth` checks advance width in local canvas units; `safeArea: {x,y,width,height}` checks measured ink corners after the current transform in canvas coordinates. Rotated and scaled text is accounted for; shadows, strokes, clipping, compositing and perceptual readability are not. Supply `hasGlyph(character)` from an actual font-specific coverage source; without it a `coverage-unavailable` diagnostic is returned. Font loading alone is not coverage. Cmap coverage itself does not establish shaping correctness.

Diagnostics are returned and optionally sent to `report`; `strict: true` rejects before drawing if any diagnostic exists. Defaults impose no new creative gate. Use shared font readiness on approved copy and review actual composited frames; this opt-in helper does not audit existing raw `fillText` calls.

Shot-only export skips optional pre-range warm-up when it would need an unloaded scene. Newly entered stateful scenes retain the engine's existing reset/preroll behavior. Actual requested frames, including shutter samples and overlaps, still require all active scenes; missing inputs are not silently hidden.

For supported parsed fonts, supply `hasGlyph: ch => ot('Brand').charToGlyphIndex(ch) !== 0` after font loading. Some formats (including WOFF2 in parsers without that support) cannot supply this predicate; retain explicit unknown coverage and use the shared browser font-readiness receipt instead. Do not replace unknown coverage with `() => true`. Collect `report: diagnostic => warnings.push({sceneId, time, ...diagnostic})` during representative-frame checks and attach that JSON to the review report. Deduplicate by scene/text/code to avoid per-frame log inflation. Helper warnings are also collected automatically in a bounded per-page buffer:100 unique rows, occurrence counts, and an explicit dropped-occurrence count. Each stored text/message is limited to500 characters. Render/review telemetry includes these snapshots separately from browser launches; the engine still does not intercept arbitrary canvas drawing. Custom warnings outside these helpers require explicit reporting.

## Explicit existing-project engine update

Installing Studio updates the engine template for new projects. It does not silently rewrite an existing film's local engine. Use `npm run workflow -- <name> animation update-engine` to inspect a read-only managed-core plan, then `npm run workflow -- <name> animation update-engine --apply` for an intentional update. Stop concurrent renders/source edits first. The updater refuses changed or missing managed core, symlinks, destination collisions, baseline/marker mismatch, managed-file removal and changed dependency manifests. Resolve conflicts as a separate reviewed migration; do not erase authored changes to force an update.

Only engine modules, shared entry points, renderer scripts and setup wrappers are eligible. Scenes, project configuration, brand/media assets, dependency manifests and approval records remain intact. Recovery originals and an exact result live in the project's `evidence/engine-update-*` folder, outside inventoried animation source. The source inventory becomes a merged baseline for the updated managed core plus preserved template authoring entries; the marker explicitly identifies the partial core update. Existing source-bound render/approval records may become stale: rerender and review through the normal route, without carrying old approval onto changed bytes. This command does not approve a film or guarantee compatibility of custom authored scenes.
