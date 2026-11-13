# JStudio — ready for John’s test

This is the designated testing installation with animations, matched JStudio Director and the native Editor editor. Internal build identity remains1.2.0-rc.13 so the verified package can be traced exactly. Existing development and QA copies are preserved.

1. **Try the approved animation demo:** double-click **Open Animation Demo.command**. It opens the editable25second film in native Studio. Its approved MP4 is in `projects/make-the-idea-visible/APPROVED-FINAL.mp4`.
2. **Make a new video with AI:** open this **JStudio** folder as your Codex project. Use the bundled **director** Director and describe your video or attach your source material. Follow CODEX-START.md if Codex shows an older global skill with the same name.
3. **Open the starter editor:** double-click **Launch JStudio.command**.

The Director guides written-story approval (mockups optional), complete Animator animation review, mixed-media editing, final revisions/approval and chat delivery. Your caption, pacing and creative-motion feedback is included. New animation workspaces install their own pinned dependencies; `my-first-animation` is prepared here for a quick renderer test.

Each new video lives in one project container under **projects/<name>/**. Its editable native Editor project is in **editor/**; Animator source and renders, storyboard/mockups, media, interaction log, versioned reviews and delivery stay alongside it in that same container. Create one with `npm run new -- <name>` and resume it by reusing that folder. Legacy folders in **animation-projects/** remain supported in place; don’t put new video work there. Keep the bundled engine template unchanged. Preserve approved exports before making revisions.

This Mac is configured. Use **Check Mac.command** to rerun the checks. Windows launchers are included, but Windows is untested. Do not copy this Mac’s runtime to Windows; use the clean distribution ZIP and run its Windows setup. This is the final prepared handoff for your test, not a claim that your product acceptance review has already passed.
