/**
 * Adapted from Animnia/pure-line-room, room.html (Apache-2.0).
 * Modified for 徐磊的小房间: new furniture layout and objects, orthographic fit,
 * navigation targets, theme palette and explicit resource disposal. No audio.
 * Source and full upstream license: /licenses/pure-line-room.txt
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { RoomId } from './config';

export function createRoomScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-9, 9, 7, -7, 0.1, 100);
  camera.position.set(13, 11, 15);
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld();
  const ink = new THREE.LineBasicMaterial({ color: 0x292927 });
  const fill = new THREE.MeshBasicMaterial({
    color: 0xfaf9f6,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  });
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const bold = new LineMaterial({ color: 0x292927, linewidth: 2.8 });
  const targets = new Map<
    RoomId,
    {
      group: THREE.Group;
      proxy: THREE.Mesh;
      highlight: THREE.Group;
      anchor: THREE.Vector3;
    }
  >();
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>([ink, fill, hidden, bold]);
  let disposed = false;

  function geometry<T extends THREE.BufferGeometry>(g: T) {
    geometries.add(g);
    return g;
  }
  function edge(g: THREE.BufferGeometry) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geometry(g), fill));
    group.add(
      new THREE.LineSegments(geometry(new THREE.EdgesGeometry(g, 25)), ink),
    );
    return group;
  }
  function box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) {
    const object = edge(new THREE.BoxGeometry(w, h, d));
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  function cylinder(
    parent: THREE.Object3D,
    top: number,
    bottom: number,
    h: number,
    x: number,
    y: number,
    z: number,
    segments = 24,
  ) {
    const object = edge(new THREE.CylinderGeometry(top, bottom, h, segments));
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  function line(parent: THREE.Object3D, points: number[][]) {
    const object = new THREE.Line(
      geometry(
        new THREE.BufferGeometry().setFromPoints(
          points.map(
            (p) => new THREE.Vector3(...(p as [number, number, number])),
          ),
        ),
      ),
      ink,
    );
    parent.add(object);
    return object;
  }
  function group(x: number, y: number, z: number) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    scene.add(g);
    return g;
  }
  function target(id: RoomId, g: THREE.Group) {
    g.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(g);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const proxy = new THREE.Mesh(
      geometry(
        new THREE.BoxGeometry(size.x + 0.12, size.y + 0.12, size.z + 0.12),
      ),
      hidden,
    );
    proxy.position.copy(center);
    proxy.userData.roomId = id;
    scene.add(proxy);
    const highlight = new THREE.Group();
    g.traverse((child) => {
      if (!(child instanceof THREE.LineSegments)) return;
      const vertices = child.geometry.getAttribute('position');
      const thick = new LineSegments2(
        geometry(
          new LineSegmentsGeometry().setPositions(Array.from(vertices.array)),
        ),
        bold,
      );
      // Use world transforms so a highlighted rotated book stays aligned.
      thick.applyMatrix4(child.matrixWorld);
      highlight.add(thick);
    });
    highlight.visible = false;
    scene.add(highlight);
    targets.set(id, { group: g, proxy, highlight, anchor: center });
  }

  // Two open walls and a quiet plank floor, following upstream's filled edges.
  box(scene, 10, 0.12, 8, 0, -0.08, 0);
  box(scene, 10, 5.4, 0.12, 0, 2.7, -4.06);
  box(scene, 0.12, 5.4, 8, -5.06, 2.7, 0);
  box(scene, 10, 0.16, 0.12, 0, 0.08, -3.94);
  box(scene, 0.12, 0.16, 8, -4.94, 0.08, 0);
  for (let z = -3.2; z < 4; z += 0.8)
    line(scene, [
      [-5, 0.001, z],
      [5, 0.001, z],
    ]);

  // Window above the desk. Decorative, never registered as a target.
  const window = group(-4.96, 3.8, 0.6);
  box(window, 0.06, 2, 2.8, 0, 0, 0);
  box(window, 0.1, 0.06, 2.8, 0.06, 0, 0);
  box(window, 0.1, 2, 0.06, 0.06, 0, 0);
  box(window, 0.28, 0.08, 3, 0.1, -1, 0);
  for (let y = 0.5; y <= 0.9; y += 0.2)
    line(window, [
      [0.07, y, -1.38],
      [0.07, y, 1.38],
    ]);

  // Desk has enough surface area to give computer, lamp and book distinct picks.
  const desk = group(-3.25, 0, 0.9);
  box(desk, 2.8, 0.14, 3.2, 0, 1.85, 0);
  for (const x of [-1.22, 1.22])
    for (const z of [-1.4, 1.4]) box(desk, 0.08, 1.8, 0.08, x, 0.9, z);
  const computer = group(-3.1, 1.96, 0.15);
  box(computer, 1.45, 0.07, 1, 0, 0, 0);
  const screen = box(computer, 1.45, 0.95, 0.07, 0, 0.5, -0.44);
  screen.rotation.x = -0.12;
  box(computer, 1.28, 0.74, 0.02, 0, 0.52, -0.36);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 9; col++)
      box(
        computer,
        0.095,
        0.012,
        0.07,
        -0.56 + col * 0.14,
        0.042,
        -0.17 + row * 0.12,
      );
  box(computer, 0.38, 0.012, 0.16, 0, 0.042, 0.3);
  line(computer, [
    [-0.38, 0.65, -0.34],
    [-0.51, 0.54, -0.34],
    [-0.38, 0.43, -0.34],
  ]);
  line(computer, [
    [0.38, 0.65, -0.34],
    [0.51, 0.54, -0.34],
    [0.38, 0.43, -0.34],
  ]);
  line(computer, [
    [0.09, 0.7, -0.34],
    [-0.09, 0.39, -0.34],
  ]);
  target('computer', computer);

  const textbook = group(-2.95, 2.01, 1.91);
  box(textbook, 1.25, 0.16, 0.82, 0, 0, 0);
  box(textbook, 1.31, 0.025, 0.87, 0, 0.095, 0);
  for (let y = -0.04; y <= 0.04; y += 0.04)
    line(textbook, [
      [-0.6, y, 0.416],
      [0.6, y, 0.416],
    ]);
  line(textbook, [
    [-0.18, 0.111, -0.22],
    [0.16, 0.111, -0.22],
    [-0.12, 0.111, 0],
    [0.16, 0.111, 0.22],
    [-0.18, 0.111, 0.22],
  ]);
  textbook.rotation.y = -0.12;
  target('textbook', textbook);

  const lamp = group(-4.2, 1.95, 0.7);
  cylinder(lamp, 0.25, 0.3, 0.08, 0, 0, 0);
  box(lamp, 0.045, 0.7, 0.045, 0, 0.38, 0);
  const arm = box(lamp, 0.045, 0.57, 0.045, 0.14, 0.84, 0);
  arm.rotation.z = -0.6;
  const shade = cylinder(lamp, 0.13, 0.3, 0.3, 0.36, 1.03, 0, 16);
  shade.rotation.z = -0.5;
  target('lamp', lamp);

  const drawer = group(-2.3, 0.96, 1.68);
  box(drawer, 0.95, 1.48, 1.18, 0, 0, 0);
  for (const y of [-0.48, 0, 0.48]) {
    box(drawer, 0.88, 0.43, 0.06, 0, y, 0.62);
    box(drawer, 0.3, 0.045, 0.07, 0, y + 0.03, 0.68);
  }
  target('drawer', drawer);
  // A tucked-in stool and a mug are deliberately decorative.
  cylinder(scene, 0.48, 0.48, 0.12, -0.86, 1.13, 0.2);
  for (const x of [-1.17, -0.55])
    for (const z of [-0.1, 0.5]) box(scene, 0.06, 1.07, 0.06, x, 0.53, z);
  cylinder(scene, 0.13, 0.12, 0.27, -4.18, 2.05, 1.95, 16);

  const bookshelf = group(3.72, 0, -3.42);
  for (const x of [-0.9, 0.9]) box(bookshelf, 0.08, 4.6, 0.83, x, 2.3, 0);
  for (const y of [0.08, 1.18, 2.3, 3.42, 4.6])
    box(bookshelf, 1.88, 0.08, 0.83, 0, y, 0);
  for (let row = 0; row < 4; row++)
    for (let i = 0; i < 6; i++) {
      const h = 0.63 + ((i * 3 + row) % 4) * 0.09;
      const book = box(
        bookshelf,
        0.17,
        h,
        0.56,
        -0.65 + i * 0.24,
        0.15 + row * 1.12 + h / 2,
        0.02,
      );
      if (i === 5) book.rotation.z = -0.1;
    }
  target('bookshelf', bookshelf);

  const door = group(-3.77, 0, -3.92);
  box(door, 1.7, 3.95, 0.12, 0, 1.98, 0);
  for (const y of [1, 2.95]) box(door, 1.35, 1.55, 0.035, 0, y, 0.09);
  box(door, 0.3, 0.06, 0.13, 0.49, 1.95, 0.14);
  target('door', door);
  box(scene, 1.95, 0.02, 0.85, -3.77, 0.02, -2.98);

  const portrait = group(-1.08, 3.63, -3.92);
  box(portrait, 1.5, 1.5, 0.12, 0, 0, 0);
  box(portrait, 1.3, 1.3, 0.035, 0, 0, 0.08);
  target('portrait', portrait);
  const portraitMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  materials.add(portraitMaterial);
  const image = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(1.19, 1.19)),
    portraitMaterial,
  );
  image.position.set(0, 0, 0.106);
  portrait.add(image);

  const calendar = group(1.19, 3.65, -3.9);
  box(calendar, 1.15, 1.4, 0.08, 0, 0, 0);
  box(calendar, 1.15, 0.24, 0.02, 0, 0.54, 0.06);
  for (const x of [-0.36, 0.36])
    box(calendar, 0.045, 0.22, 0.05, x, 0.72, 0.08);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 5; c++)
      box(calendar, 0.08, 0.07, 0.012, -0.4 + c * 0.2, 0.22 - r * 0.22, 0.056);
  target('calendar', calendar);

  // Low sofa / rug, with a separate controller table in the right foreground.
  const sofa = group(0.4, 0, -2.63);
  box(sofa, 3.1, 0.7, 1.05, 0, 0.55, 0);
  box(sofa, 3.1, 0.88, 0.2, 0, 1.11, -0.45);
  for (const x of [-1.54, 1.54]) box(sofa, 0.22, 0.72, 1.15, x, 0.91, 0);
  for (const x of [-0.77, 0.77]) box(sofa, 1.35, 0.14, 0.8, x, 0.95, 0.02);
  const rug = cylinder(scene, 1.56, 1.56, 0.016, 1.53, 0.012, 1.17, 48);
  rug.scale.z = 0.76;
  box(scene, 2.15, 0.12, 1.25, 2, 0.78, 1.65);
  for (const x of [1.1, 2.9])
    for (const z of [1.2, 2.1]) box(scene, 0.07, 0.72, 0.07, x, 0.36, z);
  const controller = group(2, 1, 1.67);
  box(controller, 0.9, 0.19, 0.53, 0, 0, 0);
  for (const x of [-0.47, 0.47]) {
    const grip = cylinder(controller, 0.24, 0.19, 0.48, x, -0.05, 0.12, 12);
    grip.rotation.x = 0.65;
  }
  box(controller, 0.25, 0.045, 0.07, -0.29, 0.12, -0.05);
  box(controller, 0.07, 0.045, 0.25, -0.29, 0.12, -0.05);
  for (const [x, z] of [
    [0.29, -0.15],
    [0.42, -0.02],
    [0.29, 0.11],
    [0.16, -0.02],
  ])
    cylinder(controller, 0.037, 0.037, 0.04, x, 0.13, z, 12);
  for (const x of [-0.11, 0.11])
    cylinder(controller, 0.075, 0.075, 0.05, x, 0.13, 0.16, 16);
  target('controller', controller);

  // Record player sits apart from the desk and controller.
  box(scene, 1.75, 1.05, 1.4, -3.5, 0.525, 3.15);
  const record = group(-3.5, 1.16, 3.15);
  box(record, 1.85, 0.18, 1.43, 0, 0, 0);
  cylinder(record, 0.55, 0.55, 0.035, -0.2, 0.115, 0, 48);
  cylinder(record, 0.19, 0.19, 0.038, -0.2, 0.14, 0, 32);
  cylinder(record, 0.035, 0.035, 0.06, -0.2, 0.17, 0, 12);
  line(record, [
    [0.63, 0.15, -0.48],
    [0.68, 0.2, -0.38],
    [0.52, 0.2, 0.35],
    [0.32, 0.2, 0.4],
  ]);
  box(record, 0.13, 0.06, 0.18, 0.33, 0.18, 0.4);
  target('record', record);

  // Small plant, without an interaction proxy.
  cylinder(scene, 0.31, 0.22, 0.53, 4.08, 0.28, 2.7, 16);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = 4.08 + Math.cos(a) * 0.42,
      z = 2.7 + Math.sin(a) * 0.42;
    line(scene, [
      [4.08, 0.5, 2.7],
      [x, 1.24, z],
      [x + 0.15, 1.1, z + 0.08],
      [4.08, 0.5, 2.7],
    ]);
  }
  scene.updateMatrixWorld(true);

  function fit(width: number, height: number) {
    // Project every room corner; fit its actual silhouette, not a guessed FOV.
    camera.left = -1;
    camera.right = 1;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();
    const corners: THREE.Vector3[] = [];
    for (const x of [-5.15, 5.15])
      for (const y of [-0.16, 5.45])
        for (const z of [-4.15, 4.15])
          corners.push(new THREE.Vector3(x, y, z).project(camera));
    const minX = Math.min(...corners.map((p) => p.x)),
      maxX = Math.max(...corners.map((p) => p.x));
    const minY = Math.min(...corners.map((p) => p.y)),
      maxY = Math.max(...corners.map((p) => p.y));
    const aspect = width / height;
    const halfH =
      Math.max((maxY - minY) / 2, (maxX - minX) / 2 / aspect) * 1.055;
    const cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2;
    camera.left = cx - halfH * aspect;
    camera.right = cx + halfH * aspect;
    camera.top = cy + halfH;
    camera.bottom = cy - halfH;
    camera.updateProjectionMatrix();
    bold.resolution.set(width, height);
  }
  function theme(dark: boolean) {
    const paper = dark ? 0x191a1c : 0xfaf9f6,
      color = dark ? 0xe3e1d9 : 0x292927;
    scene.background = new THREE.Color(paper);
    fill.color.setHex(paper);
    ink.color.setHex(color);
    bold.color.setHex(color);
  }
  function highlight(id: RoomId | null) {
    targets.forEach((item, key) => {
      item.highlight.visible = key === id;
    });
  }
  function loadAvatar(url: string, invalidate: () => void) {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.add(texture);
        portraitMaterial.map = texture;
        portraitMaterial.needsUpdate = true;
        invalidate();
      },
      undefined,
      () => {
        /* Keep the outlined frame if the local avatar fails. */
      },
    );
  }
  function dispose() {
    disposed = true;
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => m.dispose());
    scene.clear();
  }
  const assistantAnchor = new THREE.Vector3(4.7, 0.04, 3.85);
  function projectAssistant(width: number, height: number) {
    const p = assistantAnchor.clone().project(camera);
    return {
      x: ((p.x + 1) / 2) * width,
      // On small screens let it sit just over the front edge, clear of the controller.
      y: ((1 - p.y) / 2) * height + (width < 600 ? 16 : 0),
      size: width >= 900 ? 64 : 44,
    };
  }
  return {
    scene,
    camera,
    targets,
    fit,
    theme,
    highlight,
    loadAvatar,
    dispose,
    assistantAnchor,
    projectAssistant,
  };
}
