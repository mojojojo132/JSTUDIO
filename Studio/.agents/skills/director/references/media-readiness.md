# Capture, audio and exact-copy font readiness

Use these small measured checks before an expensive render. They create unique immutable JSON receipts under the project evidence directory. They do not approve content or replace exact-artifact visual/playback/listening review.

## Capture and audio

Run the installed runtime script with the project root and a JSON assessment:

`node scripts/media-readiness.mjs PROJECT ASSESSMENT.json`

```json
{"media":"assets/capture.mp4","expect":{"streams":["video","audio"],"width":1080,"height":1920,"fps":30,"duration":8,"durationTolerance":0.1},"measureLoudness":true}
```

List only streams actually required: silent screen capture uses `["video"]` and omits `measureLoudness`. Audio-only checks use `["audio"]`. Bundled FFmpeg paths are supplied by the workflow CLI; direct script execution can set HYPERFRAMES_FFMPEG_PATH and HYPERFRAMES_FFPROBE_PATH. Media must be within the project.

The helper rejects empty files, missing streams, unexpected encoded geometry/frame rate/duration, decode errors, and changed bytes. Requested loudness must be finite: silent `-inf` is a failed measurement, never a successful mix. It measures the first audio stream and does not normalize or modify the source. Keep silence intentional and omit loudness measurement for intentionally silent captures.

Before a full take, record a short disposable interaction proof with the same browser viewport, device scale, capture method and output encoding. Check its encoded dimensions with this helper; do not equate viewport size with encoded video size. Inspect interaction evidence at meaningful before/after moments (tap/click, selected state, scrolling and transition endpoint), then record the full take. State whether actual interaction accuracy, continuous playback and synchronization were inspected. A technical receipt alone cannot establish those facts.

## Exact-copy font checks

`node scripts/font-readiness.mjs PROJECT ASSESSMENT.json`

```json
{"fonts":[{"path":"assets/brand/fonts/body.woff2","family":"Brand Body","weight":400,"style":"normal","text":"The exact on-screen copy — including punctuation · and numerals 123"}]}
```

Include every actual font file, weight/style and its exact copy, including punctuation, captions and end cards. The browser guard applies; restricted macOS execution must request approved execution rather than retry or bypass the guard. Set Animator_CHROME if Chrome is not in the platform default path.

Each face must actually load. Each non-whitespace character is compared against two generic fallback families using canvas width and pixels. Suspected fallback fails the check and is recorded. This is a heuristic: it is not a full cmap/shaping audit; excluded controls, combining sequences, ligatures, unusual matching glyphs and final layout still require rendered inspection. Loaded fonts alone never establish complete typography readiness. Fix missing glyphs using an authorized font asset or revise copy within the approved direction; do not silently substitute a font. The receipt includes exact text and source hashes, not font data or licensing conclusions.


## Required-text viewing geometry

Optional `readability` on the media assessment records supplied typography separately from measured media. Example:

```json
{"media":"assets/capture.mp4","readability":{"masterWidth":1080,"viewingWidth":390,"captureCssWidth":390,"captureScale":2,"placementScale":0.9,"minimumCameraScale":1.18,"text":[{"label":"Required plan label","cssPx":12,"required":true,"minimumDisplayPx":14},{"label":"Incidental navigation","cssPx":12,"required":false}]}}
```

`captureScale` is encoded pixels per captured CSS pixel; `placementScale` maps encoded pixels into the master. Use the minimum camera scale during the interval when the text must be read, not the largest punch-in. If captureCssWidth is supplied, its product with captureScale must match measured encoded width. The calculator reports master pixels and display pixels at viewingWidth (not points). Choose a viewing target suited to the content; there is no universal passing font size. Without an explicit minimumDisplayPx, required text remains `needs-review`. `below-target` is advisory, not a render failure. Verify the declarations and inspect actual contrast, type, compression, motion and reading time.
