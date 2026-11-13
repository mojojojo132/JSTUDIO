# Software walkthrough readiness

Use for videos that must demonstrate actual software actions. This is not a requirement for graphics-only videos or unrelated edits. Keep one `READINESS.md` beside the named project's brief; link evidence rather than duplicating logs. These are operating requirements, not proof that recorder/session/automation repairs have been implemented.

## 1. Establish the environment before promising the shots

Locate the current workspace and select one software package, native project, browser/profile and control method. Record OS/version, architecture, shell, package path/version plus lockfile or build fingerprint, project path, actual preview URL, viewport, browser session identity, recorder source and expected download directory. Use durable project storage; temporary scratch files are not the handoff. Verify launch/reopen commands resolve from the actual project location.

Reuse the verified environment when available. A switch between source and candidate packages, browser/profile, host or control method invalidates affected evidence; a matching version string alone does not prove equivalence. Keep the browser and preview service alive independently of short automation calls. Check their availability before handing controls to the user; do not assume disconnecting an automation client preserves its child browser.

Identify missing native controls and perceptual audio-review capability early. Ask for user help only for the missing action and reuse their answer. Name the exact tab/profile, expected file and save location in a recording handoff. Never infer permission to use a denied application or capture the entire display.

## 2. Rehearse the required task before plan confirmation

For a Studio edit/export walkthrough, use an isolated native sample and exercise: open → select scene/text → replace content → verify exact source and reopened text → preview → UI export → open the newly exported MP4. Other software walkthroughs rehearse only the actions their story requires. Read back root-versus-scene scope and export settings. A visible control, substring match, historical export or CLI fallback does not prove a fresh UI operation.

Use observed semantic selectors, the installed automation API and explicit readiness waits. Preserve viewport; account for preview scaling. Assert the selected composition/layer and complete text selection before typing. Verify exact expected text after saving and reopening. Freeze passing helpers and preserve the failed attempt's evidence instead of rewriting an undocumented script loop.

One targeted correction and retest is allowed per failed rehearsal step. If it still fails, stop dependent work and report the exact operation, evidence and missing capability. Do not restart the count with another browser, selector strategy or recorder. Continue independent work. Further repair needs an explicit repair scope; if the current user request already authorizes engineering repairs, diagnose and fix within that scope before a new acceptance run. Preserve the failed evidence and do not call repeated exploration production. An unknown outcome stays unresolved; locate the evidence before repeating the action.

Rehearsal is a disposable feasibility check, not production footage. Respect any user restriction on pre-approval recording, assembly or exports. If a required check cannot yet run, mark the plan conditional and state the specific gap; never silently call it feasible. Do not record acceptance clips before approval when the user requires all recording to wait.

After a workflow repair, repeat the small acceptance sequence from a fresh session once to establish reproducibility. Do not run this extra restart on every video. On later runs, reuse the identified setup and check the current required actions; do not repeatedly reinstall tools or rediscover working controls. Change or refresh only dependencies required by the task and applicable native instructions, recording the scope.

## 3. Separate the production gates

| Gate | Evidence required | What it enables |
|---|---|---|
| Functional rehearsal | Current required actions and outputs checked in the identified environment | Present the plan as operationally feasible |
| Creative approval | User confirmation of this output's written storyboard and motion direction (mockups optional), or explicit waiver | Final production within that scope; approval does not cure failed checks |
| Capture acceptance | [Fast capture path](capture-fast-path.md): saved test per surface, source/settings, exact path, nonzero bytes and inspected action frame | Final takes on that passing surface |
| Footage acceptance | Saved final takes inspected at start, required action and end | Full narration and assembly that depend on those takes |
| Voice acceptance, if narrated | Short sample actually listened to; reviewer and result recorded | Full narration generation |
| Delivery review | Native checks, encoded-file inspection and playback; final audio listening when applicable | Completion claim limited to performed checks |

Planning and other independent work can continue while a gate is unresolved. Do not produce full narration or assemble around missing required footage. A short voice test may run within the authorized brief while capture is pending. If listening cannot be performed, disclose it and retain the established project voice choice; do not manufacture an audio pass or require a routine additional attestation. A user-requested review cut can remain explicitly incomplete.

## 4. Require a saved-file receipt

A recorder banner, preview, Blob or download request is not a completed save. The updated bundled helper reports “Download requested”; older packages may say “Saved” immediately. Neither proves a saved file. Use the verifier described in [capture-fast-path.md](capture-fast-path.md), then inspect the saved footage.

For every test/take, record a unique take ID, intended and observed surface (`browser` for Studio/MP4 tabs), settings, exact saved path, byte count and inspected-frame evidence. Confirm browser download completion or locate and open the actual file. Preserve raw footage. If filenames repeat, map each actual file to its take without guessing.

When a user reports a save but no file is located, record `unresolved`, ask for the actual path, and inspect it. Do not blame the user, mark pass/fail, or consume the retest merely to search for an artifact. A failed saved clip gets the one targeted correction/retest in the fast path; changing the capture method does not reset that budget.

## Compact readiness record

Maintain these fields in the existing project record or `READINESS.md`:

- Environment identity, date and working reopen command.
- Required operation/surface; status `not checked`, `pass`, `fail` or `unresolved`; linked evidence.
- Initial attempt, failure, targeted correction and retest result; preserve counts across task resumes.
- Creative approval reference; capture take/file mapping; voice and final audio reviewer/results.
- Current blocking gap and next permitted action.

Only mark the relevant stage ready when its required checks pass. Never equate a documentation update, installed helper, UI screenshot or old demo with runtime verification.
