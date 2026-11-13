# Actual-device release acceptance

Use the same release ZIP and checklist on macOS and Windows. Included launchers and simulated path tests do not prove platform support. Windows x64, Apple Silicon Mac and Intel Mac require their own recorded result. Windows ARM is not currently a packaged native runtime target; do not claim it is verified.

## Automated checks

1. Extract the exact candidate into a local folder with spaces in its name. Record the archive checksum, operating system, CPU architecture and whether browser/voice caches already existed. Keep setup output.
2. Run Setup Mac.command or Setup Windows.cmd. On a genuinely clean machine, record first downloads separately; an extracted folder on an existing machine is not a pristine installation.
3. Run Check Mac.command or Check Windows.cmd. This writes timestamped logs, receipt.json, a narration WAV and native export MP4 into acceptance-results. Failure returns nonzero and keeps evidence. It creates a disposable named acceptance project without altering existing projects.
4. Open the WAV and MP4; listen and watch through completion. Record pass/fail and defects. Automated decoding alone is not perceptual acceptance.

## Manual checks on each computer

- Launch Studio. Edit text and an asset in the acceptance project, save, stop, relaunch and verify both edits persisted. Use the same native editor controls on both platforms.
- Use Director to rehearse a short authentic interface walkthrough. Capture a clip with visible interaction; confirm the actual saved file exists, has duration and plays. Verify required screen/audio permissions and recover from a denied permission without losing work.
- Export through the native UI; verify selected quality, completion, playable video and expected audio. Cancel a render and successfully rerun it.
- Move a copy of the native project folder, including assets, from Mac to Windows and back. Open with the destination Studio, verify text/assets/audio, save and export. Do not copy node_modules or .runtime across operating systems. External absolute asset references must be copied into the project and changed to relative references before transfer.
- Close everything and repeat from a fresh session. Record steps, observations and evidence paths in a manual receipt alongside the automated receipt. Mark unavailable tests pending, never passed.

For a custom project, pass its folder to Launch JStudio.command / Launch JStudio.cmd or run the bundled Node with scripts/launch.mjs and a quoted project path. Copy editable project folders; install the software separately on each operating system.

Completion requires actual-device evidence and product acceptance. Automated PASS is one gate, not launch approval.
