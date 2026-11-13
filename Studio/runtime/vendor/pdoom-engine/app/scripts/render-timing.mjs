/** Convert a requested half-open time interval to the exact constant-rate frame interval. */
export function quantizeFrameRange(from, to, fps) {
  if (![from, to, fps].every(Number.isFinite) || from < 0 || to <= from || fps <= 0) {
    throw new Error('invalid render interval/fps');
  }
  const firstFrame = Math.round(from * fps);
  const endFrame = Math.round(to * fps);
  const totalFrames = endFrame - firstFrame;
  if (![firstFrame, endFrame, totalFrames].every(Number.isSafeInteger) || firstFrame < 0 || totalFrames <= 0) {
    throw new Error('render interval contains no whole output frames');
  }
  return {
    firstFrame,
    endFrame,
    totalFrames,
    fromSeconds: firstFrame / fps,
    toSeconds: endFrame / fps,
    durationSeconds: totalFrames / fps,
  };
}

const seconds = value => Number(value.toFixed(12)).toString();

/** Trim source time, reset its clock, pad short audio, and cap it at the video frame duration. */
export function audioTimingFilter(range) {
  if (!range || ![range.fromSeconds, range.durationSeconds].every(Number.isFinite) || range.fromSeconds < 0 || range.durationSeconds <= 0) {
    throw new Error('invalid quantized audio interval');
  }
  const start = seconds(range.fromSeconds), duration = seconds(range.durationSeconds);
  return `atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS,apad=whole_dur=${duration},atrim=duration=${duration}`;
}
