# Start with JStudio

1. Extract the entire package into a writable local folder. Keep `Studio`, `Studio Content`, and `Studio Brand Packs` together, including hidden skills.
2. Run `Setup Mac.command` or `Setup Windows.cmd` inside Studio. Internet access is required for pinned dependencies. Setup installs the core Editor and verifies the Animator payload. Animator requires a supported Chrome/Chromium executable and per-project setup.
3. Open the workspace in your AI host. Give it the subject, audience, sources and any real constraints. Director makes the routine creative decisions and brings you the complete candidate.
4. Open `Launch JStudio.command` or `Launch JStudio.cmd` for project discovery. `npm start -- my-video` opens a named project in Editor.

Local narration is optional: `npm run setup -- --voice` attempts its installation. A blocked speech library is reported without blocking the verified core studio. Recorded or separately generated narration can be used. Core setup does not certify an Animator render or creative quality.

Checks: `npm run doctor`, `npm run verify`. `npm run doctor -- --voice` explicitly tests optional local speech. Run the tools from Studio, or use its bundled Node under `runtime/.runtime/node` if Node is not on your PATH.

The package requires your AI host/account and its available tools. It does not bundle credentials or a hosted orchestration service. Fresh-machine Mac/Windows acceptance must be verified on each target; a local test is not cross-platform proof. Keep device security controls intact.

See PRODUCTION.md for handoffs and PACKAGING.md for a clean distributable.
