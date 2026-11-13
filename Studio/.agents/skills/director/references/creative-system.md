# Creative production system

One prompt should launch useful production. Director translates it into a film, makes reversible choices, carries the same intent through each specialist, and returns a complete candidate. This document defines creative behavior and handoff content; the workflow ledger and render guards remain execution authority.

## Decide the film before multiplying scenes

Start with the audience change: what should the viewer understand, feel or do after watching? Identify the tension, proof and payoff. Research only claims and visual references that can change the film. Separate verified facts, invented illustration and protected user wording.

Briefly compare two or three plausible treatments inside storyboard notes. Choose for relevance, clarity, originality and feasibility. A distinctive metaphor should explain this subject: an overloaded switchboard may embody competing requests; an unfolding map may reveal a process. A decorative vortex is not automatically a concept.

Give the selected treatment a visual grammar: composition, typography, color/material, motion behavior and sound character. Anchor it to the project's pinned identity when supplied. A brand constrains identity, not every shot's layout. Do not impose JStudio identity on client work.

Build curiosity and release through varying shot scale, information density, movement and silence. Retain recognizable objects or spatial relationships across beats where useful. Use authentic captures for product evidence, diagrams for relationships, typography for verbal emphasis, and animation for transformation. Choose assets for their job in the story, not their availability.

## One editable beat contract

Keep these fields in the existing authoritative storyboard; this is a planning contract, not a renderer schema or fixed scene template. Simple beats need only concise entries. Complex beats may link source-specific treatment notes.

| Field | Required meaning |
| --- | --- |
| ID and timing | Stable beat/shot IDs, intended duration, order and dependencies; distinguish estimates from measured cues. |
| Viewer takeaway | One change in understanding or feeling; the beat's narrative job. |
| Claim and copy | Protected wording, supporting evidence, pronunciation and any uncertainty. |
| Visible event | Initial state → trigger → transformation/action → consequence → readable payoff. |
| Composition | What the eye follows, framing, typography hierarchy, persistence/continuity and target aspect ratio. |
| Motion direction | Meaningful physical changes, motion character, camera intent and readable holds; stillness is valid. |
| Sound and cues | Narration, music/effects or silence; named cue windows, measured/estimated status and synchronization intent. |
| Inputs and outputs | Asset/source references, provenance, intended Animator clip or Editor operation and technical handoff constraints. |
| Acceptance and risk | Observable success, hardest unproven technique, fallback and affected downstream beats. |

Example, not a reusable scene prescription:

> **B03 / S04, intended 6 seconds:** The viewer sees why one coordinated queue reduces duplicate work. Three request cards repeatedly collide at separate entrances; a routing rail aligns them, preserving each card's identity, and feeds one clearly labeled exit. Hold the resolved queue long enough to read. Use an overhead 2D composition; each collision causes a visible neighboring response. Link the alignment to `voice.single_queue`, initially estimated and later measured. Animator returns a versioned clip plus cue map; Editor positions it against the recorded phrase. Success: the before/after distinction reads without narration, labels remain legible at delivery size, and the outgoing card continues naturally into B04. If articulation fails, simplify the routing geometry while preserving the visible causal change.

## Explicit handoffs

Every assignment includes project/beat IDs, current version, exact source paths, relevant constraints, output location, acceptance checks, dependencies and unresolved issues. Reference shared files instead of copying them. On return, state what changed, exact artifacts/hashes, verification performed, limitations and next owner. Never infer readiness from an empty template or a file's existence.

| Handoff | Receiver needs | Receiver returns |
| --- | --- | --- |
| Director → Animator | Selected concept, beat contract, pinned style, format/fps, asset references, cue windows, supported capability constraints | Editable source, versioned encoded clips, measured metadata, source/media mapping, asset inventory, rendered observations and unresolved defects |
| Animator → Editor | Guarded review-only import records, clip IDs/hashes, measured duration, framing/alpha behavior, cue maps and continuity intent | Native editable composition, exact clip placement, caption/audio mapping, dependency validation and encoded candidate |
| Editor → Reviewer | Exact candidate path/hash, brief and protected claims, current beat map, changes, known defects and inspection capabilities | Timecoded findings with severity, actual playback/listening coverage, technical checks, limitations and targeted corrections |
| Reviewer → Director | Findings linked to candidate bytes and affected beats | Disposition, assigned fix scope, recheck evidence, next candidate or an explicit unresolved blocker |
| Director → user | Complete internally checked candidate and concise material limitations | Actual approval or revision request, recorded against the unambiguous candidate |

