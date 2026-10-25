export type Vec3 = [number, number, number];
export interface Daylight {
  direction: Vec3;
  color: Vec3;
  ambient: Vec3;
  strength: number;
  lamp: number;
  label: string;
}

// Artistic local-time keyframes, not astronomical sunrise calculations.
const keys: Array<{ minute: number; light: Daylight }> = [
  {
    minute: 0,
    light: {
      direction: [-0.65, 0.35, 0.5],
      color: [0.33, 0.47, 0.76],
      ambient: [0.14, 0.2, 0.31],
      strength: 0.3,
      lamp: 0.95,
      label: '夜深 · 留一盏灯',
    },
  },
  {
    minute: 300,
    light: {
      direction: [-0.85, 0.1, 0.4],
      color: [0.64, 0.56, 0.63],
      ambient: [0.24, 0.28, 0.36],
      strength: 0.45,
      lamp: 0.6,
      label: '破晓 · 天色渐明',
    },
  },
  {
    minute: 420,
    light: {
      direction: [-0.85, 0.3, 0.55],
      color: [1, 0.81, 0.59],
      ambient: [0.46, 0.47, 0.46],
      strength: 0.75,
      lamp: 0.05,
      label: '清晨 · 光落在书页上',
    },
  },
  {
    minute: 720,
    light: {
      direction: [-0.25, 0.8, 0.65],
      color: [1, 0.98, 0.91],
      ambient: [0.57, 0.61, 0.64],
      strength: 0.65,
      lamp: 0,
      label: '午后 · 窗边有风',
    },
  },
  {
    minute: 1020,
    light: {
      direction: [0.5, 0.35, 0.55],
      color: [1, 0.68, 0.37],
      ambient: [0.46, 0.4, 0.36],
      strength: 0.9,
      lamp: 0.1,
      label: '傍晚 · 日光慢下来',
    },
  },
  {
    minute: 1140,
    light: {
      direction: [0.8, 0.1, 0.4],
      color: [1, 0.48, 0.31],
      ambient: [0.25, 0.27, 0.36],
      strength: 0.6,
      lamp: 0.65,
      label: '暮色 · 台灯亮起来',
    },
  },
  {
    minute: 1260,
    light: {
      direction: [-0.65, 0.35, 0.5],
      color: [0.33, 0.47, 0.76],
      ambient: [0.14, 0.2, 0.31],
      strength: 0.3,
      lamp: 0.95,
      label: '夜深 · 留一盏灯',
    },
  },
];

export function lightingAt(minutes: number): Daylight {
  const minute = ((minutes % 1440) + 1440) % 1440;
  const index = keys.findIndex(
    (key, i) => minute >= key.minute && minute < (keys[i + 1]?.minute ?? 1440),
  );
  const current = keys[index]!;
  const next = keys[index + 1] ?? { minute: 1440, light: keys[0]!.light };
  const linear = (minute - current.minute) / (next.minute - current.minute);
  const t = linear * linear * (3 - 2 * linear);
  const mix = (a: number, b: number) => a + (b - a) * t;
  const vector = (a: Vec3, b: Vec3): Vec3 =>
    a.map((n, i) => mix(n, b[i]!)) as Vec3;
  return {
    direction: vector(current.light.direction, next.light.direction),
    color: vector(current.light.color, next.light.color),
    ambient: vector(current.light.ambient, next.light.ambient),
    strength: mix(current.light.strength, next.light.strength),
    lamp: mix(current.light.lamp, next.light.lamp),
    label: current.light.label,
  };
}

export function localMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}
export function untilNextMinute(date: Date) {
  return 60_000 - date.getSeconds() * 1000 - date.getMilliseconds();
}

/** Matches CSS object-fit: cover, including the separate mobile focal point. */
export function imageCrop(
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const x = width / (imageWidth * scale);
  const y = height / (imageHeight * scale);
  return {
    scale: [x, y],
    offset: [(1 - x) * (width <= 700 ? 0.75 : 0.6), (1 - y) * 0.5],
  };
}
