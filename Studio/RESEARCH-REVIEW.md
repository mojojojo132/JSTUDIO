# JStudio research review

Reviewed attachment: `deep-research-report.md`, titled **Reusable Deep-Research Operating System**. Review date: 2026-10-13.

## Finding

The attachment is a general research methodology, not the requested investigation of JStudio. It explicitly calls itself topic-agnostic. It describes claim decomposition, evidence quality, research scope and reusable prompts. It does not supply the requested current capability assessment, selected video-production stack, engine integration findings, verified provider costs, latency benchmarks or evaluated finished films.

Its embedded citation markers are not a usable, independently verified source ledger in this Markdown file. Do not treat them as validation of JStudio architecture or production quality. This review evaluates the supplied document, not the external sources behind its claims.

## Useful principles to retain

- Separate documented intention, implemented capability, demonstrated behavior and unknowns.
- Investigate uncertainties that can change a build decision; avoid research volume as a success metric.
- Preserve provenance for consequential claims and distinguish observation from recommendation.
- Test alternatives and stop when additional investigation is unlikely to change the decision.

A full research bureaucracy per film would add overhead. Apply those principles through the existing storyboard, asset provenance and decision records; use a separate evidence ledger only when claim volume warrants it.

## Builder recommendation

Develop JStudio around one coherent production responsibility chain: **Director → Animator → Editor → Reviewer → Director → complete-candidate approval → exact-byte delivery**. The product promise is autonomous routine decisions with editable source and traceable handoffs. The promise is not yet demonstrated simply by documenting that chain.

Strengthen the initial experience with subject-specific concepts, causal animation, intentional sound, stable beat IDs and bounded role context. Preserve the distinction between expressive creative planning and deterministic execution guards. Keep client identity external and project-pinned. Product labels should consistently describe responsibilities rather than expose engine branding.

## Evidence still required

| Decision | Minimum useful evidence |
| --- | --- |
| Can the package run on its supported machines? | Clean installation, dependency/capability check and render on each claimed platform. |
| Can one prompt complete a film? | A real prompt carried through assets, animation, edit, sound, candidate review and approved-byte delivery without hidden manual repairs. |
| Is animation visually strong? | Actual encoded temporal inspection with timestamped creative findings; source inspection and technical tests are insufficient. |
| Are revisions efficient? | Change one narrative beat; demonstrate affected-only rebuilding, continuity rechecks and preserved unaffected source. |
| Is context usage lower? | Comparable measured runs including retries and all reported participants; unknown token counts remain unknown. |
| Is audio production available? | A verified narration/music/effects path, synchronization test and listening review, or a clearly supported silent workflow. |
| Can the product be distributed? | Dependency/license inventory, asset rights, reproducible package contents and no machine-specific client data requirement. |

## First production benchmark

Use a short original explainer whose central idea requires a visible transformation. Establish a complete brief, create one ambitious representative Animator sequence, assemble the film in Editor with the intended sound/captions, inspect the actual complete encode and perform one targeted revision. Record exact media identities, provenance, elapsed time, retries, available token usage and perceptual coverage. Obtain one complete-candidate human decision and verify that delivered bytes match.

This benchmark should expose integration gaps while showing whether the creative result is worth packaging. Until it runs and is reviewed, describe the workflow as implemented guidance and available tooling—not proven seamless production or proven visual excellence.

## Follow-up review: `JStudio_Research_2026-10-19.md`

Reviewed on 2026-10-19 against the attached report and the installed JStudio workspace. The report states that it received the research prompt but not the source repository or a finished film. Its JStudio capability matrix is therefore a set of unknowns and hypotheses, not an implementation audit. External product prices, model availability and policy claims in that report were not independently rechecked during this follow-up and should be verified before any purchase or integration decision.

### What the installed workspace already has

Source inspection found existing implementations or authoritative operating guidance for several recommendations in the report:

| Research recommendation | Existing JStudio evidence | Remaining evidence gap |
| --- | --- | --- |
| Stable story and shot intent through handoffs | `.agents/skills/director/references/creative-system.md` defines the editable beat contract and explicit role handoffs. | A real production trace showing the contract improves the film or localizes revisions. |
| Hash-bound candidate review and approvals | `runtime/scripts/review-receipt.mjs`, `runtime/scripts/workflow.mjs`, and `director/references/render-review.md` bind review to exact media and keep approval separate from viewing/listening. | A complete human-reviewed run and delivery trace. |
| Technical media checks | `runtime/scripts/media-readiness.mjs`, `runtime/scripts/finishing.mjs`, and workflow guards provide technical inspection paths. | Negative-case evidence and a full-run record for each supported path. |
| Eight-dimension creative assessment and recurring learning | `director/references/continuous-improvement.md` and `runtime/scripts/improvement-loop.mjs` record evidence-backed ratings and hash-bound findings. | Repeated, independent runs showing which findings generalize and which changes improve later work. |
| Preserve the current engine until a measured failure | Existing Director guidance requires pinned tools and an explicit gap before switching engines. | A benchmark trace identifying any actual capability bottleneck. |

These are implementation/documentation findings from the installed source, not claims that an end-to-end production has been demonstrated. No film project was initialized and no render or film acceptance test was run in this follow-up.

### Changes adopted from the report

- Added a distinct normal-speed, muted-picture, audio-only and target-width phone review sequence to `director/references/render-review.md`. It uses the existing receipt fields, adds no schema or approval gate, and requires limitations to remain explicit.
- Added `runtime/REFERENCE-BENCHMARK.md` as a reusable, packageable protocol for the first end-to-end reference production. It carries forward the report's fictional aggregate-rate example, independent review, targeted revision, telemetry discipline and decision gates without claiming that the benchmark has run.
- Linked the benchmark and review guide from `PRODUCTION.md` so operators can find them.
- Updated the packaging test fixture to assert the benchmark protocol is included in the distributable; all six packaging tests passed.

The next evidence-producing action is to run the benchmark in a user-authorized project. Until then, JStudio should make no new claims about end-to-end autonomy, cross-project reliability, audience preference, cost savings, token savings or creative superiority.

## Implementation build: 1.3.0-alpha.4

The subsequent builder pass implemented production readiness, encoded candidate QC, caption QC and a local exact-candidate review workspace, integrated with the existing workflow and role packets. It also corrected core-versus-optional-voice diagnostics. See [build validation](runtime/BUILD-VALIDATION-ALPHA4.md) for the 275-test regression result, real native Editor/Animator engineering exports, browser validation and content-preservation evidence. These engineering checks extend implementation evidence; they do not replace the real-film reference benchmark or human creative approval.
