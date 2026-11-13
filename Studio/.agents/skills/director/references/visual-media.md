# Visual media: choose, source, create and verify

## One-prompt beat planning and execution

Choose the visual method for each semantic beat from what the audience needs to understand and what the sources can support. The Director makes routine choices among Animator-authored motion, authentic screen recording, owned footage, original/source-document visuals, relevant licensed free stock/B-roll, and generated illustrative imagery. Mix methods when it serves a beat. Do not impose a mode quota or request separate approval for routine selection. Follow the request, project constraints, installed tools and truthful provenance.

During the storyboard pass, write `VIDEO-PLAN.json` at the project root with this schema. Keep the beat timing aligned with the storyboard; describe the meaning and visual purpose, not a preselected production tool:

```json
{
  "schemaVersion": 1,
  "beats": [
    {
      "id": "show-the-workflow",
      "startSeconds": 0,
      "durationSeconds": 6,
      "intent": "demonstrate-interface",
      "takeaway": "A request becomes an editable cut in one project.",
      "visualBrief": "Show the actual project opening, then the edit timeline with its caption and audio tracks.",
      "authenticity": "required",
      "available": { "screenCapture": true, "ownedFootage": false, "sourceDocument": true }
    },
    {
      "id": "explain-the-handoff",
      "startSeconds": 6,
      "durationSeconds": 5,
      "intent": "explain-mechanism",
      "takeaway": "The editor preserves the source-to-cut mapping.",
      "visualBrief": "Reveal the source clip, timeline placement and matching receipt as a simple connected diagram.",
      "authenticity": "required",
      "available": { "screenCapture": false, "ownedFootage": false, "sourceDocument": true }
    },
    {
      "id": "close-with-context",
      "startSeconds": 11,
      "durationSeconds": 4,
      "intent": "establish-context",
      "takeaway": "The finished cut is ready for its intended audience.",
      "visualBrief": "Use a calm desk-side closing image with a clear screen area for the final line.",
      "authenticity": "illustrative",
      "available": { "screenCapture": false, "ownedFootage": false, "sourceDocument": false },
      "searchQueries": ["editor reviewing finished video at desk natural light wide composition"]
    }
  ],
  "constraints": { "allowOnlineStock": true, "allowGenerated": true }
}
```

Use only these intents: `demonstrate-interface`, `explain-mechanism`, `show-evidence`, `establish-context`, and `evoke-mood`. Set `authenticity` to `required` whenever the beat depicts a real interface, specific event/person/place, source artifact, or evidence for a factual claim. Use `illustrative` only when a conceptual or mood image can serve without implying documentary proof. Set each `available` flag from material actually present or accessible in this project; it describes source availability, not an installed backend, capture permission or asset license. Omit unknown flags. Add scene-specific `searchQueries` only where outside sourcing could help, with generic terms that do not expose private project information. Set `allowOnlineStock` only for permitted free public sources with no purchase, account or access-control requirement; set `allowGenerated` when generated illustrative work is acceptable for the brief.

Run the read-only planner:

```sh
npm run workflow -- <project-slug> plan VIDEO-PLAN.json
```

It returns ordered per-beat route, owner, reason, actionable job, fallback and capability/availability information. The result has `noMediaExecuted: true`: planning does not write files, capture a screen, author animation, search/download stock, generate imagery or validate an asset. A route is a production suggestion, not evidence that a backend, source, license or permission exists. If the command or requested backend is unavailable, continue with installed authorized tools where possible; otherwise record the specific blocker and suitable fallback in the project. Do not claim an offline module or tool is present without checking.

Execute the jobs. For an interface demonstration, inspect the current app/browser inventory and confirm the real target is accessible; run `npm run workflow -- <slug> readiness` and follow the Director [walkthrough readiness](walkthrough-preflight.md) and [capture fast path](capture-fast-path.md) for authentic recording. Do not infer capture capability from a planner route or `available.screenCapture`. Never draw, generate or stage a fake screenshot or interaction to satisfy `demonstrate-interface`. If authentic capture is unavailable, state the gap and use an accurate source-backed diagram or explain that beat cannot be demonstrated. For free stock, inspect the original item and its creator/license terms, confirm intended use, and copy the selected asset into the project. Stock provides context only; it never substantiates product behavior, named entities or factual claims. For animation, author the intended motion in Animator and inspect the rendered clip. For source documents, reuse authorized original material and preserve its meaning. For generated images, keep text/data editable and label conceptual treatment where ambiguity could mislead.

Keep `VIDEO-PLAN.json` in the project and record per-beat route actually used, commands/tools, execution status, source/license evidence, local asset path and checksum, substitutions, blockers, and any fallback in a project execution note (for example `VIDEO-PLAN-EXECUTION.md`). Maintain the asset inventory in `ASSETS.md` or the project's equivalent. Do not mark a planned job as completed until its asset has been acquired or created and checked. If no authorized route works, disclose the production gap rather than passing off a plan as footage.

## Plan the visual around the film’s purpose

Perform one purposeful media pass during storyboarding. Choose media for the desired understanding, feeling, belief or action; variety alone is not a reason to add an asset. Use the evidence-oriented choices below when the film explains or demonstrates; use the approved treatment for expressive or emotional passages.

