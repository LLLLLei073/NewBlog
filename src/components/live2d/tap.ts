/** 与房间一致的点击判定：同一次按下抬起、位移小、页面没滚动、时间短。 */
export interface TapStart {
  pointer: number;
  x: number;
  y: number;
  scrollY: number;
  time: number;
  moved: boolean;
}

export function isLive2dTap(
  start: TapStart | null,
  end: Omit<TapStart, 'moved'>,
) {
  return (
    !!start &&
    start.pointer === end.pointer &&
    !start.moved &&
    Math.hypot(start.x - end.x, start.y - end.y) <= 9 &&
    Math.abs(start.scrollY - end.scrollY) <= 2 &&
    end.time - start.time < 700
  );
}
