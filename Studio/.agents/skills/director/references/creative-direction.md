# Creative direction, research and subagents

Use this for shaping a concept, developing a story, researching material, coordinating substantial production or reviewing creative quality. A targeted trim or typo fix needs no concept workshop or team.

## Own the film

Start with the desired audience response and the real constraint: what should viewers understand, feel, believe or do, and what limits the work? Reuse the user's sources, intended audience, destination, timing, budget and approved choices. Identify the central promise, evidence, emotional tone and ending. Ask only about gaps that materially change the result; otherwise propose useful assumptions and proceed.

When the direction is open, explore genuinely different approaches before selecting one: a revealing demonstration, human story, visual metaphor, unexpected comparison, documentary treatment, playful construction or a concise argument. These are possibilities, not a compulsory menu or scene formula. Recommend the strongest direction and explain why it serves this audience. Show alternatives only when the choice matters; do not make the user art-direct every detail. For an established brief, execute its direction and bring back only material changes.

Translate the concept into concrete choices: opening hook, narrative progression, what each shot proves or evokes, visual language, pacing, camera/framing, sound, transitions and final action. Use surprise, contrast, restraint, humor or emotional beats where they help. Avoid a succession of interchangeable branded title cards. Originality can come from a precise real example or elegant edit as well as ambitious animation. Preserve factual meaning, authentic product behavior and brand identity; invent a treatment, not evidence.

For a substantial new film, keep the chosen treatment and consequential rejected alternatives in the project's existing brief/storyboard or `CREATIVE-DIRECTION.md`. Include enough rationale to maintain a coherent film during delegation and revisions. Do not create extra paperwork for small edits. Concept exploration and production proceed within user authorization; default to one decision on the complete candidate, with intermediate reviews only when requested or materially necessary. Internal critique is not another user approval gate.

## Research with a purpose

Research when it resolves an uncertain claim, reveals the audience's problem, improves the story, tests a creative approach or finds a usable asset. A supplied-material edit does not require a fresh research project. Use connected internal sources or supplied files for JStudio/client facts, and current primary sources for changing technical claims. Use available browsing/search tools for public research and creative references. Do not assume a connector, account or research service is installed.

Separate factual research from creative inspiration. For material claims retain the source link or local file/page, access date when known, the supported claim, qualifications and intended scene. Keep this in the existing source map or project `research/SOURCE-MAP.md` when substantial. Read the original source rather than trusting a search snippet or another agent's summary. If sources disagree, investigate the consequential discrepancy, qualify the claim or omit it. Do not manufacture metrics, customer stories, endorsements or citations.

For inspiration, describe what is useful—composition, rhythm, metaphor, lighting or storytelling—and develop an original treatment. A reference is not permission to reuse footage, music or artwork; apply [visual-media.md](visual-media.md) for rights and provenance. Use generic/redacted public searches for private projects; never send confidential briefs, client identifiers or unreleased material to public services without authorization. Keep client contexts separate. If an essential source is unavailable, name the precise gap and continue independent work; do not imply research was completed.

Stop once the evidence is sufficient for the creative decision and consequential claims. Report meaningful uncertainty rather than padding the film or indefinitely extending research.

## Use a focused team when useful

Spawn subagents through the host's actual agent tools, when available. In Codex hosts exposing collaboration tools, use `spawn_agent` for a bounded workstream, messages/follow-ups for coordination, and supported wait/status tools to collect results. Do not create user-visible chats, recurring jobs or an external agent service merely to delegate. If delegation is unavailable, perform the roles sequentially and say so only when it materially affects delivery. A skill cannot enable tools that the host does not provide.

Choose only roles that help the current request. Examples:

| Workstream | Useful assignment | Director's integration responsibility |
|---|---|---|
| Research | Verify specified claims or find grounded audience/visual references | Check sources and decide what belongs in the story |
| Concept/story | Develop a distinct treatment or critique the current narrative | Select one coherent direction and maintain the approved message |
| Animator animation | Author assigned shots against a shared treatment and timing | Review motion, continuity and exact versions before import |
| Native editorial | Edit assigned Editor compositions, captions or audio | Maintain the master timeline, pacing and final mix |
| Independent review | Inspect an actual cut for factual, visual, timing or audio defects | Verify findings, resolve them and rerender affected material |

