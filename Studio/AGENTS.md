# Studio operations

Read README.md, ROUTES.md and STUDIO.json. Resolve its configured projects, library, operations and brands paths before work; read WORKFLOW.md and DEFAULTS.md in that operations folder. Use the installed `.agents/skills/director/SKILL.md` and matched native skills. Keep tools pinned.

Create or resume exactly one project under the configured projects root. New projects require a validated selected pack from Studio Brand Packs and pin it locally. The editor stays neutral. Runtime and skill folders are not brand authorities. Existing films retain their source, assets and approvals.

Director owns intake, context and review; Animator owns newly authored animation; Editor owns editing, captions, sound and final export. Use `npm run workflow -- <slug> status` and its actions for the shared handoff. Read the complete project AGENTS.md once and again when changed. Keep all film material and decisions in that project. Preserve free-form animation and native HTML; no mandatory scene template.

Default to one approval of the complete encoded candidate, including captions and sound. Intermediate reviews are optional. Use guarded review-only staging, then deliver the approved bytes without rerendering. Generic approval never implies watched/listened attestation. Technical success does not grant approval. Record actual decisions with paths/fingerprints. Do not publish or send private material without authorization. Existing approval applies only to unchanged artifacts.

Every run report includes root/subagent token metrics, model/stage/attempt, provenance and coverage where exposed; explicitly record unavailable fields. See Director references/run-reporting.md. Do not invent totals or token savings. Keep library/client contexts separate.

Runtime is installed tooling. Software changes belong in the sibling Builder when present; otherwise maintain this installation with backups and tests; a standalone ZIP does not require or recreate Builder. Preserve projects, library, profiles and brand versions during updates. File unsupported capabilities as concrete issues rather than quietly switching engines.
