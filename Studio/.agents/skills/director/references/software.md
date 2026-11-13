# Software operation

## Identify the package before running commands

Use the operating Studio root identified by `STUDIO.json`, `runtime/scripts/`, `.agents/skills/` and configured external content roots. Run `npm run new -- my-video` for a new complete video folder; `npm start -- my-video` opens its native edit. For migrated projects, PROJECT.json gives the native path, which can remain inside production/. Never select an archive or Builder source folder for ordinary video production. Native HTML and linked compositions remain authoritative; never regenerate edits through the legacy custom editor.

## Portable first run

Extract the complete ZIP into a writable local folder. Read README.md. Run Setup Mac.command or Setup Windows.cmd using an available authorized tool. Setup requires internet and disk space, installs a portable runtime and voice environment, and may reuse user-level browser/model caches. Do not describe a cached setup as a pristine-computer test.

Verify installer exit/result and `runtime/.runtime/setup-complete.json`, then native checks and a short voice sample if narration is needed. A marker alone is not proof that the current install works. Launch JStudio.command / Launch JStudio.cmd lists available projects; `npm start -- <slug>` opens the selected project. Use that project's preview command and the URL actually printed. Keep its server alive during Studio work and exports.

Mac portable commands, from package root:

```sh
./runtime/.runtime/node/bin/node runtime/scripts/new-project.mjs my-video
./runtime/.runtime/node/bin/node runtime/scripts/hf.mjs preview projects/my-video/hyperframes
./runtime/.runtime/node/bin/node runtime/scripts/hf.mjs check projects/my-video/hyperframes --strict --snapshots
./runtime/.runtime/node/bin/node runtime/scripts/hf.mjs tts --text-file projects/my-video/editor/talk-track.txt --voice af_heart --speed 1.02 --output projects/my-video/editor/assets/voice.wav
./runtime/.runtime/node/bin/node runtime/scripts/hf.mjs render projects/my-video/hyperframes --quality delivery --output projects/my-video/delivery/video.mp4
```

Windows PowerShell commands, from the extracted package root (quote paths that contain spaces):

```powershell
& .\runtime\.runtime\node\node.exe runtime/scripts/new-project.mjs my-video
& .\runtime\.runtime\node\node.exe runtime/scripts/hf.mjs preview projects/my-video/hyperframes
& .\runtime\.runtime\node\node.exe runtime/scripts/hf.mjs check projects/my-video/hyperframes --strict --snapshots
& .\runtime\.runtime\node\node.exe runtime/scripts/hf.mjs tts --text-file projects/my-video/editor/talk-track.txt --voice af_heart --speed 1.02 --output projects/my-video/editor/assets/voice.wav
& .\runtime\.runtime\node\node.exe runtime/scripts/hf.mjs render projects/my-video/hyperframes --quality delivery --output projects/my-video/delivery/video.mp4
```

In Windows Command Prompt, omit PowerShell's leading `&`. Do not paste POSIX `export` commands into PowerShell or assume a drive letter. Both platforms use the same native project, assets, voice and export workflow. These command forms are documentation, not evidence of a Windows device test. Read the actual release `PLATFORM-ACCEPTANCE.md` for supported OS versions and architectures. The current candidate targets macOS Apple Silicon, macOS Intel and Windows x64; Windows ARM is not a native package target. Run its `Check Mac.command` or `Check Windows.cmd` where supplied and retain the receipt. Targeted support is not qualification: actual Windows and Intel Mac device gates remain open until their receipts pass. For npm commands on Mac, the same shell must first run `export PATH="$PWD/runtime/.runtime/node/bin:$PATH"`. Do not assume npm or Homebrew FFmpeg is globally installed. Inspect installed CLI help before using flags that vary by version.

In a matched Studio release, first distinguish an undiscovered skill from a missing file: confirm the opened project and its `.agents/skills/` path. If a bundled skill is absent, preserve authored projects and restore the exact matching ZIP; do not run upstream skill installers or upgrades to repair the release. Source workspaces without a matched distribution may use their own documented installation route. Preserve the release's pinned runtime and skill snapshot; an intentional upgrade requires a newly matched package and compatibility verification.

## Runtime preflight and recovery

In the repaired working source and portable packages, run `npm run doctor -- --voice` from the package root to check FFmpeg/FFprobe and voice imports; omit `--voice` for silent work. This is a dependency check, not a generated-speech or listening test. Use `npm run editor -- tts ...` for local narration. With bundled Node on Mac, first expose its bin directory on PATH as above.

Preview: `npm start -- my-video --port 3000`. Choose an available port and use the actual printed URL. Runtime dependencies resolve from the installed runtime folder, independently of Builder.

If required runtime components are missing, preserve the project and run the portable package's documented Setup launcher (`node runtime/scripts/setup.mjs` when a supported Node is already available). Rerun the health check and a short voice sample when needed. Capture the actual failed command, version and error; retry the smallest failed operation after a supported repair. Do not replace unrelated runtimes or hardcode another user's emergency paths. If the same failure persists without new diagnostic evidence, report the specific blocker instead of repeating full setup/render attempts. Working-package repairs do not establish that an older ZIP contains them.

