# Recorded footage and audio integrity

Add `media` to the project's EXCHANGE.json alongside `shots`. This additive schema-1 field binds every remaining native `<video>` and `<audio>` tag to immutable media bytes and exact timeline placement. Empty `media: []` explicitly requires there are no unbound audiovisual tags. Older contracts remain readable but return `untrackedMedia` and a partial-integrity warning when audiovisual elements are unbound.

```json
{"kind":"audio","html":"index.html","elementId":"music","path":"assets/music.wav","sha256":"64 lowercase hexadecimal characters","startFrame":0,"durationFrames":1080,"sourceInSeconds":0,"playbackRate":1}
```

`path` is relative to the native composition root; `html` identifies the containing linked document. Start and duration use master frames; source-in uses seconds for both audio and footage. Bindings check static src, start, duration, source-in, playback rate, master bounds, actual stream duration and decoded frame availability. Invalid/empty media or decode diagnostics fail. Linked composition offsets apply. Repeated instances and dynamic bindings remain unsupported by automated static certification.

Keep animation in `shots`: assets/animations references and hashes already registered/imported as animation cannot be relabeled as footage to skip approval. Truly external footage must have source/rights provenance in the project record; this integrity check cannot infer the provenance of arbitrary bytes.

Preflight returns `mediaFiles` containing native-relative `file`, `sha256`, `kind`, `elementId` and measured metadata. The guarded finishing route compares before/after results to detect input replacement during rendering. Rerun preflight after edits. These checks establish byte/timing consistency, not sound quality, interaction truth, legal permission or human approval. Review the exact encoded result separately.
