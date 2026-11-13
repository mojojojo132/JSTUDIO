# Display-target legibility review — validation

Issue: `SI-ff6d1a3cd2c9`

The audit was based on the exact `bond-ladder-v003.mp4` candidate in the bond-ladder project. The encoded file hash is `c35deb79ac90a849ec11b76d483ca0f6582922df3bb2216036438caa2dde6d4f`. Its hash-bound review receipt records 27 sampled frames at 960×540 and notes that support/footer copy remains small for phone viewing. The film itself was not changed, approved or published.

JStudio now asks Director to declare a platform/viewing context and minimum displayed width for each output. Reviewer handoffs require exact-candidate checks of required text at that width, with timecodes and readable/unreadable results. New version-2 review receipts preserve the display target and checks; a legibility score is rejected unless those checks are complete at the declared width. Partial and unavailable checks remain explicit; text-free work can be marked not applicable. Perceptual-review completion now includes a complete or not-applicable legibility check. Learning packets retain the target and inspection status. Existing version-1 receipts remain readable.

Validation performed:

- `node --test tests/*.test.mjs` — 234 passed, 0 failed.
- `node scripts/verify.mjs` — passed; pinned Editor, matched authoring skills, animation payload and configured brand verified.
- Review-receipt tests cover target-width mismatch, out-of-range samples, partial/unavailable/not-applicable status, scorecard enforcement, packet propagation and version-1 compatibility.
- Project-template and Director/Reviewer handoff tests verify that future briefs and review contracts request and record the display target.

Limit: target-width inspection is an explicit, hash-bound reviewer record, not automated OCR or proof of physical device dimensions. A chosen rendered player width is an approximation of the intended viewing context. This validation does not claim measured token savings; host token and cost telemetry was unavailable during the source video run.