Use a small useful team within available concurrency and budget. Parallelize independent work; sequence dependencies. Do not split a trivial revision or spawn redundant workers to appear busy. Keep the parent's current model settings unless the user or applicable instructions allow a change. Respect user limits on agent count, cost, research or tools. Delegates should not recursively spawn another team unless Director assigns that need within the same budget.

Give each worker a bounded brief containing:
- Desired result, audience, current creative treatment and explicit acceptance criteria.
- Approved scope/stage and exact artifact versions; source facts, uncertainties and privacy constraints.
- Required references and the engine contract: newly authored animation in Animator, native editing/assembly/export in Editor, no tool upgrades.
- Project root, files it may change and files it must only read, output location and dependencies.
- Expected return: actual artifact paths, sources, checks performed, unresolved issues and a concise recommendation.

Share only the context the assignment needs. Keep artifacts inside the same video project, using separate shot files or a bounded working area outside native HTML discovery. Assign a single writer to shared scene registries, project configs, the master edit and approval logs. Workers can propose patches for those files; Director integrates them serially after rereading current contents. Read-only research and critique can run alongside authoring. Never let independent workers overwrite approved exports or edit the same file concurrently.

While workers run, complete useful work on the critical path. Check dependencies before starting downstream tasks. Redirect or stop an unhelpful workstream. Collect results with the host's supported tools; distinguish dispatched, running, failed and completed work. If a worker fails, diagnose and retry a bounded task or take it over; do not present its intended output as completed. Reuse successful unaffected work.

## Integrate and judge

Inspect returned artifacts and material sources; a worker's confidence is not evidence. Reconcile conflicting recommendations against the brief, rather than merging every idea. Check continuity of message, palette/type, shot language, motion, voice, sound and rhythm. Critique the actual encoded result: does the opening earn attention, does the story progress, do visuals clarify, do claims hold, and does the ending deliver? For substantial films, use an independent review pass when it adds value. Share specific timecodes and actionable defects, not generic requests to make it better.

Director alone consolidates project decisions and supplied user approval evidence. Workers may recommend readiness, but cannot invent approval or advance a pending gate. Verify sources and render checks, inspect moving output and listen where supported; explicitly retain any unperformed perceptual checks. Incorporate improvements within the authorized scope, then present one coherent review to the user, not disconnected worker reports. Record material decisions and artifact versions in the existing project log. Continue through the requested deliverable and applicable review gates; delegation is a means to finish the film, not the deliverable itself.


## Economical evidence before review

Before production, declare the intended platform/viewing context and minimum rendered player width for each output in the brief. If the request leaves this open, choose a conservative audience-appropriate target and state the assumption. Before an expensive proof or full render, inspect composited snapshots/Animator stills at the hook, densest text, transition endpoints and end card. Check exact-copy fonts, transformed text bounds, and required UI text at the target width. Use `media:check` readability declarations where useful; these calculate geometry, not visual readability.

For final review, inspect text-bearing frames from the exact encoded candidate at 100% of the declared minimum player width. Record the target, sampled times, checked claims/disclaimers and readable/unreadable results in the version-2 review receipt. A legibility score is assessed only when the required-copy check is complete; unavailable or partial checks remain unassessed. If no on-screen or caption text is in scope, mark legibility not applicable with a reason. A still cannot establish motion quality, pacing or sound. Use continuous playback/listening when available, and record unavailable capability explicitly.

Use one initial independent review where useful, followed by bounded rechecks of changed ranges and their transitions; repeat a full pass when broad changes justify it. Do not impose a one-critic cap that leaves known defects unresolved. Give the reviewer the exact media hash, intended audience/viewing size, unresolved questions and evidence paths in a compact brief. Use fresh scoped context when the host supports it, without silently changing the user's model settings. Record root and every worker's actual token telemetry or explicit unavailability. Agent type or prompt length alone does not establish savings.

Judge originality against the brief: identify the film's connecting idea, purposeful scene variation, authentic demonstration and cause-and-effect transitions. Reject interchangeable title-card sequences when the story calls for explanation or demonstration. Resolve conflicting critiques with measured geometry and the actual artifact; neither measurement nor aesthetic preference alone overrides a valid readability concern.

Build command/proof counts from the gate report's `receiptSummary`, retaining its all-project scope and unreadable-receipt warnings. Do not recount renders from memory or treat technical receipts as creative acceptance. Keep review coverage, unresolved defects, requested captions, audio mix and actual playback/listening status visible before final delivery.
