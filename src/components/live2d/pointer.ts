/** 指针位置到舞台局部坐标的换算；pixi-live2d-display 的 focus() 使用同一约定。 */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Focus {
  x: number;
  y: number;
}

/**
 * 舞台外扩 margin 的比例内仍然跟随，再远就钳制住，
 * 避免页面边缘的光标把头部转向不合理的方向。
 */
export function focusFromPointer(
  rect: Rect,
  clientX: number,
  clientY: number,
  mirror = false,
  margin = 0.15,
): Focus {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const clampedX = Math.min(
    rect.width * (1 + margin),
    Math.max(-rect.width * margin, x),
  );
  const clampedY = Math.min(
    rect.height * (1 + margin),
    Math.max(-rect.height * margin, y),
  );
  return { x: mirror ? rect.width - clampedX : clampedX, y: clampedY };
}

/** 指针离开页面或长时间不动时回到舞台中下方。 */
export function restFocus(rect: Rect): Focus {
  return { x: rect.width / 2, y: rect.height };
}

/** 是否已经离舞台足够远，可以停止跟随。 */
export function pointerIsFar(rect: Rect, clientX: number, clientY: number) {
  return (
    clientX < rect.left - rect.width ||
    clientX > rect.left + rect.width * 2 ||
    clientY < rect.top - rect.height ||
    clientY > rect.top + rect.height * 2
  );
}
