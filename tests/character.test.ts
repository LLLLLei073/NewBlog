import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { VRM, VRMHumanoid } from '@pixiv/three-vrm';
import { createGirlRig } from '../src/components/room/character3d.ts';
import {
  FLOOR_HEIGHT,
  roomCycle,
  roomDuration,
  roomPose,
} from '../src/components/room/motion3d.ts';

/** Use the shipped avatar's complete bind hierarchy, not an idealized test skeleton. */
function modelRig() {
  const data = readFileSync('public/models/study/girl.vrm');
  const json = JSON.parse(
    data.subarray(20, 20 + data.readUInt32LE(12)).toString(),
  );
  const nodes = json.nodes.map((n: any) => {
    const o = new T.Object3D();
    o.name = n.name ?? '';
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    return o;
  });
  json.nodes.forEach((n: any, i: number) =>
    n.children?.forEach((c: number) => nodes[i].add(nodes[c])),
  );
  const scene = new T.Group();
  json.scenes[json.scene ?? 0].nodes.forEach((n: number) =>
    scene.add(nodes[n]),
  );
  scene.updateMatrixWorld(true);
  const humanoid = new VRMHumanoid(
    Object.fromEntries(
      Object.entries(json.extensions.VRMC_vrm.humanoid.humanBones).map(
        ([name, b]: [string, any]) => [name, { node: nodes[b.node] }],
      ),
    ),
  );
  scene.add(humanoid.normalizedHumanBonesRoot);
  return createGirlRig(new VRM({ scene, humanoid }));
}
for (const visit of ['window', 'shelf'] as const)
  test(`${visit}: actual model rig maintains contact and continuous joints`, () => {
    const rig = modelRig(),
      cycle = roomCycle(visit),
      duration = roomDuration(cycle);
    const bone = (name: any) => rig.vrm.humanoid.getNormalizedBoneNode(name)!;
    let previous: T.Quaternion[] | undefined,
      maxError = 0,
      maxAngle = 0,
      minY = Infinity,
      worst: any = {};
    for (let t = 0; t < duration * 2; t += 1 / 30) {
      const p = roomPose(cycle, t);
      rig.pose(p);
      const joints = [
        'hips',
        'spine',
        'leftUpperLeg',
        'rightUpperLeg',
        'leftLowerLeg',
        'rightLowerLeg',
        'leftHand',
        'rightHand',
      ].map((n) => bone(n).getWorldQuaternion(new T.Quaternion()));
      if (previous)
        joints.forEach((q, i) => {
          const a = q.angleTo(previous![i]!);
          if (a > maxAngle) {
            maxAngle = a;
            worst.joint = { t, i, action: p.action };
          }
        });
      previous = joints;
      for (const [i, side] of ['left', 'right'].entries()) {
        const actual = bone(`${side}Foot`).getWorldPosition(new T.Vector3()),
          f = p.feet[i]!;
        const expected = new T.Vector3(
          f.x,
          FLOOR_HEIGHT + 0.100651 + f.y + Math.abs(Math.sin(f.pitch)) * 0.1,
          f.z,
        );
        if (actual.distanceTo(expected) > maxError) {
          maxError = actual.distanceTo(expected);
          worst.contact = { t, side, action: p.action };
        }
        minY = Math.min(minY, actual.y);
        if (p.action === 'read') {
          const knee = bone(`${side}LowerLeg`).getWorldPosition(
            new T.Vector3(),
          );
          assert.ok(
            knee.y < 0.7,
            'knee and thigh clear the .75m desk underside',
          );
          assert.ok(
            Math.abs(bone('hips').getWorldPosition(new T.Vector3()).y - 0.565) <
              0.005,
            'hips rest above chair cushion',
          );
        }
      }
    }
    console.log({
      visit,
      maxContactErrorMm: maxError * 1000,
      maxJointDegrees: T.MathUtils.radToDeg(maxAngle),
      minAnkleY: minY,
      worst,
    });
    assert.ok(maxError < 0.012, 'feet stay within 12mm of planned contact');
    assert.ok(maxAngle < 0.45, 'no abrupt joint jumps at 30fps');
    assert.ok(minY > 0.09, 'ankles do not penetrate the floor');
    rig.dispose();
  });

test('sampling the same paused time is idempotent and a new cycle retains simulation time', () => {
  const rig = modelRig(),
    p = roomPose(roomCycle('shelf'), 35, 200);
  rig.pose(p);
  const a = rig.vrm.humanoid.getNormalizedPose();
  for (let i = 0; i < 5; i++) rig.pose(p);
  const b = rig.vrm.humanoid.getNormalizedPose();
  for (const name of Object.keys(a)) {
    const qa = new T.Quaternion()
      .fromArray(a[name as keyof typeof a]!.rotation!)
      .normalize();
    const qb = new T.Quaternion()
      .fromArray(b[name as keyof typeof b]!.rotation!)
      .normalize();
    assert.ok(qa.angleTo(qb) < 1e-6, `${name}: ${qa.angleTo(qb)}`);
  }
  assert.equal(roomPose(roomCycle('window'), 0, 201).time, 201);
  rig.dispose();
});
