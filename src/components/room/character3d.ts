import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  VRMLoaderPlugin,
  VRMUtils,
  type VRM,
  type VRMHumanBoneName,
} from '@pixiv/three-vrm';
import { footStep, SEAT_HEIGHT, type RoomPose } from './motion3d';

/** Two-bone IK in world space, keeping the knee on the forward side of the leg. */
export function solveLimb(
  upper: T.Object3D,
  lower: T.Object3D,
  end: T.Object3D,
  target: T.Vector3,
  pole: T.Vector3,
) {
  upper.updateWorldMatrix(true, true);
  const a = upper.getWorldPosition(new T.Vector3()),
    b = lower.getWorldPosition(new T.Vector3()),
    c = end.getWorldPosition(new T.Vector3());
  const l1 = a.distanceTo(b),
    l2 = b.distanceTo(c),
    direction = target.clone().sub(a),
    length = T.MathUtils.clamp(direction.length(), 0.001, l1 + l2 - 0.0001);
  direction.normalize();
  const bend = pole.clone().sub(a);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const along = (l1 * l1 + length * length - l2 * l2) / (2 * length);
  const knee = a
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
  const aim = (bone: T.Object3D, child: T.Object3D, to: T.Vector3) => {
    const origin = bone.getWorldPosition(new T.Vector3());
    const q = new T.Quaternion().setFromUnitVectors(
      child.getWorldPosition(new T.Vector3()).sub(origin).normalize(),
      to.clone().sub(origin).normalize(),
    );
    q.multiply(bone.getWorldQuaternion(new T.Quaternion()));
    bone.quaternion.copy(
      bone.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(q),
    );
    bone.updateWorldMatrix(false, true);
  };
  aim(upper, lower, knee);
  aim(lower, end, target);
}

export async function loadGirl(signal: AbortSignal) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const response = await fetch('/models/study/girl.vrm', { signal });
  if (!response.ok) throw new Error(`Avatar HTTP ${response.status}`);
  const gltf = await loader.parseAsync(
    await response.arrayBuffer(),
    '/models/study/',
  );
  const vrm = gltf.userData.vrm as VRM;
  if (signal.aborted) {
    VRMUtils.deepDispose(gltf.scene);
    throw new DOMException('Aborted', 'AbortError');
  }
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  vrm.scene.traverse((object) => {
    if (object instanceof T.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
    }
  });
  // Tint existing authored materials; keep the skin, expressions and texture detail.
  for (const material of vrm.materials ?? []) {
    const m = material as T.Material & {
      color?: T.Color;
      shadeColorFactor?: T.Color;
    };
    const color = /HAIR/.test(m.name)
      ? 0x333139
      : /Tops/.test(m.name)
        ? 0xc4cbb4
        : /Bottoms/.test(m.name)
          ? 0x3e4f49
          : undefined;
    if (color !== undefined) {
      m.color?.setHex(color);
      m.shadeColorFactor?.setHex(color).multiplyScalar(0.78);
    }
  }
  const bone = (name: VRMHumanBoneName) =>
    vrm.humanoid.getNormalizedBoneNode(name)!;
  const hips = bone('hips'),
    baseY = hips.position.y;
  vrm.scene.updateMatrixWorld(true);
  const footY = bone('leftFoot').getWorldPosition(new T.Vector3()).y;
  const footX = Math.abs(bone('leftFoot').getWorldPosition(new T.Vector3()).x);
  let previousTime = 0;
  function pose(p: RoomPose) {
    vrm.humanoid.resetNormalizedPose();
    vrm.scene.position.set(p.x, 0, p.z);
    vrm.scene.rotation.y = p.yaw;
    // Pelvis rests just above the padded seat. Standing feet retain their bind-pose height.
    hips.position.y =
      baseY + (SEAT_HEIGHT + 0.105 - baseY) * p.seated - 0.038 * (1 - p.seated);
    bone('spine').rotation.x =
      0.17 * p.seated + Math.sin(p.seated * Math.PI) * 0.2;
    bone('chest').rotation.x = 0.04 * p.seated + Math.sin(p.time * 1.4) * 0.006;
    bone('head').rotation.x = 0.16 * p.seated;
    vrm.scene.updateMatrixWorld(true);
    const world = (x: number, y: number, z: number) =>
      vrm.scene.localToWorld(new T.Vector3(x, y, z));
    for (const [side, sign, offset] of [
      ['left', 1, 0],
      ['right', -1, 0.5],
    ] as const) {
      const gait = footStep(p.phase + offset);
      const foot = bone(`${side}Foot`),
        upper = bone(`${side}UpperLeg`),
        lower = bone(`${side}LowerLeg`);
      solveLimb(
        upper,
        lower,
        foot,
        world(
          sign * footX,
          footY + gait.y * p.walk * (1 - p.seated),
          gait.z * p.walk * (1 - p.seated) + 0.32 * p.seated,
        ),
        world(sign * footX, 0.48, 1.2),
      );
      // Keep shoe soles level, independently of the knee bend.
      foot.quaternion.copy(
        foot
          .parent!.getWorldQuaternion(new T.Quaternion())
          .invert()
          .multiply(vrm.scene.getWorldQuaternion(new T.Quaternion())),
      );
      const arm = bone(`${side}UpperArm`),
        forearm = bone(`${side}LowerArm`),
        hand = bone(`${side}Hand`);
      arm.rotation.z = -sign * 1.35;
      arm.rotation.x =
        Math.sin((p.phase + offset) * Math.PI * 2) * 0.14 * p.walk;
      forearm.rotation.y = -sign * 0.13;
      if (p.seated > 0.01) {
        vrm.scene.updateMatrixWorld(true);
        const resting = hand.getWorldPosition(new T.Vector3());
        const reading = world(sign * 0.12, 0.85, 0.38);
        solveLimb(
          arm,
          forearm,
          hand,
          resting.lerp(reading, p.seated),
          world(sign * 0.5, 0.69, 0.12),
        );
      } else if (side === 'right' && p.reach > 0) {
        vrm.scene.updateMatrixWorld(true);
        solveLimb(
          arm,
          forearm,
          hand,
          hand
            .getWorldPosition(new T.Vector3())
            .lerp(world(-0.18, 1.18, 0.4), p.reach),
          world(-0.5, 0.9, 0.3),
        );
      }
    }
    if (p.seated > 0.5)
      for (const [side, sign] of [
        ['left', 1],
        ['right', -1],
      ] as const) {
        const hand = bone(`${side}Hand`);
        hand.quaternion.copy(
          hand
            .parent!.getWorldQuaternion(new T.Quaternion())
            .invert()
            .multiply(vrm.scene.getWorldQuaternion(new T.Quaternion()))
            .multiply(
              new T.Quaternion().setFromEuler(
                new T.Euler(0, (-sign * Math.PI) / 2, 0),
              ),
            ),
        );
      }
    const blink = p.time % 5.7;
    vrm.expressionManager?.setValue(
      'blink',
      blink < 0.16 ? Math.sin((blink / 0.16) * Math.PI) : 0,
    );
    const delta = p.time - previousTime;
    const dt = Math.max(0, Math.min(0.05, delta));
    previousTime = p.time;
    // Scrubbing, a new cycle, or a heavily throttled tab must not fling the hair.
    if (delta < 0 || delta > 0.2) {
      vrm.humanoid.update();
      vrm.nodeConstraintManager?.update();
      vrm.scene.updateMatrixWorld(true);
      vrm.springBoneManager?.reset();
    }
    vrm.update(dt);
  }
  return { object: vrm.scene, pose, vrm };
}