## Native Studio observations

Observed in Editor 0.8.77; recheck the current UI:

- Compositions opens individual scenes; return to Master/root for the complete film.
- Assets contains the project-selected brand and media; native import remains available.
- Select a scene's text layer to edit its CONTENT and typography in Design. Read back both canvas text and persisted source. Per-keystroke input caused truncation during one take; a single field replacement/paste was more reliable. Treat failures as recoverable, not successful edits.
- Layers, Code, Variables, motion/keyframes and timeline tools remain native. Use them when they help the task; this list is not a capability limit.
- Renders exposes format, resolution, frame rate and quality. Read back the selected setting: the September 27 three-video QA observed High Quality remaining Standard. A later working-package repair passed pointer selection, reload persistence and a logged High Quality UI export, including the cached-origin case after full asset-graph versioning. Recheck the installed build; historical ZIPs do not include that repair. A CLI fallback does not prove the UI selector works. The top Export button starts rendering immediately. Review settings and confirm root versus scene scope first.
- Wait for a completed render item, then open its actual MP4 and verify playback. A progress indicator is not a delivered video.
- In the observed Edge/Studio combination, Command+1/2 was intercepted by Studio. Control+Tab / Control+Shift+Tab switched browser tabs. Verify visible tab state after switching; shortcuts are not universal.

## Portability and troubleshooting

Share the original distributable ZIP, not a configured `.runtime` folder. To relocate, extract/setup at the destination and bring authored projects/assets over. Resolve dependencies from package metadata rather than absolute paths from John's machine.

A deep-path first-run failure in eSpeak was originally repaired in a demo extraction. The September 27 working-package repair now includes short-path voice staging and managed-interpreter recovery; setup, repeat setup, narration and a relocated-copy render passed on Apple Silicon. See [evidence.md](evidence.md). The demonstrated repair is Mac-specific evidence; a Windows error mentioning the same file needs its own diagnosis. Do not assume the fix is in the release ZIP. Prefer a short local extraction path; diagnose the actual error before proposing package changes. Preserve OS safeguards and unrelated runtimes. A setup failure does not justify force-replacing an unrelated Python installation.


## Moving projects between macOS and Windows

Copy the named project with its assets and linked compositions; install the destination platform's runtime from the same Studio release. Never transfer `.runtime` or `node_modules` between platforms. Keep media/font references relative to the project and preserve exact filename case. Inspect for absolute source-machine paths before handoff. Run native checks, reopen the project and render on the destination; compare content, timing, typography and media against the approved source export. Record the actual destination OS/architecture and results. A source-side path scan is useful but cannot close a destination runtime test.


The af_heart commands demonstrate installed speech plumbing; project/profile voice selection and actual support determine production narration.


## Editor-tab handoff

At native-edit review, give the user the actual Editor editor with its master timeline, canvas and playback controls, not a raw HTML page, Animator authoring preview or only an MP4. The editor remains neutral; the selected pack controls the video. Keep the master selected for whole-film review and distinguish editable preview from the exact encoded review cut.

From Studio root, first check the named project's existing preview with `node runtime/scripts/workflow.mjs <slug> edit --status --json`. Reuse its healthy URL and existing matching tab. If absent, run `node runtime/scripts/workflow.mjs <slug> edit --background --no-open`; use the URL actually returned and verify HTTP health. `--no-open` avoids invoking an OS browser when the AI host can open a tab itself. Do not guess a localhost port, restart every turn, or launch multiple copies. Restricted execution may require host-approved server execution; do not bypass controls.

In Codex desktop, use its available `open_in_codex` browser target with the verified URL to open the editor panel; reuse the existing tab when supported. Other hosts should use their actual supported browser-tab tool. Tool names are capabilities, not a requirement to install Codex or a browser plugin. If the host cannot open a tab, provide the verified link and normal `npm start -- <slug>` launcher command, and explicitly say automatic tab opening was unavailable. Never report a tab opened based only on a successful server start.

Record project path, exact URL and actual opening/verification status in the existing preview receipt. The preview-handoff helper checks HTTP and, when a dedicated browser session is available, exact URL tab matching; HTTP health alone does not prove an editor tab or playback. Inspect editor controls on first handoff or after relevant UI changes, rather than repeatedly taking full screenshots each turn. Keep the server available for user review; stop only the task-owned server after review ends or when requested.

Say where to play/pause, seek the timeline and edit text, clip timing or audio. Changing shapes or motion inside rendered Animator clips returns to the preserved animation source, followed by a new render and guarded review-only import for the revised complete candidate. Standard edits stay in Editor. Show the versioned encoded MP4 alongside the editor at final review; the preview is not proof of final encoding or approval.
