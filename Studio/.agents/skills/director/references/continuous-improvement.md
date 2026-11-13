# Continuous improvement

Every storyboard, animation or final `presented-for-review` gate creates an immutable packet under `evidence/improvement-packets/<packet-id>/`. It binds the current review, workflow state, recorded command failures, token-coverage report, declared display target, legibility-check status and source hashes. The packet is evidence for learning, not another approval gate. Review its `PACKET.md`, verify the listed source files, and write findings into a copy of `FINDINGS.template.json` named `FINDINGS.json` in that packet folder.

## Review scorecard

New review assessments may include `qualityAssessment` in the assessment JSON before `workflow ... review` writes the exact-media receipt. Use these eight dimensions:

| Dimension | Assess |
| --- | --- |
| `storyClarity` | Whether the viewer can follow the promise, explanation and payoff |
| `originality` | Whether the concept and visual metaphor fit this subject and feel specific |
| `visualCraft` | Composition, animation, transitions, finish and intentional stillness |
| `pacingRhythm` | Whether information, motion and pauses land over time |
| `legibilityAccessibility` | Text size, contrast, captions, safe areas and comprehension at the declared minimum display width |
| `sound` | Narration intelligibility, mix, music/effect balance and silence |
| `cohesion` | Whether the film feels like one authored piece across its beats |
| `factualAccuracy` | Whether factual statements match their cited or verified evidence |

Every dimension is `assessed`, `unassessed` or `not-applicable`. An assessed dimension uses an ordinal 1–5 rating and one or more concrete evidence notes. Unassessed and not-applicable dimensions have a reason and no rating. Use the scale directionally: 1 means a material weakness; 3 means serviceable with identifiable room to improve; 5 means unusually effective for this brief. Do not produce a weighted total, call a rating a pass, or compare unlike films as a leaderboard. Pacing, story clarity and cohesion require full playback; sound requires perceptual listening. Other dimensions still need evidence appropriate to their claim.

Example shape (include all eight dimension keys in a new assessment):

```json
{
  "schemaVersion": 1,
  "dimensions": {
    "storyClarity": {"status": "assessed", "rating": 4, "evidence": ["The demonstration resolves the opening question before the close."]},
    "originality": {"status": "assessed", "rating": 4, "evidence": ["The subject's mechanism drives the visual metaphor."]},
    "visualCraft": {"status": "assessed", "rating": 3, "evidence": ["The rate labels remain readable; one transition is conventional."]},
    "pacingRhythm": {"status": "unassessed", "evidence": [], "reason": "No continuous playback was performed."},
    "legibilityAccessibility": {"status": "assessed", "rating": 4, "evidence": ["Captions and key values remain inside mobile safe areas."]},
    "sound": {"status": "unassessed", "evidence": [], "reason": "Perceptual listening was unavailable."},
    "cohesion": {"status": "unassessed", "evidence": [], "reason": "The full sequence was not played through."},
    "factualAccuracy": {"status": "assessed", "rating": 5, "evidence": ["Key claim was checked against the cited source."]}
  },
  "strengths": ["The visual event clarifies the concept."],
  "opportunities": ["Make the transition into the payoff more distinctive."]
}
```

These ratings preserve a useful per-run signal. Cross-run summaries include assessed dimensions from completed perceptual reviews only, remain directional, and never replace an editor's or user's judgment.

## Classify and record findings

Use `scope: "film"` for a correction that belongs only to this film. Use `scope: "studio"` for a repeatable workflow, tool, handoff, package or QA defect. Use `scope: "creative-system"` for a reusable creative-direction lesson supported by more than a single taste preference. A single film can expose a product defect, but state the general failure and its evidence rather than copying the film's script, caption, private media or client details into the shared registry.

Each finding includes:

```json
{
  "id": "mobile-label-overflow",
  "scope": "studio",
  "category": "review-coverage",
  "themeKey": "mobile-label-overflow",
  "priority": "P1",
  "title": "Catch mobile label collisions before final review",
  "observation": "A label collided with nearby text in an encoded candidate and needed a later revision.",
  "causeHypothesis": "The review path checked sparse stills without targeting the crowded transition frame.",
  "recommendedChange": "Add transition-aware mobile samples to the automated review packet.",
  "acceptance": ["The packet samples each text transition at phone width.", "The report binds samples to the exact candidate hash."],
  "confidence": "high",
  "owner": "JStudio",
  "evidence": [{"path": "evidence/review-receipts/example.json", "sha256": "<64-character hash from PACKET.json>"}]
}
```

Allowed categories are `creative-quality`, `review-coverage`, `telemetry`, `reliability`, `handoff`, `reuse`, `packaging`, `accessibility`, `factual-quality` and `other`. Priority is `P0`–`P3`; confidence is `low`, `medium` or `high`. Evidence must point to one or more exact hash-bound sources listed in the packet. Gate packets include animation treatment, sequence and review records when present so completeness findings can be checked without altering the immutable packet. Use a stable lowercase `themeKey` when the same root problem recurs. Keep observed fact separate from cause hypothesis. An empty `findings` array is valid and records a reviewed run with no durable learning.

Record the review from the configured project root:

```sh
npm run improve -- record <project-slug> evidence/improvement-packets/<packet-id>/FINDINGS.json
npm run improve -- status
```

The configured profile file `STUDIO-IMPROVEMENTS.json` stores only generalized Studio/creative-system issues and per-run quality/telemetry summaries. Film-only findings stay in that film's packet record. A recurring theme is deduplicated and counted once per packet. A finding that reappears after it was marked implemented reopens as proposed, so a regression is visible.

## Disposition and system changes

The shared backlog tracks `proposed`, `accepted`, `deferred`, `rejected` and `implemented`. Record a reason for every disposition. Mark an item implemented only with a saved validation file inside the installation:

```sh
npm run improve -- decide SI-<12-hex-id> accepted --note "Why this should be fixed"
npm run improve -- decide SI-<12-hex-id> implemented --note "Change verified" --evidence Studio/runtime/evidence/improvement-check.json
```

Accepted items are product work, not self-modifying instructions. Implement them through the normal Studio change workflow, test them, and attach the validation evidence. If an issue is deferred or rejected, preserve the rationale; later evidence may reopen it. Never claim token savings from packet size, character counts, command time or successful deduplication. Only complete, explicitly supplied host/provider telemetry can support a usage comparison.
