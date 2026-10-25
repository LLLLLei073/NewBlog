import * as T from 'three';
import { VRMUtils } from '@pixiv/three-vrm';
import { lightingAt } from '../home/illustration/daylight';
import { lampStrength, type LampMode } from '../home/illustration/preferences';
import { furnish } from './furniture3d';
import { loadGirl } from './character3d';
import { TARGETS, type RoomPose, type Ground } from './motion3d';

export async function createRoom3d(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'low-power',
  });
  const scene = new T.Scene();
  scene.background = new T.Color(0x202d2c);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const camera = new T.OrthographicCamera(-3.9, 3.9, 2.6, -2.6, 0.1, 40);
  camera.position.set(6.5, 5.1, 8.8);
  camera.lookAt(0, 1, 0);
  camera.updateMatrixWorld();
  const furniture = furnish(scene);
  const ambient = new T.HemisphereLight(0xc8d7e0, 0x695846, 2);
  scene.add(ambient);
  const sun = new T.DirectionalLight(0xffead0, 2.5);
  sun.position.set(-1, 5, -3);
  sun.target.position.set(0.4, 0, 0.5);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -4;
  sun.shadow.camera.right = 4;
  sun.shadow.camera.top = 4;
  sun.shadow.camera.bottom = -4;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.015;
  const fill = new T.DirectionalLight(0xa8c1ca, 0.7);
  fill.position.set(0, 3, 6);
  scene.add(fill);
  const coal = new T.Group();
  scene.add(coal);
  const black = new T.MeshStandardMaterial({ color: 0x172221, roughness: 1 });
  const body = new T.Mesh(new T.IcosahedronGeometry(0.12, 3), black);
  body.castShadow = true;
  coal.add(body);
  const eyes: T.Mesh[] = [];
  const cream = new T.MeshBasicMaterial({ color: 0xeee6cc });
  for (const x of [-0.043, 0.043]) {
    const eye = new T.Mesh(new T.SphereGeometry(0.028, 12, 8), cream);
    eye.position.set(x, 0.01, 0.105);
    eye.scale.set(1, 1, 0.3);
    coal.add(eye);
    eyes.push(eye);
    const pupil = new T.Mesh(new T.SphereGeometry(0.012, 8, 8), black);
    pupil.position.set(x, 0.01, 0.115);
    coal.add(pupil);
    eyes.push(pupil);
    const glasses = new T.Mesh(
      new T.TorusGeometry(0.038, 0.005, 6, 20),
      new T.MeshStandardMaterial({ color: 0xbda676 }),
    );
    glasses.position.set(x, 0.01, 0.12);
    coal.add(glasses);
  }
  const bridge = new T.Mesh(new T.BoxGeometry(0.026, 0.008, 0.008), cream);
  bridge.position.set(0, 0.015, 0.121);
  coal.add(bridge);
  let girl: Awaited<ReturnType<typeof loadGirl>>;
  const dispose = () => {
    girl?.dispose();
    VRMUtils.deepDispose(scene);
    renderer.dispose();
  };
  try {
    girl = await loadGirl(signal);
    scene.add(girl.object);
  } catch (error) {
    dispose();
    throw error;
  }
  let width = 0,
    height = 0;
  const project = (point: number[]) => {
    const p = new T.Vector3(...(point as [number, number, number])).project(
      camera,
    );
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  };
  const draw = (
    minutes: number,
    lampMode: LampMode,
    pose: RoomPose,
    coalPoint: Ground,
    coalMotion: number,
    resting = false,
  ) => {
    const w = canvas.clientWidth || 900,
      h = canvas.clientHeight || 600;
    if (w !== width || h !== height) {
      width = w;
      height = h;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5, 1500 / w));
      renderer.setSize(w, h, false);
      const halfH = Math.max(2.85, 4.275 / (w / h));
      camera.left = (-halfH * w) / h;
      camera.right = (halfH * w) / h;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
    }
    const light = lightingAt(minutes);
    ambient.color.setRGB(...light.ambient);
    ambient.intensity = 2.6;
    sun.color.setRGB(...light.color);
    sun.intensity = light.strength * 3;
    sun.position.set(light.direction[0] * 4, 3 + light.direction[1] * 3, -3);
    furniture.lamp.intensity = lampStrength(lampMode, light.lamp) * 2.5;
    (furniture.bulb.material as T.MeshStandardMaterial).emissiveIntensity =
      furniture.lamp.intensity;
    furniture.sky.color
      .setRGB(...light.color)
      .lerp(new T.Color(0x789b9e), 0.28);
    girl.pose(pose);
    coal.position.set(
      coalPoint.x,
      0.135 + Math.abs(Math.sin(coalMotion * 8)) * 0.065,
      coalPoint.z,
    );
    coal.rotation.y = Math.atan2(
      camera.position.x - coalPoint.x,
      camera.position.z - coalPoint.z,
    );
    const squash = Math.cos(coalMotion * 16) * 0.06;
    body.scale.set(1 + squash, 1 - squash, 1 + squash);
    for (const eye of eyes) eye.scale.y = resting ? 0.12 : 1;
    // Hold a readable size while the whole room fits into narrow screens.
    coal.scale.setScalar(
      (((w < 700 ? 32 : 40) / w) * (camera.right - camera.left)) / 0.24,
    );
    coal.position.y =
      0.12 * coal.scale.x + 0.025 + Math.abs(Math.sin(coalMotion * 8)) * 0.05;
    if (resting) body.scale.y = 0.75;
    renderer.render(scene, camera);
    return {
      coal: project([coal.position.x, coal.position.y, coal.position.z]),
      hotspots: Object.fromEntries(
        Object.entries(TARGETS).map(([id, p]) => [id, project(p)]),
      ),
    };
  };
  return { draw, dispose, camera, girl };
}
