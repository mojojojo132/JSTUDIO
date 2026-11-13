# JStudio 1.3.0-alpha.5 — production decisions and engine correctness

## Implemented

Director now translates a one-prompt video request into timed semantic beats and selects real screen recording, original explanatory animation, original/source evidence, or licensed illustrative footage/B-roll. `workflow plan VIDEO-PLAN.json` returns explicit per-beat jobs, owner, purpose, fallback, and execution prerequisites. Production packets expose the validated plan with bounded excerpts. Director guidance requires executing those jobs through the host's available tools and recording the resulting assets; planning does not count as production.

The planner is deterministic routing of Director-authored semantic intent, not a topic keyword classifier or a separate model service. It does not independently capture screens, search/download media, generate images or render videos. Actual environment/source/license verification remains Director's production work. Interface demos require real capture; stock cannot substitute for required-authenticity context or evidence. Stock jobs require free permitted provider downloads with item-specific rights checks. No new external account, service, upload or dependency was introduced.

Engine fixes:

- Editor scaled exports carry the requested output resolution into finishing validation. Source master dimensions remain intact; incompatible aspect, downsampling or fractional scaling is rejected before capture.
- Exchange preflight carries linked composition visible windows and catches mapped video/audio clipped by ancestor slots.
- Animator derives picture and audio timing from one quantized frame interval. It explicitly maps streams, pads short audio with silence, and preserves all requested picture frames.
- Managed render audio is included in the source inventory; untracked audio is rejected with a project-local copy instruction. Narration changes invalidate its receipt.

## Validation on this Mac

- 294 runtime regression tests passed; 75 bundled Director Node tests passed with zero skips.
- Synthetic mixed-media planning chose real capture, animation, source document and licensed stock for the corresponding semantic beats. Planning-only status and source/capability/rights prerequisites remained explicit. No external stock was acquired during product validation.
- Actual native Editor exported a 1920x1080 source as 3840x2160, 24 fps, six frames / 0.25 seconds. Shared finishing accepted the target and full-decode QC passed.
- The old copied Animator with a 0.7-second WAV and a two-second requested picture failed with a broken FFmpeg input pipe. The corrected copied Animator produced all 48 frames. A selection starting after audio EOF produced 24 frames / one second with a silent audio pad. A .24-to-2-second selection quantized to .25 seconds and produced 42 frames / 1.75 seconds. Root independently full-decoded all three corrected outputs.
- Pinned installation verification passed, including the reviewed 46-file Animator payload and external brand pack. Dependency versions and upstream attribution remain intact.
- All 1,376 inventoried user project/library/profile/brand files remain unchanged. Existing films retain their own engine core. The existing conflict-aware `animation update-engine` command offers explicit migration with backups.

Evidence is in the local runtime `evidence/engine-build-2026-10-20/` directory. Source backups are in `backups/studio-build-20261020T065919/`. Intermediate integration runs caught schema/fixture and assertion-message mismatches while the planner changed; the final stable suite passed. Initial QC immediately after copying a fixture rejected a metadata change; measuring the stable copy passed, without weakening the change detector.

## Limits

Technical fixtures do not establish creative quality, a complete one-prompt mixed-media film, fresh-machine setup or cross-platform acceptance. Media acquisition/capture must run through the AI host's actually available tools. No production film was initialized, no human viewing/listening or approval was fabricated, and nothing was published. Local native narration remains unavailable under the existing host security restriction; recorded/external narration remains usable. Root/subagent token and billing telemetry were unavailable and no savings are claimed.
