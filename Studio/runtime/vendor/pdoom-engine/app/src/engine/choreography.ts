// Small deterministic authoring tools. Cue provenance remains with the project;
// these helpers neither infer music analysis nor certify perceptual alignment.
import type { Vec3Tuple } from './motion.ts';

export interface Cue { id: string; time: number; end?: number }
const finite = (v: number, label: string) => {
  if (!Number.isFinite(v)) throw new Error(`${label} must be finite`);
};
const unit = (v: number) => Math.max(0, Math.min(1, v));

/** Compile named local-time events/windows. Input order is immaterial; overlaps
 * are allowed. Unknown names and progress on an instantaneous event fail closed.
 * Inputs are copied; get() returns a fresh copy. Construct once in init(). */
export function cueSheet(input: readonly Cue[]) {
  const cues = new Map<string, Cue>();
  for (const cue of input) {
    if (typeof cue.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(cue.id)) throw new Error('Invalid cue id');
    if (cues.has(cue.id)) throw new Error(`Duplicate cue: ${cue.id}`);
    finite(cue.time, 'Cue time');
    if (cue.time < 0) throw new Error('Cue time must be nonnegative');
    if (cue.end !== undefined) {
      finite(cue.end, 'Cue end');
      if (cue.end <= cue.time) throw new Error('Cue end must follow time');
    }
    cues.set(cue.id, { id: cue.id, time: cue.time, ...(cue.end === undefined ? {} : { end: cue.end }) });
  }
  const get = (id: string): Cue => {
    const cue = cues.get(id);
    if (!cue) throw new Error(`Unknown cue: ${id}`);
    return { ...cue };
  };
  return {
    get,
    at(id: string) { return get(id).time; },
    progress(id: string, time: number) {
      finite(time, 'Sample time');
      const cue = get(id);
      if (cue.end === undefined) throw new Error(`Cue has no duration: ${id}`);
      return unit((time - cue.time) / (cue.end - cue.time));
    },
  };
}

/** Stagger a deterministic cohort over spread seconds (first to last onset).
 * duration belongs to each member; total window is spread + duration. A single
 * member starts at start. Apply an easing function to the result if desired. */
export function staggerProgress(time: number, start: number, duration: number, index: number, count: number, spread = 0): number {
  for (const [label, value] of [['time', time], ['start', start], ['duration', duration], ['spread', spread]] as const) finite(value, label);
  if (duration <= 0 || spread < 0) throw new Error('Duration must be positive and spread nonnegative');
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(index) || index < 0 || index >= count) throw new Error('Invalid cohort index/count');
  const offset = count === 1 ? 0 : spread * index / (count - 1);
  return unit((time - start - offset) / duration);
}

export interface PathSample { position: [number, number, number]; tangent: [number, number, number] }
/** Compile a cubic Bezier in caller-defined units. u is parametric progress, NOT
 * arc length or constant speed. Tangent is normalized, or zero where its analytic
 * derivative is zero. Pure sampling supports reverse/out-of-order render passes. */
export function cubicPath(input: readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple, Vec3Tuple]): (u: number) => PathSample {
  if (input.length !== 4) throw new Error('Cubic path needs four control points');
  const points = input.map(point => {
    if (point.length !== 3) throw new Error('Path points need three components');
    point.forEach(v => finite(v, 'Path component'));
    return [...point];
  });
  return progress => {
    finite(progress, 'Path progress');
    const u = unit(progress), v = 1 - u;
    const position: [number, number, number] = [0, 0, 0];
    const tangent: [number, number, number] = [0, 0, 0];
    for (let axis = 0; axis < 3; axis++) {
      const [a, b, c, d] = points.map(point => point[axis]!);
      position[axis] = v*v*v*a! + 3*v*v*u*b! + 3*v*u*u*c! + u*u*u*d!;
      tangent[axis] = 3*v*v*(b!-a!) + 6*v*u*(c!-b!) + 3*u*u*(d!-c!);
      finite(position[axis]!, 'Sampled path position'); finite(tangent[axis]!, 'Sampled path tangent');
    }
    const length = Math.hypot(...tangent);
    if (length > 0) for (let axis = 0; axis < 3; axis++) tangent[axis] = tangent[axis]! / length;
    return { position, tangent };
  };
}
