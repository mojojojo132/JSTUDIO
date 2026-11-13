# Animation direction and review

Apply this standing creative standard to every future Studio video; scale planning and verification to the significance of its animation. Use it for animation planning and revisions. It strengthens the existing storyboard → animation → native edit workflow; it does not approve a particular film or prescribe a replacement editor. Native HTML, Three.js scenes and linked assets remain freely editable.

## Choose the ambition that serves the scene

Use these levels as a planning and critique vocabulary, not a computed score or acceptance certificate:

| Level | Intended motion | Useful when |
| --- | --- | --- |
| L0 | Static composition, cuts or restrained emphasis | Reading, authentic UI instruction, a deliberate pause |
| L1 | Independent object entrances, loops or simple camera moves | Clear diagrams, short transitions and functional explanation |
| L2 | Connected choreography: an action causes another action, with purposeful framing and secondary response | Narrative explanation, object transformations, a visual payoff |
| L3 | Sustained spatial staging, articulated or transforming objects, coordinated camera and environmental response | A demanding signature sequence whose story benefits from this complexity |

Simple work can be excellent. Do not force every scene to L3, 3D, constant motion or a fixed duration. Repeated bobbing, disconnected title cards and an arbitrary zoom do not create a causal story. Judge the result against the approved brief. A still or source inspection can suggest a weakness but cannot establish observed motion quality.

## Plan visible causality before code

For an ambitious or unfamiliar sequence, adapt the [treatment](../templates/ANIMATION-TREATMENT.md) and [sequence plan](../templates/ANIMATION-SEQUENCE.md) into the existing project planning location. Link them from the storyboard as internal working notes; do not make evolving construction detail an approval dependency. Protect agreed meaning, essential causal beats and motion direction while allowing visual exploration. A simple shot can keep the same information directly in its storyboard row.

Describe setup → trigger → action/transformation → environmental response → payoff/hold. Specify what physically changes, what persists, what the viewer follows, and why the next event happens. Break transformations into buildable geometry, layers, hinges, masks or shader operations; “make it dynamic” is not an implementation plan. Use camera position/target or framing keys, lens intent and occlusion deliberately. Keep a static camera when it helps. Add sound events and measured narration cues when relevant; mark silence intentionally.

Use existing deterministic timing, easing, shader and compositing utilities first. Choose native 2D, layered Canvas2D, Three.js geometry, articulated groups or shader effects according to the approved visual result. Describe uncertain construction methods as hypotheses to prove. Do not fabricate engine support, impose a restrictive composition schema or add a general framework for one shot.

## Prove a representative sequence before scaling

For an unfamiliar technique or ambitious treatment, build one short, representative sequence within the approved storyboard. Choose the hardest meaningful action and enough setup/payoff to assess it; length follows the action. This is an internal quality checkpoint, not another automatic user approval ceremony. An existing proven approach or simple L0/L1 scene may omit it with a brief reason.

Render the actual encoded sequence; inspect timing, silhouettes, depth, camera, transitions, clipping, readable holds and continuity. Inspect seek/repeat behavior where state matters. Listen to actual sound if present; a silent render cannot validate the intended mix. Revise specific defects before multiplying the approach across the film. If the proof changes material approved direction, resolve that material direction with the user; otherwise proceed within authorization. Continue autonomously to the complete encoded candidate with narration and captions; do not require proof, chunk or animation-only approval. Guarded review-only native assembly preserves source identity without asserting acceptance.

## Review evidence and focused revisions

Use the [review record](../templates/ANIMATION-REVIEW.md). Retain a versioned preview, diagnostic stills/contact sheet, render settings, source identity, asset provenance and measured media metadata. Record which bytes were reviewed and who actually watched/listened; unperformed checks stay pending. Automated metadata/decode checks establish technical properties only. Neither a score, helper, contact sheet nor successful render grants creative acceptance.

Record timecoded observations, their effect on the viewer and the smallest source revision that addresses them. Rerender changed sequences and inspect affected transitions, timing and audio. Preserve previous evidence and approvals. On native import, retain exact clip-to-source mapping and recheck the assembled encode; use the existing [handoff process](animation-engine.md#versioned-handoff).


## Standing operating model: direct connected visual events

Before coding a substantial new concept, briefly compare two or three subject-specific visual ideas internally and select one with a reason. Reuse tested timing, geometry and motion primitives; do not reuse an entire prior film's scene sequence as the default. Originality is judged by how the metaphor explains this subject, not by random effects or a novelty quota. This comparison stays in existing storyboard notes and adds no approval gate.

For every key beat identify the visible cause, consequence and viewer takeaway. Budget readable settled holds before allocating transition time. Review the actual target aspect ratio and framing; repeated centered title/object layouts need a narrative reason. Revise the weakest meaningful event before polishing its easing. Deliberate stillness and minimalism remain valid.

Honor the user's dimensional constraints. Entirely 2D work can use planar tracking, rolls, occlusion, masks, scale shifts and constructed spatial relationships without adding perspective or simulated volume. Use 3D cameras, geometry and lighting when authorized and story-serving; do not infer a 3D requirement from the word cinematic. An explicitly requested bounded showcase authorizes its design, implementation and review within the stated scope; do not invent another storyboard gate merely for internal construction choices. General release and final-film acceptance remain separate.

Anchor authored events to named narrative and sound cues. Distinguish measured speech/take boundaries, estimated intra-take timings, known synthesized-score events and acoustic analysis; never relabel one as another. Prefer existing engine tools: deterministic keys, cameraTrack/eventResponse, named cue windows, cohort staggering, cubic paths, line instancing, text outlines and compositing. Add small reusable tools only for a demonstrated gap. Keep sampling a pure function of time; cache geometry and seeded variation in init rather than accumulating frame state.

## Review rendered animation in eight dimensions

Inspect the actual encoded clip and event-specific frames. Score each dimension from 1 to 5 as an explicitly subjective judgment, and cite timestamps or frames plus the visible evidence. If motion playback or listening is unavailable, mark the affected judgment provisional or not assessed; stills do not establish timing, entertainment or audiovisual polish.

1. Creative originality: a distinctive treatment and surprise that belong to the subject.
2. Cinematic sophistication: deliberate framing and camera behavior that reveal information or strengthen the action.
3. Animation complexity: meaningful coordination and interaction between systems, not an object/effect count.
4. Visual richness: appropriate spatial relationships, detail and craftsmanship; exceptional 2D and deliberate minimalism are equally valid.
5. Motion quality: convincing timing, transitions, anticipation, impacts, transformations and recovery.
6. Engagement: sustained curiosity, expressive pacing and memorable payoff without exhausting the viewer.
7. Art direction: cohesive and intentional color, typography, materials, composition and motion language.
8. Overall polish: the actual encoded result holds together as a finished creative production, within its agreed scope.

Treat scores as a revision aid, never an objective quality measurement or creative approval. Where the user requires a threshold, do not call the showcase finished below it or certify an unobserved dimension. Revise the weakest idea or event: improve the transformation, environment, interaction or framing before merely adjusting color or easing. Rerender and compare the same timestamps, preserving earlier versions and naming what changed. Extract reusable improvements from what the rendered showcase actually proves; technical tests alone do not prove creative quality.
