# Production checks and candidate review

Run these commands from `Studio`. The project slug resolves through STUDIO.json. Keep each assessment/settings JSON in that project; command filenames resolve relative to its root. Existing film approvals and the native edit remain authoritative.

## Check readiness before expensive production

```sh
npm run workflow -- my-film readiness
npm run production -- my-film Director
```

Readiness finds named source/rights records, audio/caption plans and assets, and storyboard evidence. It reports discovered evidence as unverified and explains the bounded search. A missing discovery can mean the record lives elsewhere; identify it rather than creating duplicate records. Presence never establishes accurate claims, licensed media, audible dialogue or correct captions. Role packets and workflow status include the same advisory inventory.

## Inspect the encoded candidate

Save `candidate-check.json` in the project:

```json
{
  "media": "reviews/candidates/v001.mp4",
  "expect": {"streams": ["video", "audio"], "width": 1920, "height": 1080, "fps": 30},
  "analyze": {"blackFrames": true, "freezes": true, "silence": true}
}
```

```sh
npm run workflow -- my-film qc candidate-check.json
```

This measures streams and declared expectations, decodes all audio/video streams, and saves an immutable exact-file receipt in `evidence/encoded-qc/`. Failed technical checks produce diagnostics and a nonzero CLI exit. Optional black/freeze/silence detections are advisories: holds, fades and silence may be intentional. Omit the audio expectation for an intentionally silent candidate. Defaults allow long films; use `timeoutMs` to bound a command when appropriate. Technical QC cannot establish story quality or human listening.

The final review gate also requires a passing full-decode receipt for its exact candidate bytes. It reuses matching saved QC rather than repeating a decode; when no matching receipt exists, it measures the candidate before presenting the gate. A failed decode blocks that presentation and keeps its diagnostic receipt.

## Check editable captions

Save `caption-check.json`:

```json
{
  "media": "reviews/candidates/v001.mp4",
  "captions": "media/captions/final.vtt",
  "transcript": "transcript.txt",
  "expect": {"noOverlap": true, "maxLines": 2}
}
```

```sh
npm run workflow -- my-film captions caption-check.json
```

SRT and WebVTT are supported. Invalid syntax, empty cues, reversed/out-of-order times and cues beyond the measured media duration fail. Readability and overlaps remain advisory unless explicit expectations are declared. Optional transcript comparison measures literal normalized text coverage, not transcription accuracy. Optional `speechIntervals: [{"start": 0, "end": 2}]` checks gaps against supplied intervals; it does not detect speech. Preserve actual caption timing, inspect phone readability, and review relevant nonspeech audio. Receipts live in `evidence/caption-qc/` and bind all supplied files to their hashes.

## Open the review workspace

Save `review-settings.json`:

```json
{
  "media": "reviews/candidates/v001.mp4",
  "displayTarget": {"context": "Mobile video player", "minimumWidthPx": 390},
  "captions": "media/captions/final.vtt",
  "captionLanguage": "en"
}
```

`captions` is optional when text is burned in or no sidecar is required. Browser sidecars must be WebVTT; caption QC also accepts SRT. Declare the intended language instead of assuming English.

```sh
npm run workflow -- my-film review-package review-settings.json
npm run workflow -- my-film review-open evidence/review-workbench/<returned-id>/PACKET.json
```

The first command performs full encoded QC and writes a review packet. The second prints a loopback URL; open it in a browser on this computer. Ctrl-C stops the server. It serves only the packet's candidate/captions and the review interface, with exact byte ranges for seeking. A candidate replacement or modification invalidates the session; prepare a fresh packet after any change.

Use normal, muted, audio-only and declared-width viewing. Phone mode reports the actual rendered player width and permits horizontal scrolling instead of silently shrinking it. Record inspected ranges, timestamped text checks, defects, proposed fixes and optional quality ratings. Playback and listening declarations start blank. Enter only actual human statements; operating the player does not create a declaration. Incomplete or unavailable checks remain explicit.

Saving writes a new assessment, the supplied declaration text and an exact-media review receipt inside the project. The assessment can also be downloaded. No approval or publication occurs. Use the returned receipt with the existing `prepare-review` or `gate final` workflow, and record the actual complete-candidate decision through `approve cut main` when the user provides it. Deliver those approved bytes with `workflow deliver`.

The review server stores local unauthenticated human declarations, not independently verified identity or perception. It has no approval route. The original review-receipt CLI remains available for other review tools and hosts.


## Choose media from the story

Director turns the one-prompt request into timed semantic beats in `VIDEO-PLAN.json`. Run `npm run workflow -- <slug> plan VIDEO-PLAN.json` to produce per-beat routes, owner, job, reason, fallback and unresolved conditions. Production packets expose the validated plan; oversized plans are excerpted with instructions to load the full jobs.

The planner chooses real screen recording for interface demonstrations, original animation for mechanisms, original/source documents for evidence, and owned or permitted licensed footage for illustrative context/B-roll. Director executes the jobs with the host’s available tools and keeps the result/provenance in the project. This command is planning logic: it does not itself capture, download, generate or render media. Stock cannot stand in for evidence of a named event or an actual interface demonstration. See Director’s `references/visual-media.md` for the input schema and acquisition procedure.

## Engine corrections in alpha.5

- Scaled Editor exports validate against the requested output target, while EXCHANGE retains the source canvas. Unsupported aspect/downsampling/fractional scales fail before rendering.
- Linked composition slots constrain their nested mapped video/audio ranges, preventing unnoticed clipping.
- Animator seeks and trims audio on the same quantized frame boundaries as picture. Short audio is padded with silence; it cannot shorten the planned picture.
- Managed render audio must be inside the source inventory. Copy recorded narration to `animation/app/public` and pass `--audio public/narration.wav`, or use its absolute path.
- Existing films retain their current engine source. Use `npm run workflow -- <slug> animation update-engine` to inspect a core update plan, then `... update-engine --apply` to apply an unchanged-core update with recovery backup. Edited cores report conflicts. This may stale source-bound reviews; render new candidate versions and review them normally.
