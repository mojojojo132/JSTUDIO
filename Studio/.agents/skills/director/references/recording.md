# Continuous real-screen walkthroughs

For macOS or Windows, start with the shorter [capture fast path](capture-fast-path.md). This reference covers prior experiments, alternate scopes and failure recovery; read only the section relevant to a new problem.

## Historical Edge-window method — not the Studio-tab default

On September 27, 2026, the local [window recorder](../tools/window-recorder.html) produced usable, saved WebM footage of a dedicated Edge window and, in a separate take, a dedicated Finder window. This is a **one-window-at-a-time** method, not proof of multi-app capture, installer execution, audio capture, or support on another host. Use it only after a saved acceptance clip proves this exact window and intended tab. For Studio tabs, prefer the later verified tab method in the short fast path. Keep separate takes labeled as separate sources; do not describe an edited sequence as one continuous capture.

1. Rehearse the exact actions and open only the dedicated demo window. Serve the helper locally, for example `python3 -m http.server 3020 --bind 127.0.0.1 --directory <skill-directory>/tools`, then open `http://127.0.0.1:3020/window-recorder.html` in Edge. The helper records video without audio and downloads it locally; it has no upload endpoint.
2. Click **Start window capture** through the native Edge app UI. A tab-automation click returned `Invalid state` in the local test because it did not supply the required user activation; do not retry that route. In the system picker choose **Window**, select the exact demo Edge window, and share it. Never select **Entire Screen** for this fast path.
3. If recording Studio, open or switch to Studio **as a tab in that same selected Edge window**. A different Edge window was not captured in the failed test. For Finder, start a separate recording and select its dedicated window.
4. Make one 5–10 second acceptance clip: show the intended tab/window and a visible action, switch tabs if the walkthrough will, then click **Stop and save** through native Edge UI. Confirm the track settings report `displaySurface: "window"`; open the downloaded WebM and inspect frames showing the actual target after the switch. A timer, preview, app screenshot or saved file alone is insufficient.
5. If that clip passes, keep the same window and settings for one full take. Stop, save, preserve the raw WebM, and inspect beginning, transition and end frames before editing. Retest only if scope or capture behavior changes.

**Stop conditions:** A separate app, popup, file picker or browser window may be absent from this source; prove any required transition before claiming it was recorded. If the host blocks control of a required app, recording cannot make that action filmable: report the gap or use a separately verified supported method. Do not retry a rejected full-display capture or stage command output as UI footage. The earlier local test captured Finder and Studio in separate takes but did not film setup or Director. A later September 27 take captured the actual `Setup Mac.command` Finder launch and its Terminal success state in separate window recordings. Director invocation remains unfilmed.

**Token-efficient loop:** read this recipe and the helper once; identify the exact target window; run one short saved-file test; then record. Do not inventory multiple recorders or repeat UI discovery after the test passes. UI element indices are ephemeral, so select controls by their visible labels and recheck only after a state change. The saved WebM is the source of truth.

## Follow-up: one-tab Studio capture and setup result — September 27, 2026

A fresh whole-Edge-window test stayed on the recorder tab even though native app control reported a switch to Studio. Its saved WebM exposed the mismatch. For a **single Studio tab**, the same helper succeeded with **Microsoft Edge Tab** selected in the system picker: the saved WebM showed a real text edit and Undo; separate tab takes showed High Quality export progress/completion and the newly opened MP4 playing to the end. Use the exact Studio tab, not a similarly titled duplicate. The picker preview helps identify it. The helper reports `displaySurface: "browser"` for this case. A new tab, such as the MP4 player, needs its own take. Do not use this method to claim one continuous capture across tabs.

For a Mac setup segment, select the dedicated Finder window and record the actual double-click; then start a separate **Window** recording of the Terminal window launched by `Setup Mac.command`. This run's Terminal take showed `Setup complete` and `[Process completed]` with existing caches. Label the two sources separately, inspect the saved files, and check the setup marker plus a runtime action. The Terminal capture started late, so this evidence shows success, not the full install progress. The method does not authorize broad display capture or access to an assistant window that the host denies.

**Minimal loop:** one short saved-file test of the exact source → inspect a frame with the intended action → keep that scope for the take. For Studio-only work, prefer the verified tab capture; for Finder or Terminal, use separate verified window captures. If the action is in a new tab/window, change scope and run one new short test. Keep failed tests out of the final film.

## Select once, then lock

Choose the capture scope before the take:

- Browser-only workflow: use the locally verified Edge fast path above when its one-window scope fits. **OBS Studio → macOS Screen Capture → Window Capture**, bound to the exact dedicated browser window, remains a researched alternative, not a locally validated OBS configuration yet.
- Finder/Terminal workflow: separate dedicated window captures are now verified for the setup launch and success state on this Mac. For a truly continuous multiple-app workflow, a clean dedicated display capture may be appropriate only after its actual source and permissions are verified. Avoid broad desktop capture merely because it is easiest to start.
- If a working recorder is already agreed and demonstrated for this scope, retain it. Do not switch technology during a take or repeatedly optimize infrastructure after acceptance. Changing scope or a demonstrated material failure can justify a new preflight, with the reason recorded.
- Use the verified tab capture only while the required action stays inside one tab; start a separate labeled take for a new tab. Do not use per-tab capture to claim a continuous workflow spanning tabs. Do not use an OBS browser-source re-render as a substitute for the actual browser experience.

