import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  VRMLoaderPlugin,
  VRMUtils,
  type VRM,
  type VRMHumanBoneName,
} from '@pixiv/three-vrm';
import { FLOOR_HEIGHT, SEAT_HEIGHT, type RoomPose } from './motion3d.ts';
import { createBodyAnimation } from './clips3d.ts';

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
    length = T.MathUtils.clamp(
      direction.length(),
      Math.abs(l1 - l2) + 0.002,
      l1 + l2 - 0.004,
    );
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
  return createGirlRig(vrm);
}

/** Shared with the actual-model skeleton tests; rendering is not needed for contact checks. */
export function createGirlRig(vrm: VRM) {
  const bone = (name: VRMHumanBoneName) =>
    vrm.humanoid.getNormalizedBoneNode(name)!;
  const hips = bone('hips'),
    baseY = hips.position.y;
  vrm.scene.updateMatrixWorld(true);
  const footY =
    bone('leftFoot').getWorldPosition(new T.Vector3()).y + FLOOR_HEIGHT;
  const animation = createBodyAnimation(bone);
  const legLength = (side: 'left' | 'right') =>
    bone(`${side}UpperLeg`)
      .getWorldPosition(new T.Vector3())
      .distanceTo(bone(`${side}LowerLeg`).getWorldPosition(new T.Vector3())) +
    bone(`${side}LowerLeg`)
      .getWorldPosition(new T.Vector3())
      .distanceTo(bone(`${side}Foot`).getWorldPosition(new T.Vector3()));
  const lengths = [legLength('left'), legLength('right')];
  let previousTime: number | undefined;
  function pose(p: RoomPose) {
    animation.sample(p);
    vrm.scene.position.set(p.x, 0, p.z);
    vrm.scene.rotation.y = p.yaw;
    // Pelvis rests just above the padded seat. Standing feet retain their bind-pose height.
    hips.position.y =
      baseY +
      (SEAT_HEIGHT + 0.105 - baseY) * p.seated -
      0.045 * (1 - p.seated) -
      0.009 * Math.sin(p.phase * Math.PI * 2) ** 2 * p.walk;
    bone('chest').rotation.x += Math.sin(p.time * 1.4) * 0.006;
    bone('head').rotation.y += Math.sin(p.time * 0.29) * 0.018 * (1 - p.walk);
    bone('neck').rotation.y += p.lookAhead;
    vrm.scene.updateMatrixWorld(true);
    let lowerPelvis = 0;
    for (const [i, side] of ['left', 'right'].entries()) {
      const hip = bone(`${side}UpperLeg` as VRMHumanBoneName).getWorldPosition(
          new T.Vector3(),
        ),
        f = p.feet[i]!;
      const horizontal = (hip.x - f.x) ** 2 + (hip.z - f.z) ** 2;
      const vertical = Math.sqrt(
        Math.max(0.01, (lengths[i]! - 0.012) ** 2 - horizontal),
      );
      lowerPelvis = Math.max(
        lowerPelvis,
        hip.y - (footY + f.y + Math.abs(Math.sin(f.pitch)) * 0.1) - vertical,
      );
    }
    hips.position.y -= Math.min(0.065, lowerPelvis);
    vrm.scene.updateMatrixWorld(true);
    const world = (x: number, y: number, z: number) =>
      vrm.scene.localToWorld(new T.Vector3(x, y, z));
    for (const [side, sign, index] of [
      ['left', 1, 0],
      ['right', -1, 1],
    ] as const) {
      const gait = p.feet[index];
      const foot = bone(`${side}Foot`),
        upper = bone(`${side}UpperLeg`),
        lower = bone(`${side}LowerLeg`);
      solveLimb(
        upper,
        lower,
        foot,
        new T.Vector3(
          gait.x,
          footY + gait.y + Math.abs(Math.sin(gait.pitch)) * 0.1,
          gait.z,
        ),
        world(sign * 0.12, 0.48, 1.2),
      );
      // Swing rolls the shoe; the contact phase retains a world-space planted sole.
      foot.quaternion.copy(
        foot
          .parent!.getWorldQuaternion(new T.Quaternion())
          .invert()
          .multiply(
            new T.Quaternion().setFromEuler(
              new T.Euler(gait.pitch, gait.yaw, 0, 'YXZ'),
            ),
          ),
      );
      const arm = bone(`${side}UpperArm`),
        forearm = bone(`${side}LowerArm`),
        hand = bone(`${side}Hand`);
      if (p.hands > 0) {
        vrm.scene.updateMatrixWorld(true);
        const resting = hand.getWorldPosition(new T.Vector3());
        const reading = world(sign * 0.12, 0.895, 0.44);
        solveLimb(
          arm,
          forearm,
          hand,
          resting.lerp(reading, p.hands),
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
            .lerp(new T.Vector3(-2.04, 1.3, -1.045), p.reach),
          new T.Vector3(-1.65, 0.95, -1.12),
        );
      }
    }
    if (p.hands > 0)
      for (const [side, sign] of [
        ['left', 1],
        ['right', -1],
      ] as const) {
        const hand = bone(`${side}Hand`);
        hand.quaternion.slerp(
          hand
            .parent!.getWorldQuaternion(new T.Quaternion())
            .invert()
            .multiply(vrm.scene.getWorldQuaternion(new T.Quaternion()))
            .multiply(
              new T.Quaternion().setFromEuler(
                new T.Euler(0, (-sign * Math.PI) / 2, 0),
              ),
            ),
          p.hands,
        );
      }
    const blink = p.time % 5.7;
    vrm.expressionManager?.setValue(
      'blink',
      blink < 0.16 ? Math.sin((blink / 0.16) * Math.PI) : 0,
    );
    const firstPose = previousTime === undefined;
    const delta = firstPose ? 0 : p.time - previousTime!;
    const dt = Math.max(0, Math.min(0.05, delta));
    previousTime = p.time;
    // Scrubbing, a new cycle, or a heavily throttled tab must not fling the hair.
    if (firstPose || delta < 0 || delta > 0.2) {
      vrm.humanoid.update();
      vrm.nodeConstraintManager?.update();
      vrm.scene.updateMatrixWorld(true);
      vrm.springBoneManager?.reset();
    }
    vrm.update(dt);
  }
  return { object: vrm.scene, pose, vrm, dispose: animation.dispose };
}
