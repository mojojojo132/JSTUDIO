# Output brand and art direction

The editor has neutral chrome. Never apply a client or JStudio theme to the editor itself.

For new work, resolve STUDIO.json brands and defaultBrand, or use `npm run new -- <slug> --brand <id>/<version>`. The selected version under Studio Brand Packs is the only source for new output branding. Project creation validates and pins it in PROJECT.json and copies an immutable snapshot to `brand/`. Read that snapshot's manifest and inventoried rules. Use its actual logos, fonts, palette and permissions; do not assume JStudio or Inter.

Both engines receive generated copies from that same snapshot: `editor/assets/brand/` and `animation/app/public/brand/`. These are render dependencies, not independent brand choices. Do not edit or switch them separately. Changing Studio's default affects future projects only. A deliberate existing-film rebrand is a separate revision, never a side effect of upgrading Studio.

Existing unpinned films keep their project-local originals. If required assets are missing, stop that operation and report the missing source; do not use an archived kit or a runtime folder as fallback. Builder archive is historical evidence only.

Compose for the subject, audience and selected brand. Use one dominant idea per beat, vary framing for meaning, connect cause and consequence, and allow readable holds. Original marks retain geometry/colors/aspect ratio unless the selected pack explicitly permits a change. Brand rules govern output, not a restrictive scene template. Choose imagery and motion for the story rather than repeating the previous video's layouts.

Before delivery, verify snapshot and generated-copy hashes, then inspect encoded logo integrity, contrast, actual fonts, safe space and readability at relevant timestamps. Metadata checks alone do not prove visual quality. Keep approved wording exact; do not add an unrelated slogan.
