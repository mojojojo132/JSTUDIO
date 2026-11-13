# From a prompt to a complete film

Director owns the outcome. Animator builds original motion. Editor assembles the film. Reviewer inspects the encoded result and returns specific fixes. Each role works in the same project and returns exact artifact references; nobody recreates the brief or copies the entire policy library into a handoff.

The installed host agent supplies creative judgment and available model/tool calls. The production command prepares a compact work packet; it does not independently run an autonomous film-making service. Rendering, import, approval and delivery continue through the guarded workflow.

## Start and resume

Create the project with `npm run new -- my-video` using the requested format and selected brand. Record the user's prompt and source material in `BRIEF.md`. Read the complete project instructions once, then load the next role's packet:

```sh
node runtime/scripts/production.mjs my-video Director
node runtime/scripts/production.mjs my-video Animator --max-chars 6000
node runtime/scripts/production.mjs my-video Editor
node runtime/scripts/production.mjs my-video Reviewer
```

Run these from the Studio folder. Project lookup follows STUDIO.json. Packets resolve manifest paths, include source hashes and explicit truncation, and refuse paths escaping the project. The character budget bounds source excerpts, not total JSON size or token consumption. The command reads records without changing them.

## One authoritative production record

| Record or folder | Purpose | Owner |
| --- | --- | --- |
| PROJECT.json and brand/ | Paths, format and pinned visual identity | Director |
| BRIEF.md | Audience, payoff, protected facts, sources and constraints | Director |
| STORYBOARD.md | Timed beats, script, visual events and sound cues | Director |
| animation/ or configured path | Editable animation source | Animator |
| Configured editor directory | Editable cut, captions and mix | Editor |
| Configured exchange record | Actual source trims and timeline placements | Editor |
| reviews/animation/ and reviews/final/ | Versioned encoded artifacts | Producing role |
| evidence/ | Checks, precise defects and honest coverage | Reviewer |
| Configured decision log and review ledger | Actual decisions tied to exact versions | Director |
| delivery/ | Verified copy of approved bytes | Director |

Do not create a second storyboard, ledger or exchange when configured records already exist. Use extra treatment documents only when complexity justifies them. External narration or unavailable media must be resolved or replaced with an agreed fallback before the final cut.

## Creative handoffs

Director chooses a subject-specific visual idea, a compelling opening and a clear viewer payoff. Describe connected visual transformations, not a queue of decorative slides. Give each beat its narrative purpose, approximate duration, protected wording, visual action, sound intent and evidence source. Stillness and exceptional 2D are valid; neither constant motion nor 3D is a quota.

Animator translates those beats into unrestricted authored motion. Validate a representative sequence early, then inspect real playback for composition, legibility, continuity, rhythm and motion quality. Return versioned clip paths, hashes, durations, source locations and concrete limitations. Native editorial cuts belong to Editor; authored motion belongs to Animator.

Editor uses available footage and rendered clips to build the complete film. Stage unapproved components through review-only workflow routes, preserve exact source mappings, and finish captions and the intended sound mix. Return the complete encoded candidate and its fingerprint.

Reviewer assesses the actual picture and sound against the brief. Every finding names the time range, severity, evidence, proposed correction and responsible role. Report playback or listening limitations explicitly. Fix the highest-impact defects in a bounded pass; retry only when a change addresses a known problem. Source inspection and successful rendering cannot establish creative quality.

For the complete encoded candidate, use the normal-speed, muted-picture, audio-only and phone-size-with-captions passes in [the exact-render review guide](.agents/skills/director/references/render-review.md). Keep every pass bound to the same candidate bytes, and record omitted or unavailable checks honestly. Use the [reference production benchmark](runtime/REFERENCE-BENCHMARK.md) when deliberately evaluating end-to-end product behavior; it is a protocol, not evidence that the workflow has passed.

Use [production checks and the local review workspace](runtime/PRODUCTION-CHECKS.md) for readiness, independent encoded/caption QC, and browser review with timecoded findings. These commands integrate with existing receipts and gates; human approval remains one decision on the complete candidate.

Director presents the complete internally checked candidate for one human decision. Deliver its approved bytes without rerendering. Publication remains a separately authorized action.

## Context and revision discipline

Send only the next role's packet plus the concrete assignment, relevant artifact paths and affected beats. Compare hashes on resume; reread changed sources and material truncated passages. Exact approval evidence must always be read before using it. Missing excerpts do not establish missing decisions.

For a revision, identify affected beats, source files, media and timeline ranges. Keep unaffected artifacts and historical approvals. Render only affected components where supported, rebuild the candidate when its composition changes, inspect the changed ranges plus transitions, and obtain a decision on the new complete candidate.

Return a short receipt: artifacts and hashes, changes, checks actually performed, unresolved defects, next owner and next action. Record actual token telemetry when exposed; otherwise report null with a reason. Character budgets and selective reading are efficiency mechanisms, not proof of measured savings.
