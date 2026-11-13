# Guided journey: source to polished JStudio video

## Adapt to the user's mode

- **Do it with me:** explain and demonstrate one useful stage at a time; leave a clear next action and ask focused questions at decision points.
- **Produce it for me:** infer settled choices and prepare a reviewable plan for each video. Complete authorized production and report progress.
- **Improve this video:** inspect the existing export and editable project; diagnose content, pacing, visual and audio issues before rebuilding. Preserve what works.

Do not reset a returning user's workflow or repeat setup/intake already completed. Keep technical implementation in production notes; learner-facing screens and narration should teach the task.

For new concepts, research or substantial production, apply [creative direction and subagents](creative-direction.md). Director selects the treatment, delegates useful workstreams within the current stage and integrates one coherent result. Scale the process to the requested film; campaigns, brand stories and emotional pieces need not follow a tutorial structure.

## 1. Define the useful result

Start from provided material. For source-based adaptation, preserve source meaning, approved wording and sequence by default; propose any reordering for confirmation. Ask one focused batch of unresolved questions for each output: audience and desired action, message/source of truth and protected facts, duration/aspect/destination, required real screen actions or media, narration/captions, and end action. Use known answers instead of repeating them; mark proposed defaults as assumptions for review. For a vague brief, propose a concrete outcome and approach the user can react to.

Write `BRIEF.md` with sources, scope, audience, learner outcome, protected facts, deliverables, proposed answers, open questions, voice and platform constraints. For multiple videos, identify each output separately and share only genuinely common decisions. Include a source map for adaptations. Do not reuse another course's duration or audience as a global default.

## 2. Get the workspace ready

Use [software.md](software.md) to identify the actual source or portable layout and required setup. For this portable package, create/resume one video container with `npm run new -- <slug>` at `projects/<slug>/` before planning; put the native Editor project in its `editor/` child and keep every video-specific brief, storyboard, mockup, interaction log, source asset, Animator source, review and delivery inside that container. Record user requests, material questions/answers, decisions, revisions and approvals in the root `INTERACTION-LOG.md`. For other package layouts, follow their existing project conventions without scattering one video's work across folders. Open Studio when useful for building the complete review candidate; no animation-only approval is required for guarded review assembly. Readiness checks and small isolated feasibility tests may run earlier; label them technical tests or mockups, not approved footage. Explain the roles: Director plans and authors, pdoom creates animation shots, native Editor combines and edits the film, and its renderer exports the review cut. Do not invent an in-product chat workflow or assume pdoom is installed. Follow [animation-engine.md](animation-engine.md) for engine readiness and source separation.

For a software walkthrough, complete the environment and functional rehearsal in [walkthrough-preflight.md](walkthrough-preflight.md) before presenting the plan as feasible. Keep unresolved checks visible and preserve the user's pre-approval restrictions. This uses a small isolated sample, not an assembled tutorial.

Read the bundled brand guide and select original assets with the manifest. Reference bundled files relatively; copy only required media/fonts and the font license into the project. Do not change unrelated software or silently repack the installer.

## 3. Plan the story and visual evidence

Create a separate `STORYBOARD.md` for **each output**, even when several videos share a campaign or source. Include scene/time range; viewer question or intended takeaway; exact narration/on-screen copy; medium (pdoom animation, authentic screen recording, talking head, real-world footage or other), actual asset/action; framing/callout/motion; source or claim evidence; and how success will be shown. Show the total timing and a concrete next action. Story structure is flexible; the six-scene starter is not a limit.

For substantial animation, link a treatment and timed causal sequence plan using [animation direction](animation-direction.md). Keep construction detail as evolving internal working notes; only essential causal beats and motion direction belong in the approval scope.

Create a shot/asset/capture list using visual-media.md and the short capture-fast-path.md for macOS and Windows; use recording.md only when its deeper guidance is needed. Identify the exact real actions and feasible capture scope before promising them in a walkthrough. Mark any action that can only be described, not filmed, and propose a truthful alternative. Source imagery and B-roll support the story, never replace proof of a product capability.

Visual mockups are optional: create them only for a consequential unresolved style decision or when the user requests them. Use the intended aspect ratio, original project-selected assets and authentic source material where relevant. Label concept stills and simulated UI honestly. Keep mockup HTML outside `editor/`, in `mockups/` or `animation/`. These examples do not lock shot layouts or choreography unless the user explicitly requires a detail.

Maintain one compact written plan per output with intended takeaway, timed causal beats, protected copy/facts, motion direction, format, assets and material gaps. Proceed within the user’s existing authorization. Present the plan for a decision only if requested or a consequential unresolved choice requires it; optional mockups never become routine gates.

## 4. Acquire, create and capture

Source authorized online media, generate conceptual visuals when useful, and build accurate editable diagrams. Freeze selected assets locally where permitted and maintain provenance/license records. Use capture-fast-path.md for a real walkthrough on the current macOS or Windows host: rehearse, inspect one saved acceptance clip for each distinct surface, then capture the planned takes. Preserve separate takes as separate sources. Do not spend final-take time troubleshooting installation or discovering controls.

For each asset, answer: what does this help the viewer understand? Replace decorative filler with a demonstration, comparison, example or clearer diagram. Keep captured UI authentic even when it contains colors outside the JStudio palette.

## 5. Create and review pdoom animations

Follow [animation-engine.md](animation-engine.md) to author animation within the agreed brief, retaining editable source and measured narration timing. Use internal proofs for difficult techniques, inspect the encoded motion, and fix defects before full assembly. Retain component IDs and versions. A silent animation review is optional; default to the complete narrated/captioned candidate.

