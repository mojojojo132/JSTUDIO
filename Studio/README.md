# JStudio

One brief. One film. A complete creative production workflow.

**Director** chooses the story and visual concept. **Animator** authors original motion. **Editor** assembles picture, captions and sound. **Review** inspects the actual encoded film and directs specific improvements. The AI host executes this workflow using the installed skills; no separate autonomous model service is bundled.

Give your AI host a video request and let Director handle routine choices. Intermediate approvals are optional. The default is one human decision on the complete candidate, followed by delivery of those exact bytes.

Each review gate creates a hash-bound learning packet. Director separates film revisions from reusable Studio findings, and accepted recurring lessons feed later handoffs and tested product updates.

Production readiness, full encoded-media QC, caption timing checks and a local candidate review workspace are available through `npm run workflow -- <slug>`. See [production checks](runtime/PRODUCTION-CHECKS.md) for the commands and review interface.

```sh
npm run new -- my-video --width 1920 --height 1080 --duration 45
npm run production -- my-video Director
npm run workflow -- my-video status
npm start -- my-video
```

The production command prepares context for the AI host; it does not generate a video by itself. Project creation makes an editable starter, not a finished film.

Read [START-HERE.md](START-HERE.md), [PRODUCTION.md](PRODUCTION.md), [ROUTES.md](ROUTES.md) and [PACKAGING.md](PACKAGING.md). Paths come from STUDIO.json. Existing films keep their source, brand pins and approvals. New films use the configured external identity; the JStudio starter mark is optional and must not become an automatic watermark.
