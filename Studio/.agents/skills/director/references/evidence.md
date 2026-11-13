# Evidence, corrections and handoff

This is a dated operational record of the September 25–27, 2026 conversation and local artifacts. It is not evergreen capability certification or new authorization.

## What the user settled

- Preserve the original Editor experience/functionality; use JStudio branding and AI context, not a replacement editor. The earlier custom editor was an overextension.
- Build with AI; the portable software should support Mac and Windows first-run setup. Included platform scripts are not proof of execution on every device.
- Teach from faithful source content and sequence. Presentation work must not silently rewrite the curriculum. Native learning content with PDF references; original slide images when rebuilding faithfully is impractical.
- Human, helpful narration; project-approved voice (as selected in the project/profile, subject to actual runtime support); brisk language/pacing, purposeful animation and project-branded bookends. These preferences do not require narration for silent work.
- Actual screen footage for software walkthroughs, continuous across tabs. Screenshots/slides did not meet this request.
- Useful questions and agreed review checkpoints; no repeated confirmations for already authorized routine work. Desktop review for this project; mobile not required unless a future brief changes that.

## Verified versus proposed

| Item | Evidence/status |
|---|---|
| Portable 1.1.0 native Studio | Apple Silicon setup, edit, checks and MP4 export verified; Editor 0.8.77. Existing model/browser caches reused. |
| Windows x64 / Intel Mac | Launchers included/reviewed, not executed on those devices. |
| Source app | Native HTML/Studio are current; old port 4310 custom UI remains historical, not default. |
| Heart | Local af_heart generated successfully. Deep-path demo required a repair. |
| Display recording | Short test captured Studio → guide → Studio. Later full takes failed due to capture/foreground mismatch. The test did not establish final-take success. |
| Actual browser edits | Heading change, high-quality 1920×1080/30 fps export and exported-file playback succeeded in the test project. This did not prove the screen recorder showed those steps. |
| Latest raw take | Approximately 161.75 seconds, 3456×2234; contact sheet showed the conversation window for most of it. Rejected, not a finished training video. |
| OBS window capture | Researched recommendation using ScreenCaptureKit. No successful local OBS test was established in this conversation. |
| Terminal automation | CUA explicitly blocked controlling Terminal. Supported command tools completed setup, but this does not constitute filmed Terminal interaction. Never work around the UI block with synthetic input. |

## Later QA and repair evidence — September 27, 2026

The subsequent three-video QA produced exact 30-second native exports and confirmed a saved text edit, but two High Quality selections remained Standard. This newer observation limits the older UI-export result above; neither establishes universal selector reliability. The run also exposed FFmpeg discovery, relocated voice paths and global undo affecting concurrent external edits. Actual encoded samples and technical audio checks were reviewed; continuous full playback and perceptual listening were not established. Continuous capture remained unresolved.

Launch-readiness work subsequently repaired working-package runtime discovery and added a health check. Use the current package documentation and fresh receipts for its scope; do not infer the distribution ZIP was rebuilt or platforms newly tested. UI quality repair requires its own fresh result. Historical evidence below remains historical.

## Local evidence pointers

Discover availability; these are not portable dependencies:

- Historical source pointer (no longer present): the original development workstation’s former source directory. Discover the current source by package metadata.
- Historical release pointer: `releases/JStudio-Editor-1.1.0/` is no longer present in the source package. In the current project workspace the extracted package is `01 Deliverables/JStudio-Editor-1.1.0/`; read its `START-HERE.md`, `AI-AUTHORING.md`, `RELEASE-TESTS.md` and scripts.
- Earlier slide-style training and standalone HTML: `deliverables/getting-started/`. The existing MP4 is not the requested replacement real walkthrough.
- Recording tests, rejected takes/contact sheet and repair: `deliverables/walkthrough-recording/`.
- Repaired extraction: `deliverables/walkthrough-recording/Demo/JStudio-Editor-1.1.0`.

## Deep-path speech repair

The deeply nested extraction failed in eSpeak with a missing `phontab` under its compile-time `/Users/runner/...` path, despite installed data existing. Copying the loader/data to a short real temporary path succeeded; a symlink did not because paths were resolved. The demo's `scripts/common.mjs` now supplies that short cache through PYTHONPATH when needed. Heart sample and full setup/check then passed. Details are in `walkthrough-recording/setup-fix.md`.

The original release ZIP was not patched. Do not claim this fix ships to teammates. A production package change needs actual review, rebuild/integrity checks and platform verification appropriate to the changed behavior. Do not replace global Python or disable protections as a workaround.

## Recovery discipline

When interrupted, identify the last verified state: recorder active/stopped, exact source, saved project, render status and requested deliverables. Preserve prior approved artifacts. Do not carry stale UI indices, sessions, ports, PIDs or recorder locks forward without checking. A claim in old notes must not outweigh fresh output evidence.

For recording failures, diagnose source targeting and captured frames first. Do not spend repeated attempts proving only that the browser automation works. Keep the continuous source, reject unusable takes and describe the limitation plainly. Mark documentation claims with their actual scope: recommended, locally tested, platform-untested or rejected.

## Verified local window capture — September 27, 2026

The later two-minute review cut used the [local window-recorder fast path](recording.md). A saved short Edge test proved that Studio tabs remained in the selected Edge window; opening Studio in another Edge window failed the same test. Separate saved Finder and Studio window takes were inspected and retained as raw sources. The [project QA receipt](../../../../../../02%20Workspace/studio-director-walkthrough-2026-09-27/QA-RECEIPT.md) records their limits. This supersedes the earlier statement above that continuous browser-window capture remained unresolved; it does not prove one continuous multi-app installation recording. The helper is now bundled in the maintained skill source. Installed skills and matched candidate ZIPs were not updated by this documentation change.
