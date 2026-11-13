# Offline narration build

This helper uses Kokoro and does not implement Voice F/VoxCPM2. Use it only for an explicit project Kokoro choice or authorized fallback. If a project explicitly selects Voice F, verify its reference-conditioned generation separately, and never pass a Voice F label to this helper as if supported. The Heart example below is a fallback example, not the Studio default.

Use the [builder](../tools/build_narration.py) for a multi-scene narrated video when one approved local voice and phrase-level captions are appropriate. It writes generated assets only; native Editor HTML remains the editable source and must be authored or updated separately from `caption-cues.json`. The builder never inserts caption nodes into HTML, so a producer must replace only a clearly managed caption region when using those cues. Do not point `--output` at the project root or any hand-authored directory.

Create a JSON manifest from the confirmed script. Each `line` is one intended caption-sized spoken phrase. A minimal example:

```json
{
  "version": 1,
  "voice": "af_heart",
  "speed": 1.02,
  "sample": {"text": "Approved sample words spoken locally.", "seconds": 2.4},
  "target_seconds": {"min": 100, "max": 130},
  "scenes": [
    {"id": "scene-01", "project_ref": "frame-01", "chapter": "Start", "lines": [
      {"text": "Show the actual first step.", "pause_after": 0.2}
    ], "end_pause": 0.35}
  ]
}
```

`sample.seconds` is the measured duration of exactly `sample.text` spoken with the approved local voice/speed. The preflight estimates spoken length plus explicit pauses; it rejects an out-of-range estimate before model loading. `project_ref` is checked against native `index.html` when `--project-root` is supplied. Scene IDs are stable output names, not a composition schema.

From a Studio package with its local voice runtime installed:

```sh
node <director-skill>/tools/run-narration.mjs <studio-package-root> <manifest.json> <project>/generated/narration --check --project-root <project>
node <director-skill>/tools/run-narration.mjs <studio-package-root> <manifest.json> <project>/generated/narration --project-root <project>
```

The wrapper uses Studio's runtime recovery and one Kokoro model instance for all phrases. The build produces scene WAVs, joined WAV, measured `timings.json`, `caption-cues.json`, `captions.srt`, `chapters.json`, `transcript.txt`, and `build.json`. Every run builds in a sibling staging directory. A generation failure leaves the last complete output intact; rerunning replaces only an output directory marked as owned by this tool. Review the generated voice and cues before using them in the project. An estimated duration does not replace measured timing or perceptual listening.

This builder is validated on a short local fixture. It has **not** rebuilt the approved 8:26 AI at JStudio project or passed a full-project parity test. Do not switch that project to this pipeline at its current timed-preview checkpoint.
