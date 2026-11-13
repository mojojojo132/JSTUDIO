/** Optional warm-up may never require scenes outside the selected render range.
 * Actual output frames retain strict missing-scene errors, including overlaps.
 * Skipping warm-up preserves Engine's per-scene reset/preroll on first entry. */
export function streamWarmupTime(
  timeline: readonly { id: string; start: number; end: number }[],
  loaded: ReadonlySet<string>, first: number, end: number, fps: number,
  lastStreamed: number, shutter = 0,
): number | null {
  if (!Number.isFinite(fps) || fps <= 0) throw new Error('fps must be positive');
  if (first <= 0 || end <= first || lastStreamed === first - 1) return null;
  const t = (first - 1) / fps;
  const radius = Math.max(0, shutter) / fps / 2;
  const needed = timeline.filter(e => t + radius >= e.start && t - radius < e.end);
  return needed.every(e => loaded.has(e.id)) ? t : null;
}
