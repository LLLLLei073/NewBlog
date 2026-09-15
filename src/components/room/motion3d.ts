/** Metres in the room. Furniture and animation share these coordinates. */
export type Ground = { x: number; z: number };
export const SEAT = { x: 1.12, z: -0.55 };
export const STANDING = { x: SEAT.x, z: SEAT.z - 0.32 };
export const SEAT_HEIGHT = 0.46;
export const SPEED = 0.42;
export const STRIDE = 0.72;
export const COAL_ROAM = [
  { x: -1.7, z: 1.3 },
  { x: -0.7, z: 1.4 },
  { x: 0.4, z: 1.45 },
];
export const TARGETS = {
  computer: [1.65, 1.13, -1.35],
  textbook: [1.12, 0.86, -1.03],
  record: [-1.5, 0.87, -1.5],
  controller: [-1.05, 0.84, -1.45],
  drawer: [-1.3, 0.4, -1.48],
  bookshelf: [-2.25, 1.65, -1.1],
  portrait: [-0.65, 1.92, -1.86],
  calendar: [-0.65, 1.3, -1.86],
  door: [-2.87, 1.1, 0.4],
} satisfies Record<string, number[]>;
export const distance3d = (a: Ground, b: Ground) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
const heading = (a: Ground, b: Ground) => Math.atan2(b.x - a.x, b.z - a.z);
function turn(a: number, b: number, t: number) {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * smooth(t);
}
export type RoomPose = Ground & {
  yaw: number;
  seated: number;
  phase: number;
  walk: number;
  reach: number;
  time: number;
};
type Part = {
  from: Ground;
  to: Ground;
  seconds: number;
  yaw: number;
  nextYaw: number;
  kind: 'read' | 'rise' | 'turn' | 'walk' | 'visit' | 'sit';
  travelled: number;
};
export function roomCycle(visit: 'window' | 'shelf', dwell = 26) {
  const nodes = [
    STANDING,
    { x: 0.48, z: -0.55 },
    { x: 0.1, z: 0.12 },
    visit === 'window' ? { x: 0.06, z: -1.12 } : { x: -1.86, z: -0.55 },
  ];
  const parts: Part[] = [];
  let at = SEAT,
    yaw = Math.PI,
    travelled = 0;
  const hold = (kind: Part['kind'], seconds: number, nextYaw = yaw) => {
    const to = kind === 'rise' ? STANDING : kind === 'sit' ? SEAT : at;
    parts.push({ from: at, to, seconds, yaw, nextYaw, kind, travelled });
    at = to;
    yaw = nextYaw;
  };
  const walk = (to: Ground) => {
    const angle = heading(at, to);
    hold('turn', 0.9, angle);
    const length = distance3d(at, to);
    parts.push({
      from: at,
      to,
      seconds: length / SPEED,
      yaw,
      nextYaw: yaw,
      kind: 'walk',
      travelled,
    });
    travelled += length;
    at = to;
  };
  hold('read', dwell);
  hold('rise', 2.2);
  nodes.slice(1).forEach(walk);
  hold('turn', 0.9, visit === 'window' ? Math.PI : -Math.PI / 2);
  hold('visit', visit === 'window' ? 12 : 9);
  [...nodes.slice(0, -1)].reverse().forEach(walk);
  hold('turn', 0.9, Math.PI);
  hold('sit', 2.2);
  return parts;
}
export const roomDuration = (parts: Part[]) =>
  parts.reduce((n, p) => n + p.seconds, 0);
export function roomPose(parts: Part[], elapsed: number): RoomPose {
  let time =
    ((elapsed % roomDuration(parts)) + roomDuration(parts)) %
    roomDuration(parts);
  for (const p of parts) {
    if (time < p.seconds) {
      const t = time / p.seconds,
        walking = p.kind === 'walk';
      const positionT = p.kind === 'rise' || p.kind === 'sit' ? smooth(t) : t;
      return {
        x: p.from.x + (p.to.x - p.from.x) * positionT,
        z: p.from.z + (p.to.z - p.from.z) * positionT,
        yaw: turn(p.yaw, p.nextYaw, t),
        seated:
          p.kind === 'read'
            ? 1
            : p.kind === 'rise'
              ? 1 - smooth(t)
              : p.kind === 'sit'
                ? smooth(t)
                : 0,
        phase: (p.travelled + (walking ? time * SPEED : 0)) / STRIDE,
        walk: walking
          ? Math.min(smooth(time / 0.25), smooth((p.seconds - time) / 0.25))
          : 0,
        reach:
          p.kind === 'visit'
            ? Math.sin(Math.PI * smooth(Math.min(time, p.seconds - time) / 2)) *
              0.5
            : 0,
        time: elapsed,
      };
    }
    time -= p.seconds;
  }
  throw new Error('Empty activity cycle');
}
/** A planted foot moves backwards at precisely the root velocity. Swing returns it forward. */
export function footStep(phase: number) {
  const p = ((phase % 1) + 1) % 1,
    travel = STRIDE * 0.6;
  return p < 0.6
    ? { z: travel * (0.5 - p / 0.6), y: 0, planted: true }
    : {
        z: travel * (-0.5 + smooth((p - 0.6) / 0.4)),
        y: 0.09 * Math.sin((Math.PI * (p - 0.6)) / 0.4),
        planted: false,
      };
}
