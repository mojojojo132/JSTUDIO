#!/usr/bin/env python3
"""Offline, repeatable JStudio narration assets from one validated scene manifest.

The generated directory is wholly owned by this tool. Native HTML is never edited.
Use --check before synthesis; import Kokoro only for a real build.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import sys
import tempfile
import wave
from pathlib import Path


ID = re.compile(r"^[a-z][a-z0-9-]*$")
SAMPLE_RATE = 24000


def validate(raw: object) -> dict:
    if not isinstance(raw, dict) or raw.get("version") != 1:
        raise ValueError("manifest.version must be 1")
    voice = raw.get("voice", "af_heart")
    speed = raw.get("speed", 1.02)
    if not isinstance(voice, str) or not voice.strip():
        raise ValueError("voice is required")
    if isinstance(speed, bool) or not isinstance(speed, (int, float)) or not 0.5 <= speed <= 2:
        raise ValueError("speed must be between 0.5 and 2")
    scenes = raw.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise ValueError("scenes must be a nonempty list")
    seen = set()
    for position, scene in enumerate(scenes, 1):
        if not isinstance(scene, dict):
            raise ValueError(f"scene {position} must be an object")
        scene_id = scene.get("id")
        if not isinstance(scene_id, str) or not ID.fullmatch(scene_id) or scene_id in seen:
            raise ValueError(f"scene {position} has a missing, invalid or duplicate id")
        seen.add(scene_id)
        project_ref = scene.get("project_ref")
        if project_ref is not None and (not isinstance(project_ref, str) or not ID.fullmatch(project_ref)):
            raise ValueError(f"{scene_id}: invalid project_ref")
        if not isinstance(scene.get("chapter"), str) or not scene["chapter"].strip():
            raise ValueError(f"{scene_id}: chapter is required")
        lines = scene.get("lines")
        if not isinstance(lines, list) or not lines:
            raise ValueError(f"{scene_id}: lines must be a nonempty list")
        for number, line in enumerate(lines, 1):
            if not isinstance(line, dict) or not isinstance(line.get("text"), str) or not line["text"].strip():
                raise ValueError(f"{scene_id} line {number}: text is required")
            pause = line.get("pause_after", 0.2)
            if isinstance(pause, bool) or not isinstance(pause, (int, float)) or not math.isfinite(pause) or not 0 <= pause <= 30:
                raise ValueError(f"{scene_id} line {number}: invalid pause_after")
        end_pause = scene.get("end_pause", 0.35)
        if isinstance(end_pause, bool) or not isinstance(end_pause, (int, float)) or not math.isfinite(end_pause) or not 0 <= end_pause <= 30:
            raise ValueError(f"{scene_id}: invalid end_pause")
    target = raw.get("target_seconds")
    sample = raw.get("sample")
    if target is not None:
        if not isinstance(target, dict) or any(isinstance(target.get(k), bool) or not isinstance(target.get(k), (int, float)) for k in ("min", "max")) or not math.isfinite(target["min"]) or not math.isfinite(target["max"]) or not 0 < target["min"] <= target["max"]:
            raise ValueError("target_seconds requires positive min and max")
        if not isinstance(sample, dict) or not isinstance(sample.get("text"), str) or not sample["text"].strip() or isinstance(sample.get("seconds"), bool) or not isinstance(sample.get("seconds"), (int, float)) or not math.isfinite(sample["seconds"]) or sample["seconds"] <= 0:
            raise ValueError("target_seconds requires sample.text and positive sample.seconds")
    result = dict(raw)
    result["voice"] = voice
    result["speed"] = float(speed)
    return result


def validate_project_refs(manifest: dict, project_root: Path) -> None:
    index = project_root / "index.html"
    if not index.is_file():
        raise ValueError("project index.html is missing")
    html = index.read_text()
    refs = set(re.findall(r'data-composition-id=["\']([^"\']+)', html))
    for scene in manifest["scenes"]:
        ref = scene.get("project_ref")
        if not ref:
            raise ValueError(f"{scene['id']}: project_ref is required with --project-root")
        if ref not in refs:
            raise ValueError(f"{scene['id']}: unknown project_ref {ref}")


def estimate_seconds(manifest: dict) -> float | None:
    sample = manifest.get("sample")
    if not sample:
        return None
    sample_words = len(sample["text"].split())
    if sample_words == 0:
        raise ValueError("sample.text has no words")
    total_words = sum(len(line["text"].split()) for scene in manifest["scenes"] for line in scene["lines"])
    pauses = sum(line.get("pause_after", 0.2) for scene in manifest["scenes"] for line in scene["lines"])
    pauses += sum(scene.get("end_pause", 0.35) + 0.25 for scene in manifest["scenes"])
    return total_words * sample["seconds"] / sample_words + pauses


def as_spoken(text: str) -> str:
    return text.replace("PDF", "P D F").replace("HTML", "H T M L")


class KokoroVoice:
    def __init__(self, model: Path, voices: Path, voice: str, speed: float):
        from kokoro_onnx import Kokoro

        self.model = Kokoro(str(model), str(voices))
        self.voice = voice
        self.speed = speed

    def synthesize(self, text: str) -> bytes:
        import numpy as np

        samples, rate = self.model.create(as_spoken(text), voice=self.voice, speed=self.speed, lang="en-us")
        if rate != SAMPLE_RATE:
            raise ValueError(f"Kokoro returned {rate} Hz; expected {SAMPLE_RATE} Hz")
        samples = np.asarray(samples, dtype=np.float32)
        if samples.ndim != 1 or not np.isfinite(samples).all():
            raise ValueError("Kokoro returned invalid audio")
        return (np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes()


def silence(seconds: float) -> bytes:
    return b"\0\0" * round(seconds * SAMPLE_RATE)


def write_wave(path: Path, pcm: bytes) -> None:
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm)


def srt_time(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    sec, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{sec:02},{millis:03}"


def produce(manifest: dict, target: Path, voice) -> dict:
    """Build in a sibling staging directory; old output survives generation errors."""
    if target.is_symlink():
        raise ValueError("output may not be a symlink")
    target = target.resolve()
    if target.exists():
        marker = target / "build.json"
        if not marker.is_file() or json.loads(marker.read_text()).get("generator") != "jstudio-director-narration-v1":
            raise ValueError("output exists but is not a tool-owned generated directory")
    target.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=f".{target.name}-stage-", dir=target.parent))
    backup = target.parent / f".{target.name}-previous"
    if backup.exists() and not target.exists():
        marker = backup / "build.json"
        if not marker.is_file() or json.loads(marker.read_text()).get("generator") != "jstudio-director-narration-v1":
            shutil.rmtree(stage)
            raise RuntimeError("previous output backup is not tool-owned; inspect it before retrying")
        os.replace(backup, target)
    if backup.exists():
        shutil.rmtree(stage)
        raise RuntimeError(f"stale backup exists: {backup}; inspect it before retrying")
    try:
        (stage / "voice").mkdir()
        cues, chapters, scene_meta, joined = [], [], [], []
        frame_cursor = 0
        for scene in manifest["scenes"]:
            scene_start = frame_cursor
            chapters.append({"id": scene["id"], "title": scene["chapter"], "start": scene_start / SAMPLE_RATE})
            parts = [silence(0.25)]
            frame_cursor += round(0.25 * SAMPLE_RATE)
            for number, line in enumerate(scene["lines"], 1):
                pcm = voice.synthesize(line["text"])
                if not pcm or len(pcm) % 2:
                    raise ValueError(f"{scene['id']} line {number}: empty or invalid PCM")
                start = frame_cursor / SAMPLE_RATE
                frame_cursor += len(pcm) // 2
                end = frame_cursor / SAMPLE_RATE
                cues.append({"id": f"{scene['id']}-cap-{number:03}", "sceneId": scene["id"], "text": line["text"].strip(), "start": start, "end": end})
                parts.append(pcm)
                pause = silence(line.get("pause_after", 0.2))
                parts.append(pause)
                frame_cursor += len(pause) // 2
            tail = silence(scene.get("end_pause", 0.35))
            parts.append(tail)
            frame_cursor += len(tail) // 2
            scene_pcm = b"".join(parts)
            write_wave(stage / "voice" / f"{scene['id']}.wav", scene_pcm)
            joined.append(scene_pcm)
            scene_meta.append({"id": scene["id"], "start": scene_start / SAMPLE_RATE, "duration": (frame_cursor - scene_start) / SAMPLE_RATE, "cueCount": len(scene["lines"])})
        write_wave(stage / "voice" / "narration.wav", b"".join(joined))
        duration = frame_cursor / SAMPLE_RATE
        (stage / "timings.json").write_text(json.dumps({"duration": duration, "scenes": scene_meta, "cues": cues}, indent=2) + "\n")
        (stage / "caption-cues.json").write_text(json.dumps(cues, indent=2) + "\n")
        (stage / "chapters.json").write_text(json.dumps(chapters, indent=2) + "\n")
        (stage / "transcript.txt").write_text("\n\n".join(scene["chapter"] + "\n" + " ".join(line["text"].strip() for line in scene["lines"]) for scene in manifest["scenes"]) + "\n")
        (stage / "captions.srt").write_text("\n\n".join(f"{n}\n{srt_time(cue['start'])} --> {srt_time(cue['end'])}\n{cue['text']}" for n, cue in enumerate(cues, 1)) + "\n")
        (stage / "build.json").write_text(json.dumps({"generator": "jstudio-director-narration-v1", "duration": duration, "sceneCount": len(scene_meta), "cueCount": len(cues), "voice": manifest["voice"], "speed": manifest["speed"]}, indent=2) + "\n")
        with wave.open(str(stage / "voice" / "narration.wav"), "rb") as wav:
            if wav.getnframes() != frame_cursor or wav.getframerate() != SAMPLE_RATE:
                raise ValueError("joined narration length mismatch")
        if target.exists():
            os.replace(target, backup)
        try:
            os.replace(stage, target)
        except BaseException:
            if backup.exists():
                os.replace(backup, target)
            raise
        if backup.exists():
            shutil.rmtree(backup)
        return {"duration": duration, "scenes": len(scene_meta), "cues": len(cues), "output": str(target)}
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True, help="tool-owned generated directory; existing contents are replaced after a complete build")
    parser.add_argument("--check", action="store_true", help="validate and estimate without loading voice or writing files")
    parser.add_argument("--project-root", type=Path, help="also verify each project_ref exists in native index.html")
    parser.add_argument("--model", type=Path, default=Path.home() / ".cache/hyperframes/tts/models/kokoro-v1.0.onnx")
    parser.add_argument("--voices", type=Path, default=Path.home() / ".cache/hyperframes/tts/voices/voices-v1.0.bin")
    args = parser.parse_args()
    manifest = validate(json.loads(args.manifest.read_text()))
    if args.project_root:
        validate_project_refs(manifest, args.project_root)
    estimate = estimate_seconds(manifest)
    target = manifest.get("target_seconds")
    print(json.dumps({"valid": True, "scenes": len(manifest["scenes"]), "estimatedSeconds": round(estimate, 2) if estimate is not None else None, "targetSeconds": target}))
    if target and not target["min"] <= estimate <= target["max"]:
        raise ValueError("estimated spoken runtime is outside target; revise the script before full synthesis")
    if args.check:
        return 0
    if not args.model.is_file() or not args.voices.is_file():
        raise FileNotFoundError("local Kokoro model/voices missing; run the package's documented voice setup")
    voice = KokoroVoice(args.model, args.voices, manifest["voice"], manifest["speed"])
    print(json.dumps(produce(manifest, args.output, voice)))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, RuntimeError) as error:
        print(f"narration build: {error}", file=sys.stderr)
        sys.exit(1)
