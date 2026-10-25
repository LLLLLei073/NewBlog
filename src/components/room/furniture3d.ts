import * as T from 'three';
import { SEAT, SEAT_HEIGHT } from './motion3d';

export function furnish(scene: T.Scene) {
  const mat = (color: number) =>
    new T.MeshStandardMaterial({ color, roughness: 0.87 });
  const wood = mat(0xa87e52),
    edge = mat(0x634d36),
    paper = mat(0xeee8d5),
    green = mat(0x748677),
    dark = mat(0x283c38),
    gold = mat(0xb59d67);
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material,
  ) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const ball = (
    x: number,
    y: number,
    z: number,
    r: number,
    m: T.Material,
    s = [1, 1, 1],
  ) => {
    const o = new T.Mesh(new T.SphereGeometry(r, 16, 12), m);
    o.position.set(x, y, z);
    o.scale.set(...(s as [number, number, number]));
    o.castShadow = true;
    scene.add(o);
    return o;
  };
  const rod = (a: number[], b: number[], r: number, m: T.Material) => {
    const start = new T.Vector3(...(a as [number, number, number])),
      end = new T.Vector3(...(b as [number, number, number]));
    const o = new T.Mesh(
      new T.CylinderGeometry(r, r, start.distanceTo(end), 12),
      m,
    );
    o.position.copy(start).add(end).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
    o.castShadow = true;
    scene.add(o);
  };
  // Open-front room; a real opening in the back wall admits window light.
  box(0, -0.13, 0, 6, 0.26, 4.2, edge);
  for (let row = 0; row < 14; row++)
    for (let col = 0; col < 4; col++) {
      const color = new T.Color(0xc09b71).multiplyScalar(
        0.94 + ((row * 13 + col * 7) % 9) / 90,
      );
      box(
        -2.25 + col * 1.5,
        0.007,
        -1.94 + row * 0.295,
        1.485,
        0.028,
        0.28,
        mat(color.getHex()),
      );
    }
  box(-2.99, 1.4, 0, 0.12, 2.8, 4.1, green);
  box(-1.65, 1.4, -2, 2.7, 2.8, 0.12, green);
  box(2.65, 1.4, -2, 0.7, 2.8, 0.12, green);
  box(1, 0.45, -2, 2.6, 0.9, 0.12, green);
  box(1, 2.6, -2, 2.6, 0.4, 0.12, green);
  box(0, 0.08, -1.88, 5.85, 0.14, 0.08, paper);
  box(-2.88, 0.08, 0, 0.08, 0.14, 3.9, paper);
  const sky = new T.MeshBasicMaterial({ color: 0xb7cfca });
  box(1, 1.65, -2.06, 2.65, 1.55, 0.02, sky);
  for (const x of [-0.3, 1, 2.3]) box(x, 1.64, -1.92, 0.07, 1.57, 0.16, paper);
  for (const y of [0.89, 1.67, 2.4]) box(1, y, -1.92, 2.72, 0.07, 0.16, paper);
  box(1, 0.87, -1.82, 2.9, 0.075, 0.4, wood);
  // Folded curtains, not translucent planes across the walking space.
  const linen = mat(0xc9c9b0);
  for (const side of [-0.42, 2.46])
    for (let i = 0; i < 4; i++) {
      const c = box(
        side + (i - 1.5) * 0.08,
        1.68,
        -1.79,
        0.1,
        1.7,
        0.11,
        linen,
      );
      c.rotation.y = (i % 2 ? 1 : -1) * 0.35;
    }
  rod([-0.62, 2.57, -1.79], [2.72, 2.57, -1.79], 0.024, gold);
  // Desk underside is .76 m; seated knees stay below it.
  box(1.12, 0.795, -1.3, 1.94, 0.09, 0.78, wood);
  for (const x of [0.23, 2.01])
    for (const z of [-1.6, -1]) box(x, 0.375, z, 0.07, 0.75, 0.07, edge);
  box(1.88, 0.56, -1.3, 0.28, 0.37, 0.65, wood);
  for (const y of [0.47, 0.6]) {
    box(1.88, y, -0.963, 0.25, 0.012, 0.016, edge);
    box(1.88, y + 0.05, -0.94, 0.08, 0.016, 0.03, gold);
  }
  const seat = box(SEAT.x, SEAT_HEIGHT - 0.035, SEAT.z, 0.46, 0.07, 0.43, edge);
  box(SEAT.x, SEAT_HEIGHT + 0.009, SEAT.z, 0.43, 0.018, 0.4, mat(0xa3a58e));
  for (const x of [-0.185, 0.185])
    for (const z of [-0.16, 0.16])
      box(SEAT.x + x, 0.21, SEAT.z + z, 0.045, 0.42, 0.045, edge);
  for (const x of [-0.19, 0.19])
    box(SEAT.x + x, 0.7, SEAT.z + 0.19, 0.04, 0.52, 0.04, edge);
  box(SEAT.x, 0.86, SEAT.z + 0.2, 0.42, 0.15, 0.045, wood);
  // Monitor, keyboard and open book.
  box(1.65, 1.13, -1.48, 0.52, 0.34, 0.055, dark);
  box(1.65, 1.13, -1.445, 0.47, 0.285, 0.006, mat(0x8da9a0));
  box(1.65, 0.91, -1.48, 0.035, 0.2, 0.04, dark);
  box(1.65, 0.85, -1.45, 0.22, 0.018, 0.15, dark);
  box(1.58, 0.86, -1.13, 0.38, 0.02, 0.13, paper);
  for (let i = 0; i < 7; i++)
    box(1.43 + i * 0.05, 0.874, -1.13, 0.025, 0.003, 0.075, green);
  for (const x of [1.04, 1.2]) {
    const page = box(x, 0.863, -1.03, 0.16, 0.025, 0.24, paper);
    page.rotation.z = x < 1.12 ? -0.1 : 0.1;
  }
  box(1.12, 0.85, -1.03, 0.35, 0.013, 0.26, dark);
  // Local lamp illuminates the desk and the reader, independent of article theme.
  ball(0.39, 0.86, -1.42, 0.1, dark, [1, 0.16, 1]);
  rod([0.39, 0.87, -1.42], [0.4, 1.26, -1.42], 0.015, gold);
  rod([0.4, 1.26, -1.42], [0.68, 1.31, -1.37], 0.015, gold);
  const shade = new T.Mesh(new T.ConeGeometry(0.14, 0.16, 24, 1, true), dark);
  shade.position.set(0.68, 1.27, -1.37);
  scene.add(shade);
  const bulb = ball(
    0.68,
    1.22,
    -1.37,
    0.045,
    new T.MeshStandardMaterial({
      color: 0xffe3ad,
      emissive: 0xffc579,
      emissiveIntensity: 1,
    }),
  );
  const lamp = new T.PointLight(0xffd79c, 0, 3, 2);
  lamp.position.set(0.68, 1.18, -1.34);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  lamp.shadow.bias = -0.002;
  scene.add(lamp);
  // Left library and low record cabinet.
  box(-2.37, 1.13, -1.35, 0.86, 2.26, 0.53, edge);
  box(-2.37, 1.13, -1.065, 0.74, 2.12, 0.015, dark);
  for (const y of [0.12, 0.64, 1.16, 1.68, 2.2])
    box(-2.37, y, -1.28, 0.88, 0.035, 0.65, wood);
  const covers = [0x738273, 0x9d6256, 0xc5b78b, 0x657987, 0x3c514b];
  for (let shelf = 0; shelf < 4; shelf++)
    for (let i = 0; i < 7; i++) {
      const h = 0.28 + ((i * 7) % 5) * 0.031,
        x = -2.69 + i * 0.1,
        y = 0.14 + shelf * 0.52;
      box(x, y + h / 2, -1.2, 0.075, h, 0.29, mat(covers[(i + shelf) % 5]!));
      box(x, y + h * 0.75, -1.049, 0.052, 0.014, 0.003, paper);
    }
  box(-1.28, 0.38, -1.48, 1.05, 0.76, 0.62, wood);
  for (const y of [0.19, 0.54]) {
    box(-1.28, y, -1.158, 0.95, 0.31, 0.03, edge);
    box(-1.28, y, -1.13, 0.16, 0.019, 0.04, gold);
  }
  box(-1.5, 0.81, -1.47, 0.48, 0.08, 0.4, dark);
  const record = new T.Mesh(
    new T.CylinderGeometry(0.17, 0.17, 0.012, 40),
    mat(0x182321),
  );
  record.position.set(-1.5, 0.86, -1.47);
  scene.add(record);
  ball(-1.5, 0.87, -1.47, 0.042, gold, [1, 0.1, 1]);
  rod([-1.29, 0.87, -1.62], [-1.36, 0.89, -1.4], 0.009, gold);
  ball(-0.99, 0.835, -1.47, 0.12, dark, [1, 0.35, 0.6]);
  ball(-1.05, 0.88, -1.45, 0.025, paper);
  ball(-0.93, 0.88, -1.45, 0.018, gold);
  // Portrait and tear-off calendar.
  box(-0.66, 1.97, -1.895, 0.37, 0.43, 0.05, edge);
  box(-0.66, 1.97, -1.86, 0.3, 0.36, 0.012, paper);
  ball(-0.66, 2.03, -1.84, 0.068, wood, [1, 1, 0.1]);
  ball(-0.66, 1.91, -1.84, 0.1, green, [1, 0.8, 0.1]);
  box(-0.66, 1.35, -1.88, 0.35, 0.36, 0.025, paper);
  box(-0.66, 1.5, -1.86, 0.35, 0.06, 0.015, dark);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++)
      box(-0.77 + c * 0.055, 1.38 - r * 0.06, -1.86, 0.02, 0.014, 0.006, green);
  // Door in the side wall.
  box(-2.91, 1.05, 0.4, 0.04, 2.1, 0.91, edge);
  box(-2.875, 1.05, 0.4, 0.035, 1.95, 0.78, wood);
  ball(-2.83, 1, 0.69, 0.032, gold);
  const plant = (x: number, z: number, size: number) => {
    const pot = new T.Mesh(
      new T.CylinderGeometry(0.17 * size, 0.12 * size, 0.3 * size, 20),
      mat(0xb98868),
    );
    pot.position.set(x, 0.15 * size, z);
    pot.castShadow = true;
    scene.add(pot);
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4,
        y = 0.3 * size + i * 0.075 * size;
      const ex = x + Math.cos(angle) * 0.24 * size,
        ez = z + Math.sin(angle) * 0.24 * size;
      rod([x, 0.26 * size, z], [ex, y, ez], 0.012 * size, dark);
      const leaf = ball(ex, y, ez, 0.15 * size, green, [0.5, 1, 0.25]);
      leaf.rotation.z = Math.cos(angle) * 0.75;
    }
  };
  plant(2.56, -1.3, 1.5);
  // Woven rug leaves the walking route clearly visible.
  box(-0.35, 0.027, 0.48, 2.8, 0.014, 1.35, mat(0xb0b29a));
  for (let i = 0; i < 5; i++)
    box(-0.35, 0.036, 0.01 + i * 0.24, 2.63, 0.002, 0.016, linen);
  return { lamp, bulb, sky, seat };
}
