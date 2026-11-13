# Package JStudio

From `Studio`, create a reviewable inventory before distributing:

```sh
node runtime/scripts/package-studio.mjs --output /tmp/jstudio-release --dry-run
node runtime/scripts/package-studio.mjs --output /tmp/jstudio-release --zip
```

The output directory must be outside the workspace containing Studio and its content/brand siblings. ZIP creation requires the `zip` executable (included with macOS; install it on other packaging hosts). A preexisting `JStudio.zip` is never overwritten. Choose a new release directory for each release.

## What ships

The allowlist includes application guidance, launchers, installed skills, runtime scripts, licenses, pinned dependency locks and download manifest, vendored engine source, and built-in starter/project templates. The configured default brand's exact version and its assets ship with the package. Review that brand's distribution rights before sharing.

Only four standing profile documents ship: `DEFAULTS.md`, `WORKFLOW.md`, `CREATIVE-DIRECTION.md`, and `PLATFORM-EXPORTS.md`. Library templates must have uppercase Markdown filenames. Review these selected documents and templates for private information; filenames are not a content security scanner.

The generated `STUDIO.json` points to portable sibling folders:

```text
Studio/
Studio Content/default/profile/
Studio Content/default/library/templates/
Studio Content/default/library/media/   (empty)
Studio Content/default/projects/        (empty)
Studio Brand Packs/<selected-id>/<pinned-version>/
```

User projects, library media, unselected brands, dependency installations, host runtime state, caches, backups, environment files, credential-like filenames and private key files are excluded. Symlink entries are excluded; a selected source root reached through a symlink fails packaging. Pinned vendored engine payloads are selected and checksum-verified against their `SOURCE-SHA256.json` inventory, including engineering project configuration files required by that inventory. Untracked files in those payloads are excluded; missing or modified pinned files fail packaging. No source files are modified.

## Evidence and verification

Dry run writes `package-manifest.json` and `SHA256SUMS` without copying assets or creating an archive. The manifest lists exact paths, byte sizes, modes, and SHA-256 digests; it also lists excluded entries encountered inside selected trees. Entire folders outside the allowlist are never traversed and therefore are not individually listed as exclusions.

ZIP mode stages the same selected bytes, includes both inventory files, and produces `JStudio.zip` plus `JStudio.zip.sha256`. It regenerates the shipped runtime's `FILES.sha256` against the selected runtime files. Temporary staging is deleted after success or failure.

On macOS/Linux, extract into a new folder and verify from its root:

```sh
shasum -a 256 -c SHA256SUMS
```

Run the included setup launcher, doctor, and a complete sample video workflow on each supported target platform before declaring a release ready. Setup downloads dependencies; this is a portable source distribution, not an offline installer. Inventory tests and archive checksum checks do not prove fresh-machine setup, animation rendering, audio generation, encoded review, or delivery. Keep `releaseAcceptance` pending until those checks are recorded.
