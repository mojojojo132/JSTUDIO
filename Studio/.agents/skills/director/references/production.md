# Author, narrate, edit and deliver

## Brief and source fidelity

Resume existing brief/storyboard/script before drafting alternatives. Record audience, one practical outcome, sources, protected wording/sequence, desired length, video type, pre-production confirmation status, voice, destination and deliverables. Ask only material gaps. A past 20–25-minute course, 3.5-minute video or six-scene starter is not a universal template.

For source adaptation, map each teaching point to its source page/lesson and destination scene. Preserve exact terminology, examples and answers where required. For a real tutorial, rehearse the actual interface and match labels to current observation. Generated artwork is appropriate for conceptual illustrations, never counterfeit product evidence.

For a new output's per-output review pack and confirmation, follow the [guided workflow](guided-workflow.md). A targeted revision to an approved video needs review only of affected story constraints and optional mockups; do not restart intake. Track actual requested intermediate decisions when any, and the complete-candidate decision against its exact artifact. Do not infer creative approval from authority to implement the system.

## Preserve current edits

Read the current source immediately before a targeted revision and compare the resulting change with the request. For parallel work on one film, use disjoint shot files or bounded working areas inside that same project, and serialize edits to shared source and Studio state. Studio's global undo can include external file edits; inspect its target before undoing. Restore the intended change explicitly rather than reversing another contributor's work. After saving, verify persisted source and reopen the relevant view.

For generated animation, read [animation-engine.md](animation-engine.md). Preserve TypeScript scenes, assets, shot configuration, engine identity, lockfile and render settings alongside the native project, outside its HTML discovery tree. Stage new renders and validate before import; never overwrite an accepted clip in place. A diagram/object/motion change belongs in pdoom; a trim, static caption, standard cut/dissolve or talking-head replacement belongs in Editor. All newly authored animation, including kinetic captions and designed animated transitions, belongs in pdoom. Update only the intended native media reference after rereading current HTML. A duration change requires checking source ranges, downstream timing, narration and captions. Preserve unrelated edits and prior accepted exports.

A user’s review notes authorize the requested caption, pacing, background, animation and transition edits within the established brief. Complete those edits and show a new complete candidate without asking permission again. Material new facts, story or scope may require clarification. Guarded review-only assembly permits unapproved animation; only actual approval of the exact complete candidate permits delivery. Keep optional intermediate decisions as evidence without imposing them on every film.

## Selected-brand visual direction

Read brand-and-art-direction.md and the project-pinned manifest/rules before styling output. Verify actual selected fonts and unchanged original assets. Use visual-media.md for provenance and rights.

Choose the opening, progression and ending for the film’s intended audience response. For instructional videos, use purposeful introductions, real demonstrations, readable close-ups, helpful diagrams/comparisons and a clear learner next action. For brand, campaign or emotional films, follow the approved creative treatment without forcing a tutorial structure. Animate focus and transitions without obscuring controls. Keep interface detail legible at final playback size. Use all native Editor capabilities as useful; do not build a restricted replacement UI to enforce the brand.

## Captions, timing and transitions

Build captions as readable phrases tied to the measured voice, rather than one sentence-wide banner held for an entire scene. Break at natural language boundaries; keep words that belong together in the same cue and use one or two balanced lines. Roughly 3–7 words can be a useful starting size, not a rigid word limit. Give each cue enough time to read, avoid rapid one-word flashing, and preserve the complete spoken meaning. Use measured phrase/word alignment when available; splitting a sentence evenly by character count is only a draft estimate and must not be presented as verified synchronization.

Use the selected pack’s actual approved caption font with stable size, placement and strong contrast. Fit the caption plate around the phrase with padding instead of stretching a bar across the whole frame by default. Keep a consistent safe area and protect the active control, face or diagram. Restrained emphasis can identify the meaningful word; decorative karaoke, bouncing letters and constant restyling make reading harder. Derive burned-in captions and SRT from the same revised cue list, and check short and long phrases at the intended viewing size.

Set cuts from the spoken thought and visible action, not a fixed scene quota. Inspect the interval after each line: preserve time needed to see a result, read a label or take a deliberate breath, and trim holds that add no information. Reduce setup delays and repeated end pauses before speeding speech or demonstrations. Do not fill every quiet second with effects. When a review asks for faster pacing, shortening the existing edit is authorized within that request; update duration, cues and transitions together and present the changed cut.

Motivate transitions through the story: follow a moving object, match shape or screen position, expand a frame into the next image, or carry a line/beat across the cut. A direct cut is useful when the subject changes clearly. Avoid a blank intermediate frame, repeated generic fades or long transition tails that delay the next idea. Check the frames before, during and after the cut; the incoming shot should continue or resolve the outgoing action.

Background motion can establish depth, direction or continuity: a light field using the selected palette follows the focal object, a rail extends into the next scene, or a quiet shape responds to the beat. Keep it subordinate to speech, captions and the actual demonstration; let it settle for reading or precise work. Follow the selected pack’s logo-motion rules; preserve original artwork and do not invent a blanket restriction across brands. Avoid perpetual particles, grids and gradients added only to fill an empty hold. Use visual variety and purposeful motion when the story benefits, not as a quota. See [brand-and-art-direction.md](brand-and-art-direction.md) for identity and contrast.

Review the actual encoded edit at normal speed for caption changes, cut timing and background distraction; listen to the mixed narration when the capability is available. Frame samples and audio statistics alone cannot certify pacing or synchronization. Report any unperformed playback/listening review, and use the user’s review to resolve it instead of describing the result as verified.

## Human narration

