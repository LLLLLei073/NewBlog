export type Point = { x: number; y: number };
export const HOTSPOTS = [
  { id: 'computer', x: 0.888, y: 0.446 },
  { id: 'textbook', x: 0.828, y: 0.504 },
  { id: 'record', x: 0.24, y: 0.424 },
  { id: 'controller', x: 0.287, y: 0.443 },
  { id: 'drawer', x: 0.282, y: 0.525 },
  { id: 'bookshelf', x: 0.147, y: 0.29 },
  { id: 'portrait', x: 0.266, y: 0.21 },
  { id: 'calendar', x: 0.254, y: 0.316 },
  { id: 'door', x: 0.035, y: 0.46 },
] as const;
export const CHAIR = { x: 0.705, y: 0.744 };
export const AISLE = { x: 0.565, y: 0.79 };
export const WINDOW = { x: 0.558, y: 0.66 };
export const SHELF = { x: 0.213, y: 0.716 };
export const COAL_POINTS: Point[] = [
  { x: 0.15, y: 0.91 },
  { x: 0.31, y: 0.91 },
  { x: 0.46, y: 0.93 },
  { x: 0.6, y: 0.94 },
];
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export type GirlPose = 'read' | 'rise' | 'walk' | 'window' | 'shelf' | 'stand';
export type GirlFrame = Point & {
  pose: GirlPose;
  frame: number;
  flip: boolean;
  phase: number;
};
type Step = { to: Point; pose: GirlPose; seconds: number; flip?: boolean };
/** Routes pass through open floor, never through the desk or left cabinet. */
export function activityCycle(
  visit: 'window' | 'shelf',
  dwell: number,
): Step[] {
  const target = visit === 'window' ? WINDOW : SHELF;
  const middle = visit === 'window' ? AISLE : { x: 0.39, y: 0.79 };
  return [
    { to: CHAIR, pose: 'read', seconds: dwell },
    { to: CHAIR, pose: 'rise', seconds: 1.2 },
    { to: AISLE, pose: 'walk', seconds: 4 },
    { to: middle, pose: 'walk', seconds: visit === 'window' ? 0.1 : 4 },
    { to: target, pose: 'walk', seconds: 4 },
    {
      to: target,
      pose: visit,
      seconds: visit === 'window' ? 12 : 8,
      flip: visit === 'shelf',
    },
    { to: middle, pose: 'walk', seconds: 4 },
    { to: AISLE, pose: 'walk', seconds: visit === 'window' ? 0.1 : 4 },
    { to: CHAIR, pose: 'walk', seconds: 4 },
    { to: CHAIR, pose: 'rise', seconds: 1.2 },
  ];
}
export function cycleDuration(steps: Step[]) {
  return steps.reduce((n, s) => n + s.seconds, 0);
}
export function girlAt(steps: Step[], elapsed: number): GirlFrame {
  let time = Math.max(0, elapsed) % cycleDuration(steps),
    from = CHAIR;
  for (const step of steps) {
    if (time < step.seconds) {
      const t = time / step.seconds;
      const point = lerpPoint(from, step.to, t);
      const frames = {
        read: 9,
        rise: 10,
        window: 7,
        shelf: 8,
        stand: 6,
        walk: Math.floor(time * 8) % 6,
      };
      return {
        ...point,
        pose: step.pose,
        frame: frames[step.pose],
        flip: step.flip ?? (step.pose === 'walk' && step.to.x < from.x),
        phase: t,
      };
    }
    time -= step.seconds;
    from = step.to;
  }
  return { ...CHAIR, pose: 'read', frame: 9, flip: false, phase: 0 };
}
// Art was generated as an atlas; explicit rectangles preserve each full stride.
export const SPRITES = [
  [35, 0, 270, 495],
  [315, 0, 230, 495],
  [550, 0, 180, 495],
  [790, 0, 285, 495],
  [1075, 0, 235, 495],
  [1330, 0, 200, 495],
  [70, 500, 160, 490],
  [315, 500, 165, 490],
  [550, 500, 225, 490],
  [775, 500, 260, 490],
  [1075, 500, 190, 490],
  [1330, 500, 175, 490],
] as const;
export const SPRITE_ANCHORS = [
  171, 410, 653, 924, 1170, 1414, 151, 403, 642, 887, 1168, 1420,
];