Use guarded review-only import and exchange validation to assemble unapproved animation in Editor for the complete candidate. This stages work for review and grants no delivery or publication approval. Internal isolated proofs remain available for experiments. Revisions reopen the changed complete candidate, not routine intermediate permission gates.

## 6. Activate Editor, narrate and assemble

For software walkthroughs, require accepted footage before full narration or assembly; follow the [readiness gates](walkthrough-preflight.md). Reuse any approved script, listened voice sample and measured narration prepared for animation timing. For remaining narration, humanize the script, generate/listen to a short sample of the project-approved voice (verify the project/profile choice and runtime support as described in production.md) when narration is wanted, estimate full spoken runtime against the confirmed range, validate the scene/script structure, then synthesize and measure full audio. Record who actually listened and the result; disclose unavailable listening instead of treating technical checks as a substitute or adding a routine attestation gate. For complete-candidate review, create or resume `projects/<slug>/editor/` and import validated, versioned animation clips from the same project container with relative local references. Combine them with accepted real footage, original project-selected assets, accurate captions, purposeful transitions and clear visual hierarchy. Editor edits rendered clips; changes to objects inside an animation return to its `animation/` Animator source. Preserve both sources. Follow upstream composition/media/animation/audio skills; do not guess unsupported CLI flags or attributes.

Apply the [caption, timing and transition guidance](production.md#captions-timing-and-transitions): use readable voice-timed phrases, remove unneeded holds and motivate cuts/background motion through the story. Match spoken directions to the screen or diagram at that moment. Tighten redundant wording and waits before increasing playback speed. Make chapter transitions engaging but short; protect reading time. Add music/SFX only when helpful, with valid usage rights and narration clearly intelligible.

## 7. Review and refine the native edit

Open the actual named project in Studio using the printed URL and the [editor-tab handoff](software.md#editor-tab-handoff). Preserve files and keep the preview server running. Record the active project path, preview URL/port, health result, browser tab and checkpoint in the existing receipt. The read-only [preview handoff helper](../tools/preview-handoff.mjs) can check a local preview and dedicated browser session receipt: run `node <director-skill>/tools/preview-handoff.mjs record <project> <local-preview-url> <project>/PREVIEW-SESSION.json "timed preview pending" [browser-session.json]` once, then `node <director-skill>/tools/preview-handoff.mjs check <project>/PREVIEW-SESSION.json` on resumption. Reuse a healthy preview and one Studio tab. Show where to find compositions/assets, select a layer, make a targeted content/style change, preview its transition and return to Master. Confirm saved changes. Explain that the starter is editable and optional; all native capabilities remain available.

Use feedback such as “show the control longer,” “simplify this diagram,” “replace this B-roll with the actual result,” or “tighten this sentence.” Update source, timing, narration and captions together. The user’s requested editorial refinements authorize that work; complete them and show a revised cut without repeating the permission question. Reopen the affected storyboard only for new story scope, and present a revised complete candidate when its content changes. Do not regenerate through the retired custom editor.

## 8. Export a review cut, obtain approval and deliver

Review root-versus-scene scope and export settings before pressing Export. Run relevant native checks and inspect warnings. Render a versioned review MP4, open it and check visual/audio/content quality, not just the preview. Inspect transitions, moving callouts and captions; probe/decode media. Report any unperformed review honestly.

Present the actual encoded review cut in chat, obtain changes or approval, and revise the appropriate source. Record the exact approved cut and the user's decision. A preview or review export is not final acceptance. Review exports are allowed before this gate; do not require approval of a film the user has not seen. After approval, deliver the same bytes by verified copy/promotion; do not rerender for delivery. If bytes change, present a new candidate for approval.

Show the approved final MP4 inline in chat (an absolute path for a local file), then link native project/assets, retained Animator source and shot versions when used, the confirmed written storyboard and any optional mockups for that output, captions/transcript, media credits/rights record and verification receipt. Include continuous source/edit map for recorded projects and HTML/course only when requested. Confirm paths/links work in the intended handoff. Explain how to reopen/edit/re-export this project and what to preserve when sharing. Localhost is not a shareable team URL; External upload is a separate authorized step.

## Readiness criteria

A novice can identify the next action and recognize success; facts match sources; visuals explain rather than decorate; UI and captions are readable at delivery size; selected-brand identity uses approved originals; narration aligns with events; media rights/provenance are known; the actual encoded file passes review. If any essential criterion fails, fix it or clearly label the output incomplete.

## Editability and final creative checks

Plan the edit boundary before authoring: keep suitable static titles, captions and editorial labels as native Editor layers using the pinned brand fonts/colors. Animator owns designed animated text and objects; their rendered pixels cannot become independently editable Editor objects. Preserve and identify the Animator scene source, render version and return-to-animation revision path. Describe the actual editability delivered, not merely that an MP4 sits on a timeline.

Before presentation, inspect the delivered frame at a realistic mobile/feed viewing size. Check the smallest essential text, demo labels and captions, not only the largest title. Inspect the difficult transitions in motion for continuity, overlap, abrupt changes and reading time. Listen to the actual encoded mix for intelligibility, gaps, harshness and clipping when capability exists; technical loudness or sampled frames do not establish listening or continuous playback. Use the prepare-review handoff in [Studio workflow](studio-workflow.md#prepare-a-complete-review-handoff), and state any unavailable review clearly.
