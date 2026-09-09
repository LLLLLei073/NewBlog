/** A tap must stay on the same object and never turn into scrolling/dragging. */
export interface TapStart {
  id: string | null;
  pointer: number;
  x: number;
  y: number;
  scrollY: number;
  time: number;
  moved: boolean;
}
export function isRoomTap(
  start: TapStart | null,
  end: {
    id: string | null;
    pointer: number;
    x: number;
    y: number;
    scrollY: number;
    time: number;
  },
) {
  return (
    !!start &&
    !!start.id &&
    start.id === end.id &&
    start.pointer === end.pointer &&
    !start.moved &&
    Math.hypot(start.x - end.x, start.y - end.y) <= 9 &&
    Math.abs(start.scrollY - end.scrollY) <= 2 &&
    end.time - start.time < 700
  );
}