| What the viewer needs | Preferred evidence/visual |
|---|---|
| Where to click / how the software behaves | Real screen footage and accurate close-ups |
| A process, relationship, decision or architecture | Editable diagram with source-backed labels/arrows |
| Recognize an object, document or result | Original source image or authorized photograph |
| Real-world context or a transition between concepts | Relevant licensed B-roll |
| An abstract idea with no documentary evidence needed | Clearly conceptual generated illustration |
| Exact source layout impossible to reconstruct faithfully | Original slide image, legible at output size |

For “make it more visual,” name concrete substitutions: turn the process paragraph into a four-step diagram, show an actual click sequence, or replace a filler title with the resulting artifact. Do not add generic robots, circuitry, glowing networks or decorative stock merely to fill time. Do not substitute B-roll for a real demonstration the user requested.

## Online B-roll and images

Use the host's available search/media tools and current official provider documentation. The `media-use` skill can help resolve/adopt assets when installed; read only the needed references and confirm actual CLI support. Its provider suggestions do not override the user's local-only voice preference or automatically authorize new service accounts, payments or private uploads. Do not force HeyGen sign-in simply to use existing local assets. Native tools and authorized stock-source downloads remain options.

1. Write scene-specific searches around visible action, setting and composition, such as “hands arranging process cards overhead wide copy space.” Use generic/redacted searches for private projects.
2. Prefer user-owned footage and clearly licensed stock sources. Search previews are discovery, not usable deliverables. Open the asset's original page and verify the actual downloadable item, creator, license and intended-use conditions; do not assume all assets on a site share one license or that “royalty-free” means unrestricted.
3. Choose footage that adds context without implying it depicts JStudio staff, a real customer, a product feature or measured results. Label conceptual/illustrative material when ambiguity could mislead.
4. Check resolution, duration, frame rate, orientation, focal point, crop headroom, embedded marks and temporal relevance. Download through permitted provider methods; do not remove watermarks, bypass access controls or download merely to evade the host's media-display restrictions. If reuse rights are unclear, select another source or report the gap. Paid media requires appropriate user authorization.
5. Keep a local permitted production copy, source/license evidence and checksums. No fragile hotlinks or search thumbnail URLs in the render. Include credits/attribution where required, and distinguish permission to use a rendered clip from permission to redistribute its raw source.
6. Review early/middle/late frames and moving playback. Preserve authentic footage; use bounded crop/correction when helpful. Follow native media-treatment guidance for effects, not improvised renderer-incompatible filters.

Maintain `ASSETS.md` or equivalent with: asset ID; scene/purpose; local path; type; original URL/provider/creator; acquisition date; license URL/name and retained evidence; attribution; permitted use/raw redistribution limits; dimensions/duration; checksum; modifications; factual-versus-illustrative status. For owned/generated assets record their provenance instead of inventing a stock license. Recheck rights if destination/use changes materially.

## Diagrams

Use native editable HTML/SVG/shapes or the diagram capability available in the video workflow for precise teaching visuals. This is diagram authoring, not permission to redraw a brand logo. Use original logo files as separate assets when needed. For an explicitly requested generated raster image, follow the available image-generation workflow instead.

Map source facts before layout: nodes, relationships, sequence, branches, data and uncertainty. Check arrow direction, labels, grouping and process exceptions against the source. Reveal in explanation order; keep enough context visible to orient the learner. Prefer legibility over dense architecture wallpaper. Use shape/labels as well as color to distinguish meaning. Inspect the final motion sequence; a static layout pass does not validate animation order.

## Generated images and source visuals

When generation is appropriate, use the available image-generation tool/skill with a scene-specific brief: teaching purpose, subject, composition/copy space, aspect ratio and JStudio-compatible visual character. Keep precise UI labels/data and final copy editable where possible. Use original logos separately in video assembly according to the supplied kit; never ask a generator to invent a replacement mark. Follow any higher-priority tool restrictions for actual image edits/compositing.

Do not invent documentary evidence, JStudio employees, customer success, product screens or factual metrics. Inspect every result for irrelevant symbols, gibberish, visual artifacts and false implications. Retain prompt/output provenance. If generation fails, use an appropriate source image or diagram only when compatible with the requested format; disclose material substitutions.

For uploaded PDFs/decks, cite page/slide in the source map. Extract and reuse original visuals when authorized. A screenshot of a slide is not screen-recorded interaction. Preserve source meaning even when replacing surrounding presentation.

## Audio, pacing and integration

Choose music/SFX through the same rights/provenance checks. Avoid lyrics competing with narration. Keep the voice clearly intelligible; use restrained transitions and listen to the mixed export. Media is optional, not a quota. Preserve the project-approved voice. Follow the project/profile voice choice and verify its actual runtime support.

Place media using native Editor contracts, with explicit source ranges/timing as supported. Measure voice and footage; sync captions and callouts to actual actions. Freeze each selected asset into the project as permitted, then test seeking and exported playback. If a clip is replaced, recheck timing, crop, narration meaning and credits.