Animator does not own final mix or export. Editor does not reinvent the concept without routing a material change to Director. Reviewer cannot silently approve creative acceptance. Source changes propagate only to dependent clips, placements and review records; inspect neighboring transitions and sound whenever timing changes.

## Make ambitious animation practical

Pick the hardest meaningful action and prove it with enough setup and payoff to judge it. Reuse validated geometry, timing and rendering primitives; invent the film's choreography. Complexity is justified by coordinated behavior and storytelling, not object count. A strong planar transformation can outperform elaborate 3D.

Design causal chains, clear silhouettes, anticipation and recovery, informative camera motion, intentional occlusion, readable settled states and a memorable payoff. Avoid routine title-card sequences unless the subject calls for them. Test target framing and text at actual delivery scale. Record uncertain engine support as a risk and prove it; never promise unsupported output.

Inspect encoded temporal behavior and sound using the eight dimensions in `animation-direction.md`. Preserve source seeds and time-based determinism where supported. An attractive still cannot establish a satisfying transformation.

## Bounded refinement

Set a proportionate render/time budget before expensive work. Default to one representative proof, one targeted repair pass and one comparison before deciding whether to scale, simplify or escalate. For the complete candidate, consolidate findings into a prioritized repair list; avoid separate full renders for each cosmetic observation. New factual or technical failures justify necessary repairs within the authorized budget.

Critical failures—wrong protected claim, missing required media, broken encode, or unusable essential communication—block readiness. High-impact clarity, timing and sound defects receive priority over embellishment. Recheck fixes against the new exact bytes. If the budget is exhausted with a critical issue, record a blocker and present the concrete limitation and recovery choice; never relabel it as passed. Lower-priority compromises must be visible in the candidate review, not buried in logs.

Human creative approval remains one complete-candidate decision. Internal scores, critics and technical checks never substitute for it.

## Evidence-based creative review

For each review receipt, use the optional `qualityAssessment` record defined in `continuous-improvement.md`. Score only dimensions supported by the actual inspection; mark the rest unassessed with a reason. Do not calculate a blended score or call a score a pass. Pacing and whole-film coherence need playback; sound needs perceptual listening. A high score cannot compensate for an uninspected range or an open critical defect.

At every `presented-for-review` gate, Studio writes an immutable improvement packet next to the gate report. Read its referenced evidence and complete its findings template. Keep one-film creative fixes in that project. Send generalized workflow problems to the shared Studio backlog, and cross-film craft lessons to the creative-system backlog only when evidence supports reuse. Record an empty findings array when the review yields no durable system lesson; this still records the run's review and telemetry coverage.

Before a later production, Director receives the open shared findings in its bounded production packet. Apply relevant accepted lessons, avoid known regressions, and leave unrelated or deferred findings alone. New observations that recur after implementation reopen the issue for review; they do not automatically alter product code. See [continuous improvement](continuous-improvement.md) for the record and disposition commands.

## Context and packaging discipline

Use `npm run production -- <slug> <role> --max-chars 12000` to route bounded context. Load the entry instructions once, then only relevant references and changed source. Keep stable IDs and source links so revisions address a specific beat rather than rebuilding the film. Pass findings as concise evidence and actions, not transcripts.

Keep runtime, reusable library and per-film content separate. New installations need verified dependencies, licensed assets, declared capabilities, supported-platform evidence and an end-to-end sample; instructions alone do not establish package readiness. Capture actual latency, retries and available token/cost telemetry during that sample. Compare like-for-like runs before claiming efficiency gains.
