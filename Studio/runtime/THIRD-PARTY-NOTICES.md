# Dependencies and provenance

This is an internal setup package with neutral editor chrome for the original HyperFrames tool. It is not a claim that Torq authored HyperFrames or that HeyGen endorses Torq.

- HyperFrames 0.8.77: official npm package, Apache-2.0, https://github.com/heygen-com/hyperframes. Retrieved at setup; version-guarded reviewed patches neutralize editor identity and native compatibility fixes.
- Node.js 24.15.0: official nodejs.org binaries, checked against the bundled SHA-256 values from its release manifest. Its binary archive includes its license.
- uv 0.12.19: official astral-sh/uv GitHub release, checksummed against release digests. Used to install Python into the local package runtime.
- GSAP 3.14.2: official npm package, its standard license applies (https://gsap.com/standard-license/). New projects may copy its distributed browser build with the original copyright header for native legacy composition compatibility.
- ffmpeg-static 5.3.0 and ffprobe-static 3.1.0: installed from npm; distributed binaries retain their upstream license terms. Not embedded in the clean ZIP.
- Kokoro-ONNX 0.4.7 / SoundFile 0.13.1: installed from PyPI into a new local environment. HyperFrames downloads the Kokoro model and voices through its standard implementation. Package/model licenses remain applicable.
- Inter: fonts are supplied by the selected external pack with its original licenses.
- Torq logos and brand guidance: supplied Brand 2.0 package. For authorized Torq work; no general public trademark license is granted here.

Software is downloaded at setup from its original distribution channels. No AI accounts, tokens or shared credentials are provided. Dependency versions are pinned where listed; Python transitives, the managed Python patch and upstream browser/model downloads follow their respective installers. See runtime-manifest.json and package-lock.json.

The matching upstream authoring skills are redistributed from official tag v0.8.77, commit dd88b5f5b78f25a82ad0677c00bbbfa85428454f. See licenses/hyperframes-skills-LICENSE and licenses/hyperframes-skills-PROVENANCE.json for license and source hashes. Torq product instructions keep this tested snapshot pinned.
