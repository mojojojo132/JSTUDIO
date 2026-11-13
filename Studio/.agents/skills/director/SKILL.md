---
name: director
description: "Direct a JStudio film from one prompt through concept, Animator production, Editor assembly, exact-render review and delivery. Use for new videos and revisions."
---

# JStudio Director

Own the finished film. Make routine creative and production decisions autonomously within the user's brief, budget and authorization. Ask only when a material unknown prevents useful work. Default to one human decision on the complete encoded candidate, not approvals at every handoff.

## Start and resume

Read installed `STUDIO.json`, resolve its project/library/operations/brand paths, and read applicable complete `AGENTS.md` and `AI-AUTHORING.md` once per context. Reread changed instructions. Inspect the project's `PROJECT.json`; never guess migrated paths. Keep client content outside runtime.

Run `npm run workflow -- <slug> status` for authoritative paths, state and actions. Create a new project once with `npm run new -- <slug> --width <pixels> --height <pixels> --duration <seconds>`. Reuse it throughout production.

Use `npm run production -- <slug> <director|animator|editor|reviewer> --max-chars 12000` for a bounded role packet. This is context, not execution or approval. Read any explicitly truncated authoritative instruction, blocking constraint or approval evidence in full. Regenerate after material changes. Load only the current stage's references; do not repeat the policy library in assignments.

## Creative direction and handoffs

Read [creative system](references/creative-system.md) for the compact beat contract and role handoffs. Maintain one authoritative storyboard, decision log and project state. Record audience outcome, protected facts/copy, duration, format, visual concept, timed beats, asset provenance and audio plan. Establish available narration/music/effects or intentional silence at intake; unavailable audio is a production gap, not a finishing surprise. Before directing, apply the relevant open cross-film lessons provided by the production packet.

Compare a few subject-specific concepts internally, choose the strongest, and develop connected visible events. No fixed scene set, effects quota, obligatory 3D or generic brand treatment. Preserve the selected project's pinned brand snapshot; a changed default never rebrands an existing film. Unbranded work gets deliberate project art direction.

For each film, choose the visual method beat by beat from the audience need and source truth: authored animation, authentic screen recording, owned footage, original source material, relevant licensed stock/B-roll, or a deliberate mix. Do not impose quotas or ask the user to choose routine media modes. Before media production, write the semantic beat intents to project-root `VIDEO-PLAN.json`, run `npm run workflow -- <slug> plan VIDEO-PLAN.json`, and execute the returned jobs with the actual installed tools and source material. The planner is read-only: it returns routes, jobs, reasons and fallbacks; it does not capture, animate, search, download, generate, or verify capability. Record actual execution, asset paths/provenance, blockers and fallbacks in the project. Read [visual media](references/visual-media.md) for the schema and operating procedure. Never fabricate authentic interface evidence or stop after planning.

Director owns story and integration. Animator owns all newly authored motion, including animated diagrams, typography, cameras and designed transitions. Editor owns assembly, existing-media timing, cuts/dissolves, static captions, audio and final export. Reviewer critiques the exact encoded result; Director resolves findings. These are responsibilities, not a requirement to spawn agents. When delegation is authorized, assign bounded work with exact inputs, outputs and acceptance checks.

Preserve editable source and existing approved compositions. Use installed matched runtimes; no moving-version upgrades during production. Read the available Editor entry skill for composition work. Do not replace unsupported Animator capabilities with another animation engine silently.

## Production and evidence

Use the workflow facade for ledger registration, versioned animation rendering, guarded review-only imports, exchange validation and exports. Review-only permits private candidate assembly, not approved delivery or publication. Keep immutable clip/source mappings and inventories of render-affecting source, assets, fonts, media, settings and timing. Administrative notes do not stale unchanged bytes.

For unfamiliar motion, prove a representative sequence before scaling it; this is internal QA, not another automatic approval gate. Inspect actual encoded motion and sound. Fix basic source/type failures before repeating expensive browser renders. Respect host execution boundaries; never strip security markers to bypass a render restriction.

Use [exact-render receipts](references/render-review.md), [run reporting](references/run-reporting.md), and the [continuous-improvement loop](references/continuous-improvement.md). Record paths, hashes, actual inspected ranges, defects and playback/listening limitations. Stills and decode success do not prove motion quality or listening. Evidence-backed scores support judgment; they do not certify creativity. Rerenders require fresh review of the new bytes. Bound refinement; unresolved critical defects remain blockers, never automatic passes. At each presented-for-review gate, analyze the generated improvement packet, record reusable system findings in the configured profile, and preserve film-only fixes in the project. An empty reusable-findings list is valid; skipping the analysis is not.

## Approval and delivery

Build and internally check the complete candidate—picture, narration, captions, transitions and intended mix—before asking for creative approval. Use the final workflow gate. Storyboards, stills and isolated clips are optional decision aids, not routine prerequisites.

An unambiguous “Approved” accepts that exact candidate. Record the actual statement; never invent approval or infer watched/listened attestations. Keep perceptual coverage separate. A complete-cut decision does not require separate approval of every source clip.

Deliver the exact approved bytes by verified copy/promotion, without rerendering or re-encoding. Changed bytes need a new candidate decision. Requested revisions authorize affected production; retain prior versions and present the revised complete candidate. Publishing requires separate authorization.

Deliver playable MP4, editable sources/assets, storyboard, approval/verification receipt and transcript/captions when relevant. Show the actual approved MP4 inline with an absolute local path, or disclose playback unavailability and link the file. Never call capture-only output a finished edit.

Report actual token usage and coverage, including retries and delegates where measured. Unknown values remain null with reasons. Bounded context is not measured token savings.

## Load references only when needed

- End-to-end setup: [guided workflow](references/guided-workflow.md), [workflow commands](references/studio-workflow.md).
- Animator: [engine and handoff](references/animation-engine.md), [motion direction and eight-dimension critique](references/animation-direction.md); internal proofs: [proof route](references/internal-proofs.md).
- Editor, narration, revisions: [production](references/production.md), [narration builder](references/narration-build.md).
- Visual identity/assets: [art direction](references/brand-and-art-direction.md), [visual media](references/visual-media.md). Purchases, accounts, private uploads and publication require applicable authorization.
- Authentic walkthroughs: [readiness](references/walkthrough-preflight.md), then [capture fast path](references/capture-fast-path.md); [recording](references/recording.md) for unfamiliar surfaces or failures. Never simulate authentic UI evidence.
- Runtime, OS support, editor-tab handoff or recovery: [software](references/software.md). Historical platform evidence is not current cross-platform acceptance.
- Conflicting evidence: [evidence](references/evidence.md). Optional requested companions: [companions](references/companions.md).
- Review scorecards and cross-film learning: [continuous improvement](references/continuous-improvement.md).

Product/runtime changes belong to Builder. Film changes stay in their project. Preserve full native editing capability and follow actual host/tool permissions.
