# JStudio 1.3.0-alpha.4 build validation

Build date: 19 October 2026. Implementation used three Luna sub-agents with coordinator integration and validation. No new production film was created. The research informed priorities; existing project instructions and repository behavior governed the build.

## Implemented

- Advisory production evidence readiness in workflow status, a dedicated readiness command and role packets.
- Full encoded-candidate decode and declared format/stream checks, persistent failure diagnostics, optional black/freeze/silence advisories, and exact-file receipts.
- Automatic full-decode QC at the final review gate, with reuse for unchanged candidate hashes.
- SRT/WebVTT parsing and timing checks against actual media duration; optional declared readability limits, literal transcript comparison and supplied speech-interval gap hints.
- Local review workspace with normal, muted, audio-only and declared-width modes; explicit inspected ranges, timecoded findings, text checks, optional quality assessment and saved review receipts.
- Independent core-media and optional-narration diagnostics. Requiring unavailable voice no longer incorrectly reports working media tools as unavailable.

## Demonstrated on this Mac

- Baseline: 234 runtime tests passed. Integrated build: 275 tests passed, zero failures.
- Installed pinned Editor, native integration repairs, 45-file Animator source payload and default brand verification passed.
- Native Editor strict check and a real 320×180, 24 fps, 1.5-second engineering export passed; the resulting encode fully decoded.
- Pinned Animator produced a real 1920×1080, 12 fps, 0.5-second engineering export with its explicit brand snapshot; the encode fully decoded. Dependencies were reused from an existing installed workspace, so this is not a fresh-install test. An initial fixture without the required snapshot was correctly rejected.
- Real FFmpeg checks accepted valid media, rejected corrupt media, retained intentional black/silent holds as advisory, accepted valid captions and rejected out-of-duration cues.
- Browser validation loaded the exact candidate, rendered its declared 320px phone width and saved an assessment/receipt with no human viewing/listening declaration and no approval. A browser range-cancellation bug found during validation was fixed and regression-tested.
- Before/after fingerprints matched for 1,376 existing user-content and brand files, excluding dependency/cache trees.
- An actual-media synthetic workflow reached the final gate with honest incomplete perception. Synthetic approvals were correctly refused production delivery; modifying reviewed bytes invalidated the review. No production approval was fabricated.
- Replaced a shipped regression test's dependency on a private sample film with a self-contained synthetic fixture.

## Limits

Local speech generation remains unavailable on this Mac. Recorded or separately generated narration remains supported. Existing machine setup records a native-library security restriction; no security controls were changed.

These checks establish local technical behavior and engineering paths. They do not establish a compelling real film, actual human viewing/listening, creative approval, viewer comprehension, universal reliability, measured token/cost savings, fresh-machine setup or Windows/Linux acceptance. Keep releaseAcceptance pending until its actual platform and production evidence exists.

Use [production checks](PRODUCTION-CHECKS.md) for the new commands and [the reference benchmark](REFERENCE-BENCHMARK.md) for a later real production evaluation. Detailed local build evidence is retained in the installation's `evidence/studio-build-2026-10-19/` directory; host-specific evidence is excluded from portable packages.
