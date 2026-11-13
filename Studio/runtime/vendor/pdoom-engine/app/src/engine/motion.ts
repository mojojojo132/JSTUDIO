// Optional authoring tools, not a scene schema. Every sample depends only on time.
import { ease, lerp, TAU } from './util.ts';

export type Vec3Tuple = readonly [number, number, number];
export interface CameraPose {
  position: Vec3Tuple;
  target: Vec3Tuple;
  /** Vertical field of view in degrees, for a PerspectiveCamera. */
  fov: number;
}
export interface CameraKey extends CameraPose {
  time: number;
  /** Shapes the segment ending at this key; defaults to inOutCubic. */
  ease?: (progress: number) => number;
}
const finite = (value: number, name: string) => {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
};
const vector = (value: Vec3Tuple, name: string): Vec3Tuple => {
  if (value.length !== 3) throw new Error(`${name} must have three components`);
  value.forEach(v => finite(v, name));
  return [...value];
};

/** Compile a pose track once in init(). Linear spatial segments with eased timing;
 * add intermediate poses for an arc. Endpoints hold. No frame-history integration.
 * Returned tuples are fresh. Apply using camera.position.set(...pose.position),
 * camera.lookAt(...pose.target), camera.fov and updateProjectionMatrix().
 * Keep eye/target apart throughout the path; roll/up remains native Three.js code.
 */
export function cameraTrack(input: readonly CameraKey[]): (time: number) => CameraPose {
  if (!input.length) throw new Error('Camera track needs at least one key');
  const track = input.map((key, i) => {
    finite(key.time, 'Camera key time'); finite(key.fov, 'Camera fov');
    if (i && key.time <= input[i - 1]!.time) throw new Error('Camera key times must strictly increase');
    if (key.fov <= 0 || key.fov >= 180) throw new Error('Camera fov must be between 0 and 180 degrees');
    return {...key, position: vector(key.position, 'Camera position'), target: vector(key.target, 'Camera target')};
  });
  const copy = (key: CameraKey): CameraPose => ({position: [...key.position], target: [...key.target], fov: key.fov});
  return time => {
    finite(time, 'Sample time');
    if (time <= track[0]!.time) return copy(track[0]!);
    for (let i = 1; i < track.length; i++) {
      const b = track[i]!, a = track[i - 1]!;
      if (time > b.time) continue;
      if (time === b.time) return copy(b);
      const u = (b.ease ?? ease.inOutCubic)((time - a.time) / (b.time - a.time));
      finite(u, 'Eased camera progress');
      const mix = (x: Vec3Tuple, y: Vec3Tuple): Vec3Tuple => [lerp(x[0],y[0],u), lerp(x[1],y[1],u), lerp(x[2],y[2],u)];
      const fov = lerp(a.fov,b.fov,u);
      if (fov <= 0 || fov >= 180) throw new Error('Easing moved camera fov outside (0, 180)');
      return {position: mix(a.position,b.position), target: mix(a.target,b.target), fov};
    }
    return copy(track[track.length - 1]!);
  };
}

export interface MotionEvent { time: number; amplitude: number }
/** Additive secondary displacement after causal events. Starts at zero, rings at
 * frequency Hz, and decays by half every halfLife seconds. Assign the sampled
 * offset to a saved base transform; never += it onto the previous frame.
 * amplitude is in the caller's units (radians, scene units, etc.), not a peak guarantee.
 */
export function eventResponse(events: readonly MotionEvent[], frequency = 3, halfLife = 0.18): (time: number) => number {
  finite(frequency, 'Frequency'); finite(halfLife, 'Half-life');
  if (frequency <= 0 || halfLife <= 0) throw new Error('Frequency and half-life must be positive');
  const impulses = events.map(event => {
    finite(event.time, 'Event time'); finite(event.amplitude, 'Event amplitude');
    return {...event};
  });
  return time => {
    finite(time, 'Sample time');
    return impulses.reduce((sum, event) => {
      const age = time - event.time;
      return age <= 0 ? sum : sum + event.amplitude * Math.pow(0.5, age / halfLife) * Math.sin(TAU * frequency * age);
    }, 0);
  };
}
