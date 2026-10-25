/** Metres in the room. Furniture and animation share these coordinates. */
export type Ground = { x: number; z: number };
export const SEAT = { x: 1.12, z: -0.55 };
export const STANDING = { x: SEAT.x, z: SEAT.z - 0.32 };
export const SEAT_HEIGHT = 0.46;
export const FLOOR_HEIGHT = 0.022;
export const SPEED = 0.42;

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
export const smooth = (v: number) => {
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
  lookAhead: number;
  action: Part['kind'];
  progress: number;
  hands: number;

  feet: [FootPose, FootPose];
};
export type FootPose = Ground & {
  y: number;
  pitch: number;
  yaw: number;
  planted: boolean;
};
const FOOT_X = 0.077156;
const footAt = (at: Ground, yaw: number, sign: number): FootPose => ({
  x: at.x + Math.cos(yaw) * sign * FOOT_X,
  z: at.z - Math.sin(yaw) * sign * FOOT_X,
  y: 0,
  pitch: 0,
  yaw,
  planted: true,
});
type Part = {
  from: Ground;
  to: Ground;
  seconds: number;
  yaw: number;
  nextYaw: number;
  kind: 'read' | 'rise' | 'turn' | 'walk' | 'visit' | 'sit';
  path?: Ground[];
  length: number;
  steps: number;
  feet: [FootPose, FootPose];
};
/** Rounded corners are sampled once; distance, speed and footfalls share this table. */
function rounded(nodes: Ground[]) {
  const points: Ground[] = [nodes[0]!];
  for (let i = 1; i < nodes.length - 1; i++) {
    const a = nodes[i - 1]!,
      b = nodes[i]!,
      c = nodes[i + 1]!;
    const radius = Math.min(
      0.26,
      distance3d(a, b) * 0.4,
      distance3d(b, c) * 0.4,
    );
    const start = {
      x: b.x + ((a.x - b.x) * radius) / distance3d(a, b),
      z: b.z + ((a.z - b.z) * radius) / distance3d(a, b),
    };
    const end = {
      x: b.x + ((c.x - b.x) * radius) / distance3d(b, c),
      z: b.z + ((c.z - b.z) * radius) / distance3d(b, c),
    };
    points.push(start);
    for (let j = 1; j <= 16; j++) {
      const t = j / 16;
      points.push({
        x: (1 - t) ** 2 * start.x + 2 * t * (1 - t) * b.x + t * t * end.x,
        z: (1 - t) ** 2 * start.z + 2 * t * (1 - t) * b.z + t * t * end.z,
      });
    }
  }
  points.push(nodes.at(-1)!);
  return points;
}
function along(path: Ground[], distance: number): Ground {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      d = distance3d(a, b);
    if (distance <= d) {
      const t = Math.max(0, distance / d);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    distance -= d;
  }
  return { ...path.at(-1)! };
}
function pathPose(p: Part, distance: number) {
  const at = along(p.path!, distance);
  const a = along(p.path!, Math.max(0, distance - 0.08)),
    b = along(p.path!, Math.min(p.length, distance + 0.08));
  return { ...at, yaw: heading(a, b) };
}
/** Integral of a trapezoidal speed profile: root starts/stops at zero velocity. */
function travel(p: Part, time: number) {
  const ramp = 0.55,
    cruise = p.seconds - 2 * ramp;
  if (time < ramp) return (SPEED * time * time) / (2 * ramp);
  if (time < ramp + cruise) return SPEED * (time - ramp / 2);
  return p.length - (SPEED * (p.seconds - time) ** 2) / (2 * ramp);
}
function footsteps(
  p: Part,
  distance: number,
  progress: number,
): [FootPose, FootPose] {
  if (p.kind !== 'walk' && p.kind !== 'turn')
    return p.feet.map((f) => ({ ...f })) as [FootPose, FootPose];
  const n = p.steps,
    step = (p.kind === 'walk' ? distance / p.length : progress) * n;
  const target = (index: number, side: number) => {
    if (index < 0) return p.feet[side]!;
    // Both final footfalls end alongside one another, ready for the next action.
    const fraction = index >= n - 2 ? 1 : (index + 1.5) / n;
    const pos =
      p.kind === 'walk'
        ? pathPose(p, p.length * fraction)
        : { ...p.to, yaw: turn(p.yaw, p.nextYaw, fraction) };
    return footAt(pos, pos.yaw, side === 0 ? 1 : -1);
  };
  return [0, 1].map((side) => {
    const current = Math.min(n - 1, Math.floor(step));
    const index = current - ((current - side + 2) % 2);
    if (index < 0) return { ...p.feet[side]! };
    const from = target(index - 2, side),
      to = target(index, side);
    const u = Math.max(0, Math.min(1, (step - index) / 0.82));
    const t = smooth(u),
      moving = u < 1;
    return {
      x: from.x + (to.x - from.x) * t,
      z: from.z + (to.z - from.z) * t,
      y: moving
        ? Math.sin(Math.PI * u) ** 2 * (p.kind === 'turn' ? 0.035 : 0.065)
        : 0,
      pitch: moving ? Math.sin(2 * Math.PI * u) * 0.22 : 0,
      yaw: turn(from.yaw, to.yaw, u),
      planted: !moving || u === 0,
    };
  }) as [FootPose, FootPose];
}
export function roomCycle(visit: 'window' | 'shelf', dwell = 26) {
  const nodes = [
    STANDING,
    { x: 0.48, z: -0.55 },
    visit === 'window' ? { x: 0.06, z: -0.48 } : { x: 0.1, z: 0.12 },
    visit === 'window' ? { x: 0.06, z: -1.12 } : { x: -1.86, z: -0.78 },
  ];
  const parts: Part[] = [];
  let at = SEAT,
    yaw = Math.PI;
  let feet: [FootPose, FootPose] = [
    footAt(STANDING, Math.PI, 1),
    footAt(STANDING, Math.PI, -1),
  ];
  const hold = (kind: Part['kind'], seconds: number, nextYaw = yaw) => {
    const to = kind === 'rise' ? STANDING : kind === 'sit' ? SEAT : at;
    const angle = Math.abs(
      Math.atan2(Math.sin(nextYaw - yaw), Math.cos(nextYaw - yaw)),
    );
    const steps = Math.max(2, Math.ceil(angle / 0.65 / 2) * 2);
    const part: Part = {
      from: at,
      to,
      seconds: kind === 'turn' ? Math.max(1.2, steps * 0.48) : seconds,
      yaw,
      nextYaw,
      kind,
      length: 0,
      steps,
      feet,
    };
    parts.push(part);
    feet = footsteps(part, 0, 1);
    at = to;
    yaw = nextYaw;
  };
  const walk = (nodes: Ground[]) => {
    const path = rounded(nodes),
      to = nodes.at(-1)!;
    const angle = heading(path[0]!, path[1]!);
    hold('turn', 1.2, angle);
    const length = path
      .slice(1)
      .reduce((n, b, i) => n + distance3d(path[i]!, b), 0);
    const part: Part = {
      from: at,
      to,
      seconds: length / SPEED + 0.55,
      yaw,
      nextYaw: yaw,
      kind: 'walk',
      path,
      length,
      steps: Math.max(4, Math.ceil(length / 0.3 / 2) * 2),
      feet,
    };
    parts.push(part);
    feet = footsteps(part, length, 1);
    yaw = pathPose(part, length).yaw;
    at = to;
  };
  hold('read', dwell);
  hold('rise', 3.2);
  walk(nodes);
  hold('turn', 0.9, visit === 'window' ? Math.PI : -Math.PI / 2);
  hold('visit', visit === 'window' ? 12 : 9);
  walk([...nodes].reverse());
  hold('turn', 0.9, Math.PI);
  hold('sit', 3.4);
  return parts;
}
export const roomDuration = (parts: Part[]) =>
  parts.reduce((n, p) => n + p.seconds, 0);
