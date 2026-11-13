# JStudio reference production benchmark

This is a repeatable product-evaluation protocol, not a film project, release certificate or claim that JStudio has passed. Run it only when the team chooses to produce a benchmark. Create exactly one normal project under the configured projects root; keep the brief, assets, editable sources, candidate versions, review records and results inside it. Do not publish the film as part of this benchmark.

## What the benchmark should answer

Can the installed JStudio workflow carry a specific, factually coherent short explainer from brief to a compelling encoded candidate, make a requested revision without losing project integrity, and deliver the exact bytes that a human approved? Where does the run need undocumented human rescue? What does an independent viewer understand?

The first run is a feasibility study. It can reveal defects and produce a trustworthy trace. It cannot establish general reliability, population-level viewer preference, cost savings, token savings, or creative superiority.

## Freeze the brief before production

**Working title:** Both groups improved. Why did the overall result fall?

- **Audience:** curious nonexperts watching on a phone.
- **Viewer takeaway:** an overall rate can fall even when every group's rate rises, if the mix of groups changes.
- **Duration:** target 60–75 seconds; record the actual runtime.
- **Master:** start at 1920×1080, 16:9, 30 fps, progressive, with stereo 48 kHz audio when sound is used. Treat these as this experiment's chosen settings, not universal JStudio requirements.
- **Second version:** make a 1080×1920, 9:16 composition only if it can be produced and reviewed within the agreed budget. Recompose layout and visual hierarchy for portrait; do not silently substitute a center crop. If deferred or failed, record that result and score the landscape master separately.
- **Data:** use a clearly labeled fictional example. Year 1: Group A has 90 people and 72 successes (80%); Group B has 10 people and 4 successes (40%); combined result is 76/100 (76%). Year 2: Group A has 10 people and 9 successes (90%); Group B has 90 people and 45 successes (50%); combined result is 54/100 (54%). Both group rates rise while the combined rate falls because the group proportions change. Label the figures hypothetical; do not imply they describe a real study.
- **Story requirement:** open with the contradiction, make the changing group sizes and success fractions visible through original editable motion, then resolve the opening. Each beat should change the viewer's understanding. The animation must explain the mechanism; decorative motion behind spoken percentages does not meet the challenge.
- **Sound and access:** choose recorded or otherwise rights-cleared narration if used, and deliberately decide on music/effects or silence. Preserve an editable transcript/caption file when spoken words are used. An unavailable voice tool is an implementation constraint to document, not a reason to invent narration or call a silent result complete.
- **Requested revision:** after the first complete candidate is reviewed, change the sequence that demonstrates Year 2 and revise one related narration line and caption. Observe the actual scope of rebuild and recheck adjacent timing, continuity and sound. The revised encode is a new candidate and must be reviewed and approved separately.

Before starting, save the approved brief, chosen format and time budget, claim/data check, asset and voice rights plan, reviewer identities, scorecard and comparison plan in the project. Record prompt and tool/model versions when available. Do not tune the brief or rubric after seeing the result without recording the change.

## Comparison and review

If a fair human-led or constrained-hybrid comparator can be arranged, use the same brief, output requirements, available source material and evaluation rubric. Record the participants' experience and time budget. This is not a randomized experiment; describe differences and limitations. If no comparator is run, mark it not run rather than claiming JStudio is faster or better.

Have independent reviewers inspect encoded candidates without being told which workflow produced them where practical. Randomize viewing order if comparing candidates. Ask 8–12 intended viewers, as a small defect-finding pilot only:

1. “What happened to the overall result?”
2. “Why did it happen?”

Also note where they became confused and whether they would choose to keep watching, without first explaining the intended answer. This small sample identifies comprehension problems; it does not support population-level claims.

For each candidate, follow the installed [exact-render review protocol](../.agents/skills/director/references/render-review.md): watch the entire encode at normal speed; review it muted; listen audio-only when sound is present; and inspect captions and important visual information at phone size. Bind review notes, defects, scores and approvals to that candidate's exact file hash. A technical pass, a frame strip or a recorded approval does not establish that anyone watched or listened.

Use the existing eight-dimension quality assessment. Anchor 1 as materially weak, 3 as serviceable with identifiable room to improve, and 5 as unusually effective for this brief. Score only observed dimensions and attach evidence; leave the rest unassessed. Do not compute a blended score or label scores as a pass. Report individual ratings and disagreements.

## Evidence to keep in the project

Record these facts per workflow and candidate, including failed attempts and the targeted revision:

- active labor time by role, wall-clock time, and time to first watchable candidate;
- render attempts, failures, retries, intervention steps and whether each intervention was documented;
- direct tool/API/compute costs in observed billing units;
- model, version and token data only when actually exposed; otherwise record `NA – not instrumented`;
- source, asset, font and media versions; rights/provenance gaps; factual corrections;
- change scope, rebuild/review time, affected and unaffected artifacts, and any regressions;
- exact media paths and hashes, measured stream properties, review coverage, defects and rechecks;
- independent reviewer ratings, viewer answers and confusion points;
- actual human decision for each complete candidate, approval evidence and delivery hash.

Use the existing project workflow, run reports, review receipts, gate reports and improvement packets as the source of truth. Add a concise benchmark summary under `evidence/benchmark/` only after the project exists. Preserve raw observations and mark unknown fields; never backfill guesses as measurements.

## Decision gates

**Stop release preparation** for incorrect or misleading figures, unresolved essential rights, a missing or corrupt deliverable, an essential caption/accessibility failure, missing editable source, an unreviewed complete encode, absent human approval, a delivered hash mismatch or unauthorized publication.

For this exploratory run, a provisional creative signal is: independent reviewers' median is at least 4/5 for story clarity and visual explanation, no critical dimension's median is below 3/5, and at least 75% of the pilot viewers can explain why the aggregate fell. These are chosen experiment thresholds, not industry standards or validated universal cutoffs. Report raw ratings and the small sample size. A film may be accepted by a human even when it misses a research threshold; record those decisions separately.

Do not call the run autonomous if it needed undocumented manual repair. A run with documented human assistance can still produce an approved film. Do not claim repeatable reliability or general creative quality from one run. Repeat against different, preselected holdout challenges before broad product claims.

## Use results to make product decisions

- If viewers miss the causal explanation while technical checks pass, improve story/visual direction and review before adding tools.
- If an Animator-to-Editor handoff breaks or a focused revision damages unrelated work, capture the exact trace and improve only that demonstrated contract or dependency path.
- If export integrity, stream mapping, captions or rights fail, fix that specific gate and retain a regression example.
- Consider a new renderer, hosted generation service, or collaboration product only after the trace shows the current path blocks the result. Preserve existing editable sources and a reversible exit path for any trial.
- Promote cross-film findings through the existing improvement loop, with validation on a later run. Do not let a single film, a score, or an AI-generated critique silently rewrite the creative system.

Publishing, external sharing and purchases are outside this protocol and require their normal authorization.
