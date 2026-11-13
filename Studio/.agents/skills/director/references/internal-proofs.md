# Internal animation-to-recording proofs

Within the authorized brief, a short experimental assembly can test a difficult animation-to-recording transition. It is an internal technical proof, never an approved shot, production import or final cut. Animator still creates animation; Editor assembles the proof. The proof command does not modify REVIEW.json or EXCHANGE.json and creates no approval.

Create a new self-contained `reviews/proof/<version>/` directory in the same project (version: letters, numbers, hyphen or underscore). Place native Editor `index.html`, all local footage/audio/animation, local scripts and the exact project brand copy in `assets/brand/`. Do not reference production folders, remote scripts or media. Preserve source recordings and original animation separately in the project. This isolated copy is disposable experimentation, not a replacement production handoff.

Write `PROOF.json`:

```json
{"schemaVersion":1,"entry":"index.html","output":"proof.mp4","width":1080,"height":1920,"fps":30,"duration":6}
```

Invoke the installed workflow proof command with that project and relative proof directory. Output must not exist; revise into a new version. Maximum proof duration is 120 seconds. Use the normal approved browser execution route on restricted macOS hosts; do not bypass native Studio wrappers.

The route verifies pinned brand assets, rejects symlinks and static external/missing HTML/CSS references, inventories every local file, checks that inputs remain unchanged during rendering, probes the encoded canvas/frame rate/duration and fully decodes the media. It writes immutable technical evidence under `evidence/proofs/` and a command run report with explicit token availability. Dynamically constructed JavaScript/network references cannot be completely established by static checks: keep proofs fully local and record any remaining limitation. Technical success does not attest visual quality, audio listening or human approval.

After the proof, register the Animator renders and use guarded review-only imports plus EXCHANGE preflight for complete-candidate assembly. The exact complete candidate requires creative approval before delivery. Never copy the proof receipt into an approval field.