OBS uses Apple's ScreenCaptureKit. Apple's single-window capture retains full window content when covered by other windows, but pauses when minimized and excludes separate child/pop-up windows. Tabs inside the selected browser window should remain in the source; prove this in the actual test. New windows, file pickers and browser menus must be included in testing if the walkthrough needs them. Do not promise that a window capture includes them.

Covered-window recording does not isolate mouse, keyboard, focus or automation from concurrent user activity. Prefer noninterfering controls where supported; otherwise arrange an uninterrupted take. On Windows, discover the supported capture backend and repeat the acceptance test; ScreenCaptureKit behavior is Mac-specific.

OBS automation may use its supported authenticated local WebSocket interface, after verifying availability and permitted scope. No custom OBS controller is bundled in this skill. Discover current tool/API documentation rather than inventing commands. Screen Studio is an optional human-operated alternative for automatic zoom/cursor polish; its AI automation was not verified. Recording software does not override host UI restrictions.

## Prepare before the final capture

1. Rehearse the complete task without recording. Finish installation, repairs, account setup and dependency downloads beforehand unless installation itself is the lesson. Verify permission/control availability for all required apps.
2. Prepare a dedicated browser window with only required tabs and safe demonstration data. Preserve unrelated user tabs by isolating the demo rather than deleting their work. Preload pages. Avoid credentials, private notifications, customer content and unrelated windows.
3. Set readable framing. A useful starting output is 1920×1080 at 30 fps, but match the content and inspect actual text. Avoid shrinking a tall Retina desktop into an unreadable 16:9 frame. Keep required browser chrome and click targets visible. Use cursor/click recording only if supported and verified.
4. For display capture, verify the **actual display** shows the demo; selecting an app handle, raising an AX window, or getting an app screenshot did not reliably establish foreground capture in this session. Never equate these with recorded output.
5. If the user's simultaneous screen activity can affect the source, arrange an uninterrupted take. Do not blame a user interaction for a failure without evidence; background automation/foreground mismatch caused a failed take even after the user agreed to leave the screen alone.

## Acceptance test — inspect the saved video

Use the exact intended method, source and output settings:

1. Start a short recording.
2. Perform a visible interaction in Studio, switch to the required second tab, then back.
3. For window capture, briefly cover the browser with another app to test source isolation; keep the browser unminimized. For display capture, test the actual required app transitions instead.
4. Include any necessary popup/new-window behavior.
5. Stop and open the saved file. Inspect frames before, during and after each transition, text readability and visible action/cursor behavior. Check audio if required.
6. Log method, target, settings, test path and what was actually observed. Only then mark the configuration accepted. An app screenshot or nonzero video duration is insufficient.

If it fails, resolve the observed cause before a full take. Once accepted, freeze the configuration. At the start of the final take, verify a recorder preview or captured frame—not solely the automation target. Repeat that output check after a major window transition when feasible without disrupting capture.

## Execute one continuous take (only for a verified multi-tab/window source)

Start one recording and keep it running across tabs and loading periods. Follow the rehearsed task. Pause briefly before important actions, then act deliberately. Avoid exploratory hovering, unnecessary scrolling and repeated tool discovery while recording. Native automation may not animate the cursor; never claim a visible click demonstration without inspecting the footage.

Correct small mistakes cleanly and continue; log timestamps for editing. Restart only for a material failure such as wrong-source capture, exposure of unrelated content, broken workflow or unusable output. With a verified window/display source, do not split merely at tab boundaries. With tab capture, a new tab requires a separate labeled take; never imply those takes form one continuous source. Keep rejected takes clearly marked and out of deliverables.

Record timestamps for major actions, export start/end and any cleanup sections. When finished, stop gracefully and verify the file finalized. Tell the user the screen is free again. Review saved footage before claiming completion. Preserve the continuous source unchanged; final edits may remove waits/minor mistakes while retaining truthful action order. Do not splice earlier takes together and call them one continuous source.

## Research provenance — September 27, 2026

- OBS capture scope/properties: https://obsproject.com/kb/macos-screen-capture-source
- Apple occlusion, minimized-window and popup behavior: https://developer.apple.com/videos/play/wwdc2022/10155/
- OBS supported remote control: https://obsproject.com/kb/remote-control-guide
- Mac built-in display/region recording: https://support.apple.com/102618
- Optional manual polish tool: https://screen.studio/

These sources support the recommendation; they do not establish a successful local OBS run. Browse current official documentation when implementation details or compatibility need verification.
