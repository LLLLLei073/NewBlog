import * as T from 'three';
import type { VRMHumanBoneName } from '@pixiv/three-vrm';
import type { RoomPose } from './motion3d';

type Angles = [number, number, number];
type Keys = Partial<Record<VRMHumanBoneName, Angles[]>>;
const times = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
/** Original, normalized-bone keyframes. Radians; a walk clip is two alternating steps. */
export function createBodyAnimation(
  bone: (name: VRMHumanBoneName) => T.Object3D,
) {
  const neutral: Partial<Record<VRMHumanBoneName, Angles>> = {
    hips: [0, 0, 0],
    spine: [0.025, 0, 0],
    chest: [0, 0, 0],
    neck: [0, 0, 0],
    head: [0.015, 0, 0],
    leftUpperArm: [0.04, 0, -1.35],
    rightUpperArm: [0.04, 0, 1.35],
    leftLowerArm: [0, -0.15, 0],
    rightLowerArm: [0, 0.15, 0],
    leftUpperLeg: [0, 0, 0],
    rightUpperLeg: [0, 0, 0],
    leftLowerLeg: [0, 0, 0],
    rightLowerLeg: [0, 0, 0],
    leftHand: [0, 0, 0],
    rightHand: [0, 0, 0],
    leftFoot: [0, 0, 0],
    rightFoot: [0, 0, 0],
  };
  const walk: Keys = {
    hips: [
      [0, 0, 0],
      [0.01, -0.045, -0.025],
      [0, -0.06, -0.035],
      [-0.01, -0.025, -0.02],
      [0, 0, 0],
      [0.01, 0.045, 0.025],
      [0, 0.06, 0.035],
      [-0.01, 0.025, 0.02],
      [0, 0, 0],
    ],
    spine: [
      [0.04, 0, 0],
      [0.045, 0.035, 0.015],
      [0.04, 0.05, 0.025],
      [0.035, 0.02, 0.015],
      [0.04, 0, 0],
      [0.045, -0.035, -0.015],
      [0.04, -0.05, -0.025],
      [0.035, -0.02, -0.015],
      [0.04, 0, 0],
    ],
    head: [
      [0.02, 0, 0],
      [0.02, -0.01, -0.008],
      [0.025, -0.015, -0.01],
      [0.02, -0.01, -0.008],
      [0.02, 0, 0],
      [0.02, 0.01, 0.008],
      [0.025, 0.015, 0.01],
      [0.02, 0.01, 0.008],
      [0.02, 0, 0],
    ],
  };
  const swing = [0, 0.16, 0.24, 0.14, 0, -0.16, -0.24, -0.14, 0];
  for (const [side, sign] of [
    ['left', 1],
    ['right', -1],
  ] as const) {
    walk[`${side}UpperArm`] = swing.map((v) => [
      v * sign + 0.04,
      0,
      -sign * 1.35,
    ]);
    walk[`${side}LowerArm`] = swing.map((v) => [
      0,
      -sign * (0.18 + Math.max(0, v * sign) * 0.6),
      0,
    ]);
    walk[`${side}UpperLeg`] = swing.map((v) => [-v * sign * 1.2, 0, 0]);
    walk[`${side}LowerLeg`] = swing.map((v) => [
      Math.max(0, v * sign) * 1.8,
      0,
      0,
    ]);
  }
  const steady = (values: Partial<Record<VRMHumanBoneName, Angles>>): Keys =>
    Object.fromEntries(
      Object.entries(values).map(([name, v]) => [name, times.map(() => v)]),
    );
  const profile = (values: number[]) => values.map((v) => [v, 0, 0] as Angles);
  const rise: Keys = {
    spine: profile([0.17, 0.23, 0.39, 0.42, 0.33, 0.19, 0.08, 0.025, 0.025]),
    chest: profile([0.04, 0.045, 0.06, 0.065, 0.055, 0.035, 0.015, 0, 0]),
    head: profile([0.16, 0.16, 0.13, 0.08, 0.04, 0.02, 0.015, 0.015, 0.015]),
  };
  const sit: Keys = {
    spine: profile([0.025, 0.08, 0.19, 0.32, 0.38, 0.3, 0.18, 0.17, 0.17]),
    chest: profile([0, 0.015, 0.035, 0.05, 0.055, 0.045, 0.035, 0.04, 0.04]),
    head: profile([0.015, 0.025, 0.07, 0.12, 0.16, 0.17, 0.16, 0.16, 0.16]),
  };
  const turning: Keys = { ...walk };
  for (const side of ['left', 'right'] as const)
    turning[`${side}UpperArm`] = walk[`${side}UpperArm`]!.map(([x, y, z]) => [
      x * 0.4,
      y,
      z,
    ]);
  // Mixer bindings cache unchanged values. Keep their output separate from the rig
  // so additive motion and IK cannot feed back into the next sampled pose.
  const output = new T.Group();
  const targets = Object.fromEntries(
    Object.keys(neutral).map((name) => {
      const node = new T.Object3D();
      output.add(node);
      return [name, node];
    }),
  );
  const mixer = new T.AnimationMixer(output);
  const make = (name: string, keys: Keys) => {
    const tracks = Object.entries(neutral).map(([name, base]) => {
      const values = (
        keys[name as VRMHumanBoneName] ?? times.map(() => base!)
      ).flatMap((v) =>
        new T.Quaternion().setFromEuler(new T.Euler(...v)).toArray(),
      );
      return new T.QuaternionKeyframeTrack(
        `${targets[name]!.uuid}.quaternion`,
        times,
        values,
      );
    });
    const action = mixer.clipAction(new T.AnimationClip(name, 1, tracks));
    action.play();
    action.paused = true;
    return action;
  };
  const actions = {
    idle: make('quiet standing', {}),
    walk: make('two step walk', walk),
    turn: make('turning steps', turning),
    rise: make('withdraw hands lean then rise', rise),
    sit: make('bend settle then return hands', sit),
    read: make(
      'reading',
      steady({ spine: [0.17, 0, 0], chest: [0.04, 0, 0], head: [0.16, 0, 0] }),
    ),
    window: make(
      'window gaze',
      steady({
        chest: [0, 0.045, 0],
        neck: [-0.025, 0.09, 0],
        head: [-0.04, 0.08, 0.015],
      }),
    ),
    reach: make(
      'shelf reach',
      steady({
        spine: [0.06, -0.035, 0],
        chest: [0, -0.045, 0],
        head: [0.02, -0.1, 0],
        rightUpperArm: [-0.35, 0, 1.05],
      }),
    ),
  };
  return {
    sample(p: RoomPose) {
      const weights = {
        read: p.action === 'read' ? 1 : 0,
        rise: p.action === 'rise' ? 1 : 0,
        sit: p.action === 'sit' ? 1 : 0,
        turn: p.action === 'turn' ? p.walk : 0,
        walk: p.action === 'walk' ? p.walk : 0,
        reach: p.reach * 0.65,
        window:
          p.action === 'visit' && !p.reach
            ? Math.sin(Math.PI * p.progress) ** 2 * 0.7
            : 0,
      };
      const total = Object.values(weights).reduce((a, b) => a + b, 0),
        scale = total > 1 ? 1 / total : 1;
      actions.idle.setEffectiveWeight(Math.max(0, 1 - total));
      for (const name of [
        'read',
        'walk',
        'turn',
        'rise',
        'sit',
        'reach',
        'window',
      ] as const)
        actions[name].setEffectiveWeight(weights[name] * scale);
      actions.walk.time = ((p.phase % 1) + 1) % 1;
      actions.turn.time = actions.walk.time;
      actions.rise.time = actions.sit.time = Math.min(0.999999, p.progress);
      mixer.update(0);
      for (const [name, node] of Object.entries(targets))
        bone(name as VRMHumanBoneName).quaternion.copy(node.quaternion);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(output);
    },
  };
}