export function roomPose(
  parts: Part[],
  elapsed: number,
  simulationTime = elapsed,
): RoomPose {
  let time =
    ((elapsed % roomDuration(parts)) + roomDuration(parts)) %
    roomDuration(parts);
  for (const p of parts) {
    if (time < p.seconds) {
      const t = time / p.seconds,
        walking = p.kind === 'walk';
      const rising = p.kind === 'rise',
        sitting = p.kind === 'sit';
      const seated =
        p.kind === 'read'
          ? 1
          : rising
            ? 1 - smooth((t - 0.2) / 0.65)
            : sitting
              ? smooth((t - 0.15) / 0.65)
              : 0;
      const positionT = rising
        ? smooth((t - 0.1) / 0.65)
        : sitting
          ? smooth((t - 0.15) / 0.65)
          : t;
      const d = walking ? travel(p, time) : 0;
      const root = walking
        ? pathPose(p, d)
        : {
            x: p.from.x + (p.to.x - p.from.x) * positionT,
            z: p.from.z + (p.to.z - p.from.z) * positionT,
            yaw: turn(p.yaw, p.nextYaw, t),
          };
      return {
        ...root,
        lookAhead: walking
          ? Math.atan2(
              Math.sin(pathPose(p, Math.min(p.length, d + 0.2)).yaw - root.yaw),
              Math.cos(pathPose(p, Math.min(p.length, d + 0.2)).yaw - root.yaw),
            ) * 0.18
          : p.kind === 'turn'
            ? Math.sin(Math.PI * t) *
              Math.atan2(
                Math.sin(p.nextYaw - p.yaw),
                Math.cos(p.nextYaw - p.yaw),
              ) *
              0.09
            : 0,
        seated,
        phase: walking
          ? ((d / p.length) * p.steps) / 2
          : p.kind === 'turn'
            ? (t * p.steps) / 2
            : 0,
        walk: walking
          ? Math.min(smooth(time / 0.55), smooth((p.seconds - time) / 0.55))
          : p.kind === 'turn'
            ? Math.sin(Math.PI * t) ** 2 * 0.45
            : 0,
        reach:
          p.kind === 'visit' && p.nextYaw !== Math.PI
            ? smooth(time / 2) * smooth((p.seconds - time) / 2)
            : 0,
        hands:
          p.kind === 'read'
            ? 1
            : rising
              ? 1 - smooth(t / 0.22)
              : sitting
                ? smooth((t - 0.78) / 0.22)
                : 0,
        action: p.kind,
        progress: t,
        feet: footsteps(p, d, t),
        time: simulationTime,
      };
    }
    time -= p.seconds;
  }
  throw new Error('Empty activity cycle');
}