For software walkthroughs, apply [walkthrough-preflight.md](walkthrough-preflight.md): accept required saved footage before full narration or assembly. Use a short voice test when the voice is unresolved or pronunciation needs checking; record actual listening when available. If listening is unavailable, disclose the limitation and use the known project choice without inventing a listening claim.

Use an available writing/humanizer skill when it helps the talk track, retaining the selected brand’s voice; do not impose another company’s tone or require an unavailable plugin. Explain location → action → purpose → success in natural speech. Prefer concrete help over slogans, artificial enthusiasm or a list of features. Tighten language before increasing speed.

Use the current project/profile voice selection and verify its local support and pronunciation. If none is selected, propose a suitable available voice; ask only when that unresolved choice materially changes the result. A setup voice test is not production voice approval. Do not silently substitute another voice or send private scripts to a cloud service.

Before a full voice pass, estimate spoken runtime using the approved local voice sample or a representative paragraph at the approved speed. Compare it with the confirmed target range; count learner pauses separately. If the script is materially short or long, revise the script before synthesizing every scene. An estimate is a planning check, not a measured final duration.

For a multi-scene narration build, the [offline builder](narration-build.md) implements a staged generated-output path. Use one canonical, validated scene/script structure for scene IDs, chapter names, spoken text and pauses. Reject missing or duplicate IDs, empty narration, unknown chapter mappings and invalid pauses **before** voice synthesis or project writes. Derive transcript, cue timing, SRT and chapter timing from that same structure and measured local audio; avoid separately reparsing Markdown for each output. Generate into a staging location, verify all expected outputs and references, then promote a complete set. On rerun, replace only clearly managed caption cues; never append a second set or overwrite hand-authored native HTML. Reuse a warmed offline Kokoro process when the installed runtime supports it. Do not introduce a fixed Editor composition schema.

Measure generated audio before final timing. Align each spoken instruction to its actual screen action. Regenerate captions, scene timing and chapter boundaries when audio changes. Sound-level statistics cannot establish human/helpful speech; listen to representative and problematic passages, and review the full result when feasible. State any listening limitation.

## Edit real footage

Preserve the accepted continuous source and keep an edit decision list of retained ranges, speed changes, zooms and removed waits. Use the current Editor general-video/core and relevant media/keyframe/audio skills for composition implementation. Author seekable, render-safe native tracks; do not improvise timing attributes from memory.

Trim unnecessary waits; leave sufficient time to find controls. Avoid speeding up the step currently being taught beyond comprehension. Narration, overlays and captions must describe what the footage actually shows. Distinguish setup explanation from a captured installation and pre-existing projects from projects created on screen. Place project-branded bookends and callouts around footage without making the product UI unreadable.

## Verify and deliver

- Run appropriate native checks and inspect warnings, layouts and sampled transitions. `ok: true` does not mean no findings. Also open Studio’s Lint results: its project-wide HTML discovery can find files outside the root’s linked composition tree. Resolve missing/unloadable media before delivery; a completed render from an older package can omit failed media. Restore the asset or update its reference, rerun the project check, then export again.
- Compare every retained UI capture or source frame with the current target build. Replace stale screens in current-state footage; include them only when clearly framed as historical.
- Review source fidelity, logo identity, font rendering, contrast, clipping, footage readability, meaningful motion, voice alignment and captions.
- Render using the installed native workflow. Probe the encoded file for dimensions, duration, codecs, frame rate and audio when expected; decode for corruption. Inspect actual output at the beginning, every major section and ending. Watch/listen for pacing and teaching utility.
- Present a versioned encoded review cut for user changes or approval. Record the exact cut/hash and actual decision; approval must precede labeling and delivering it as final. Review exports are permitted before final-cut approval. Any content-changing rerender needs review again.
- A preview, successful click, render progress or file size alone is not proof of a final usable film. State exactly which checks were performed.
- Show the approved MP4 inline in chat and verify the delivered bytes match the approved cut. Use an absolute local file path for a local embed; disclose unavailable playback rather than claiming it was shown. Deliver the native editable project with required assets, retained Animator source/render versions when used, transcript/captions and a concise receipt. Keep the raw recording and edit map available for recording projects. Preserve older approved exports.

Receipt fields: scope and sources; package/version; project path; review decisions with artifact revisions/hashes and actual evidence; animation source/engine identity, rendered clip metadata, native import mapping and optional animation decisions when present; capture source/test/final path if applicable; export metadata; visual/audio/content checks; continuous playback and perceptual listening status (performed or pending, with reviewer when known); remaining limitations; deliverable links. If the mix could not be heard, mark perceptual listening pending even when technical audio checks pass. Do not claim an unperformed novice test, audience-access check or platform test.

## Audio gain and evidence

Controlled renderer regression tests verify the expected linear track-gain behavior; a rounded integrated-LUFS value on sparse effects is not enough to infer a broken volume control. Do not silently compensate with automatic normalization or change the mix law. Measure decoded gain/peaks as well as integrated loudness when diagnosing a mix, preserve source stems, and listen to the encoded result when capability exists. Technical gain checks do not establish aesthetic balance or listening evidence.

## Complete-brief preflight

Before presenting a candidate, compare the encoded result with the full request and accumulated decisions: narration version, all requested captions, their integration into the design, required/forbidden branding, format, duration, visuals and requested removals. A missing earlier requirement is a defect, not automatically new scope. Record the check in the existing review notes; do not make another approval form.

Preserve narration to its exact sample duration. Video has discrete frame boundaries; extend the final picture/hold to cover the entire sound instead of truncating narration to floor(duration × fps). Do not use an unexamined shortest-stream mux or resampling/retiming to disguise truncation. Retain original audio and verify the encoded tail and synchronization.
