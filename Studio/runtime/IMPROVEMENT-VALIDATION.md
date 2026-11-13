# Studio improvement validation

Validated 2026-10-14 against the installed JStudio runtime.

- `node --test tests/*.test.mjs`: 229 passed, 0 failed.
- `node scripts/verify.mjs`: passed with pinned Editor 0.8.77, required repairs, Director materials and brand pack verified.
- The real pinned Editor lint blocks a video-only entry missing `data-no-timeline`, then passes after the marker is added or a matching composition timeline is registered; native export integration confirms capture never starts on the failing entry.
- Workflow help tests cover argument-taking and non-argument routes and prove help prints before project-file access.
- Readiness tests recognize substantive section-based treatments and report incomplete sections while keeping untouched and placeholder-only templates incomplete.
- Improvement-packet tests confirm existing animation planning documents are included as exact hash-bound sources.
- Three current project Editor entries passed the pinned lint with zero errors and warnings; project media and evidence remain outside the package.

These checks establish workflow and technical behavior, not creative quality or human approval. Token/provider usage telemetry was unavailable, so this validation makes no token-savings claim.
