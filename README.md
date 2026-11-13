# JStudio

JStudio is an AI-assisted video production workspace: **Director → Animator → Editor → Review**. Give an AI host a brief and Director develops the story and visual concept, Animator creates original motion, and Editor assembles picture, captions and sound. Review checks the encoded candidate before a person approves it. Publishing is a separate action.

JStudio supplies project structure, production instructions, skills, templates and pinned local tools. Your AI host supplies the model and tool access; the launcher does not call a model or produce a film on its own.

## Get started

1. Clone this repository and keep `Studio`, `Studio Content`, and `Studio Brand Packs` together.
2. On macOS run `Studio/Setup Mac.command`; on Windows run `Studio/Setup Windows.cmd`. Setup needs internet access to install pinned dependencies. Animator also needs a supported Chrome or Chromium and per-project setup.
3. Open the repository in your AI host and describe the subject, audience, sources, and constraints. For example:

   > Create a 45-second film explaining this idea for this audience, using these sources. Develop the concept, animation, edit, sound and captions, and bring me the complete video for approval. Make routine creative decisions yourself.

4. Run `Studio/Launch JStudio.command` or `Studio/Launch JStudio.cmd` to discover projects. The host carries out the creative workflow.

Alternatively, from `Studio/`, with Node.js 22 or newer:

```sh
npm run setup
npm run doctor
npm run verify
npm run new -- my-video --width 1920 --height 1080 --duration 45
npm run production -- my-video Director
npm run workflow -- my-video status
npm start -- my-video
```

Project creation makes an editable starter; the production command prepares context for the AI host. Optional local narration can be attempted with `npm run setup -- --voice`; recorded or separately generated audio also works. See [setup](Studio/START-HERE.md) for platform details and limitations.

## How it works

- **Director** owns the finished film, develops the brief and story, coordinates handoffs, and evaluates the complete candidate.
- **Animator** creates original motion; **Editor** handles editing, captions, sound, and export.
- **Review** inspects the encoded film and records evidence and approval. A technical pass does not establish creative quality or human approval. Deliver the approved bytes; publishing requires a separate request.
- Projects keep their sources, media, editable work, reviews and exports together. Reusable assets belong in the library. `Studio/STUDIO.json` configures their paths and the default brand.

## Repository layout

- `Studio/` — application, production instructions, installed skills, scripts, templates and pinned runtime source.
- `Studio Content/default/projects/` — local film projects, excluded from Git.
- `Studio Content/default/library/` — reusable templates and local media; media is excluded from Git.
- `Studio Content/default/profile/` — standing creative and workflow defaults.
- `Studio Brand Packs/` — versioned brand identities; the starter mark is optional and is not an automatic watermark.

Installed dependencies, local projects and media, caches, backups, credentials and generated exports are excluded. The repository is a source distribution, not an offline installer. Check distribution rights before sharing brand assets. Release acceptance remains pending; verify fresh-machine setup and a complete film workflow on each target platform.

## More information

- [Production workflow](Studio/PRODUCTION.md) and [routes](Studio/ROUTES.md)
- [Setup](Studio/START-HERE.md), [production checks](Studio/runtime/PRODUCTION-CHECKS.md), and [packaging](Studio/PACKAGING.md)
- [AI authoring](Studio/AI-AUTHORING.md), [research review](Studio/RESEARCH-REVIEW.md), and [third-party notices](Studio/runtime/THIRD-PARTY-NOTICES.md)
