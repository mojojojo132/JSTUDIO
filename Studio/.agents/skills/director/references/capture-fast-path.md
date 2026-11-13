# Fast capture path — macOS and Windows

Use this shared workflow for JStudio screen walkthroughs on macOS and Windows. Detect the actual browser and available capture surfaces; native pickers and OS permissions differ. Historical Apple Silicon / Edge results are local evidence, not a Windows pass. Read [recording.md](recording.md) only for a new capture surface, a failed acceptance clip, or a genuinely continuous multi-app requirement.

First require the applicable environment and rehearsal checks in [walkthrough-preflight.md](walkthrough-preflight.md). Preserve test counts and evidence in the project readiness record.

1. From the **confirmed storyboard**, list the real action and capture surface for each shot. Reuse the matched candidate, named project, local [window recorder](../tools/window-recorder.html), and identified supported browser setup. Do not rediscover recorder apps or reread general research for a known surface.
2. Choose the source once: **Studio or an MP4 in one browser tab → that exact Tab** (`displaySurface: "browser"`); **Finder/Explorer or Terminal/PowerShell → its dedicated Window** (`displaySurface: "window"`). Use a separate labeled take for each tab/window. Do not call the result one continuous recording. Start the helper through permitted native browser UI or ask the user for the specific picker action if activation is unavailable. Confirm available source choices on the current host; do not assume the Mac picker labels or keyboard shortcuts exist on Windows.
3. Before the final take, save **one 5–10 second clip per distinct source** with a visible target action. Record a unique take ID, browser/profile, intended and actual capture surface/settings, completed file path and byte count. The current helper reports “Download requested” and offers a retry link and metadata download. This is not proof of a saved file; older helpers may misleadingly say “Saved”. Verify the actual file. If it cannot be located, mark unresolved and obtain its path before another recording attempt. Open the saved WebM and inspect a frame proving the intended surface and action were captured. A UI screenshot, timer, or recorder preview is not proof. Once it passes, keep the same source/settings and record the planned take.
4. If the clip fails, make **one correction based on the saved-file failure** and retest. If it still fails, stop recorder exploration and dependent production for that shot; a new browser or capture method does not reset the budget. State the missing proof, propose a truthful storyboard change, and obtain confirmation if the change is material. Never stage an assistant invocation or use a denied control surface.
5. Inspect the saved final take at its start, required action, and end. Preserve raw footage and note the source in the receipt. Then assemble the approved cut. Run the native check and final encoded-file review once after the last edit; repeat only checks affected by a later change. Open the MP4, inspect representative frames and transitions, listen to the mixed audio when applicable, and report any review that could not be performed.

**Known limits:** The whole-Edge-window test captured the recorder tab instead of Studio; prefer the exact Studio tab. The verified setup footage uses separate Finder launch and Terminal success takes, with existing caches. The Director invocation was not filmable in the prior session and must stay labeled unfilmed until a permitted genuine capture is made. This path does not prove pristine setup, other platforms, or capture of new popups/windows.


## Prepare captured footage for Studio

Keep the saved WebM unchanged as the original evidence. Browser recordings can decode correctly while lacking a duration header; the pinned native renderer can reject them as `VIDEO_SOURCE_UNRENDERABLE`. Before using a recorder take in a composition, create a separate local MP4 derivative with the bundled helper:

```text
node <director>/tools/prepare-capture.mjs <studio-package-root> <saved-capture.webm> <new-output.mp4>
```

Use the supported bundled Node executable described below and an existing writable output directory. The helper resolves the installed Studio media tools, preserves all source audio streams when present, produces H.264 at 30 fps, validates duration and full decoding, verifies the original hash is unchanged, and writes `<new-output.mp4>.capture.json`. It refuses existing output/receipt names. A forced interruption may leave a `.prepare.lock`; confirm the earlier process stopped and choose a fresh output name rather than removing an active lock. Use the derivative in native HTML and keep the raw file plus receipt for provenance. Inspect action frames in both versions; conversion does not prove correct capture, legibility or audio quality. The bundled recorder itself records no audio.

## Bundled evidence helpers

Run tools with a supported Node executable: source `node`, portable macOS `./.runtime/node/bin/node`, or PowerShell `& .\.runtime\node\node.exe`. Substitute the actual Director skill directory; tools are not necessarily inside the Studio package.

```text
node <director>/tools/verify-capture.mjs <actual-saved.webm> <ffprobe-executable> <new-receipt.json>
```

The verifier checks the saved file, stable size, video metadata and SHA256. Resolve FFprobe through the installed Studio runtime, not a machine-specific path. Preserve the new receipt beside the footage. A technical pass still requires opening the saved video and inspecting the intended action; it does not certify correct source, readable text or audio quality. Metadata downloaded from the recorder describes its in-memory take and must be matched to the actual saved file.

For a permitted isolated Chromium-based browser session:

```text
node <director>/tools/browser-session.mjs <browser-executable> <new-empty-dedicated-profile> <new-session.json> <preview-url>
```

Keep the supervisor terminal/process alive while working. Read its session receipt for readiness, endpoint and last-seen status. Connect through the installed browser automation API using that endpoint, preserve viewport (`defaultViewport: null` for Puppeteer), and measure actual viewport before capture. The helper's window-size hint is not proof of viewport dimensions. Disconnect the automation client between operations; do not close the supervised browser until the session is finished. Use only where host tool rules permit browser control; otherwise retain the host-supported session tool. Never use the user's ordinary browser profile.
