import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  computeFK,
  positionFromMatrix,
  solveIK,
  applyIKResult,
  computeAllTransforms,
  checkConstraints,
  dhTransform,
  jointsWithSeededPose,
  ikPositionTarget,
  type Joint,
} from './kinematics';
import { getJointDefaults } from './jointDefaults';

const PI = Math.PI;
const BP: [number, number, number] = [0, 0, 0];

/** Build a joint with defaults + overrides (ids required for the store-shaped model). */
function J(type: Joint['type'], id: string, patch: Partial<Joint> = {}): Joint {
  const d = getJointDefaults(type);
  return { id, name: id, ...d, ...patch };
}

function eePos(joints: Joint[], base = BP): Vector3 {
  return positionFromMatrix(computeFK(joints, base));
}

function ikErrorAfterSolve(joints: Joint[], target: Vector3, base = BP, maxIter = 280): number {
  const result = solveIK(joints, target, base, maxIter, 0.002, 0.05);
  const solved = applyIKResult(joints, result);
  const goal = ikPositionTarget(target);
  return eePos(solved, base).distanceTo(goal);
}

describe('dhTransform', () => {
  it('is rigid: translation part matches standard DH for alpha=0, d=0', () => {
    const m = dhTransform(0, 0, 1, 0);
    const p = new Vector3();
    p.setFromMatrixPosition(m);
    expect(p.x).toBeCloseTo(1, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });
});

describe('computeAllTransforms', () => {
  it('keeps base origin at base position before Y-align internal step', () => {
    const joints: Joint[] = [J('base', 'b'), J('end-effector', 'ee', { d: 0.1, a: 0 })];
    const { transforms } = computeAllTransforms(joints, [1, 2, 3]);
    const baseFrame = transforms[0];
    const p = new Vector3().setFromMatrixPosition(baseFrame);
    expect(p.x).toBeCloseTo(1, 5);
    expect(p.y).toBeCloseTo(2, 5);
    expect(p.z).toBeCloseTo(3, 5);
  });
});

describe('FK consistency', () => {
  it('matches round-trip identity for fixed chain', () => {
    const joints: Joint[] = [
      J('base', 'b'),
      J('revolute', 'r1', { d: 0.5, a: 0.4, alpha: 0, theta: 0.25 }),
      J('end-effector', 'ee', { d: 0.1, a: 0 }),
    ];
    const a = eePos(joints);
    const b = eePos(joints.map(j => (j.id === 'r1' ? { ...j, theta: 0.25 } : j)));
    expect(a.distanceTo(b)).toBeLessThan(1e-9);
  });
});

describe('IK reaches targets it must solve (same kinematic family)', () => {
  /** Two revolute links in the horizontal plane after base Y-align (classic 2R). */
  function arm2R(): Joint[] {
    return [
      J('base', 'b'),
      J('revolute', 'r1', {
        d: 0,
        a: 1,
        alpha: 0,
        thetaMin: -PI,
        thetaMax: PI,
      }),
      J('revolute', 'r2', {
        d: 0,
        a: 1,
        alpha: 0,
        thetaMin: -PI,
        thetaMax: PI,
      }),
      J('end-effector', 'ee', { d: 0.05, a: 0, alpha: 0 }),
    ];
  }

  function withAngles(joints: Joint[], t1: number, t2: number): Joint[] {
    return joints.map(j => {
      if (j.id === 'r1') return { ...j, theta: t1 };
      if (j.id === 'r2') return { ...j, theta: t2 };
      return j;
    });
  }

  it('2R: round-trip from zero initial angles for several workspace poses', () => {
    const seeds: [number, number][] = [
      [0.2, 0.3],
      [-0.6, 0.9],
      [1.0, -0.4],
      [0.5, 0.5],
      [-1.2, 0.2],
    ];
    for (const [t1, t2] of seeds) {
      const known = withAngles(arm2R(), t1, t2);
      const target = eePos(known);
      const start = withAngles(arm2R(), 0, 0);
      const err = ikErrorAfterSolve(start, target);
      expect(err).toBeLessThan(0.008);
    }
  });

  /** Vertical column + elbow + horizontal wrist (similar to app presets). */
  function armColumnElbow(): Joint[] {
    return [
      J('base', 'b'),
      J('revolute', 'waist', {
        d: 0.35,
        a: 0,
        alpha: 0,
        thetaMin: -PI,
        thetaMax: PI,
      }),
      J('elbow', 'el', {
        d: 0.2,
        a: 0.75,
        alpha: -PI / 2,
        theta: 0.15,
        theta2: -0.1,
        thetaMin: -PI,
        thetaMax: PI,
        theta2Min: -PI,
        theta2Max: PI,
      }),
      J('revolute', 'wrist', {
        d: 0,
        a: 0.55,
        alpha: 0,
        thetaMin: -PI,
        thetaMax: PI,
      }),
      J('end-effector', 'ee', { d: 0.12, a: 0, alpha: 0 }),
    ];
  }

  function withColumnElbowPose(
    joints: Joint[],
    waist: number,
    e1: number,
    e2: number,
    wrist: number,
  ): Joint[] {
    return joints.map(j => {
      if (j.id === 'waist') return { ...j, theta: waist };
      if (j.id === 'el') return { ...j, theta: e1, theta2: e2 };
      if (j.id === 'wrist') return { ...j, theta: wrist };
      return j;
    });
  }

  /** Error vs `ikPositionTarget` — same Y floor clamp the solver uses (FK may sit below that plane). */
  it('column + elbow + wrist: round-trip for multiple poses', () => {
    const seeds: [number, number, number, number][] = [
      [0.1, 0.2, -0.15, 0.05],
      [-0.4, 0.5, 0.3, -0.2],
      [0.8, -0.3, 0.4, 0.6],
      [0, 0.6, -0.5, 0],
    ];
    for (const [w, e1, e2, wr] of seeds) {
      const known = withColumnElbowPose(armColumnElbow(), w, e1, e2, wr);
      const target = eePos(known);
      const start = withColumnElbowPose(armColumnElbow(), 0, 0, 0, 0);
      const err = ikErrorAfterSolve(start, target, BP, 320);
      expect(err).toBeLessThan(0.01);
    }
  });

  /** Prismatic extension must participate in IK Jacobian. */
  function armPrismatic(): Joint[] {
    return [
      J('base', 'b'),
      J('revolute', 'r1', { d: 0, a: 0.4, alpha: 0, thetaMin: -PI, thetaMax: PI }),
      J('prismatic', 'p1', {
        theta: 0,
        d: 0.35,
        a: 0,
        alpha: 0,
        dMin: 0.05,
        dMax: 1.2,
      }),
      J('end-effector', 'ee', { d: 0.08, a: 0 }),
    ];
  }

  function withPrism(joints: Joint[], theta: number, d: number): Joint[] {
    return joints.map(j => {
      if (j.id === 'r1') return { ...j, theta };
      if (j.id === 'p1') return { ...j, d };
      return j;
    });
  }

  it('revolute + prismatic: reaches FK-generated targets', () => {
    const seeds: [number, number][] = [
      [0.3, 0.4],
      [-0.5, 0.9],
      [1.0, 0.2],
    ];
    for (const [th, d] of seeds) {
      const known = withPrism(armPrismatic(), th, d);
      const target = eePos(known);
      const start = withPrism(armPrismatic(), 0, 0.35);
      const err = ikErrorAfterSolve(start, target, BP, 320);
      expect(err).toBeLessThan(0.01);
    }
  });
});

describe('IK constraints', () => {
  it('never writes joint values outside min/max over many steps', () => {
    const joints: Joint[] = [
      J('base', 'b'),
      J('revolute', 'r1', {
        d: 0,
        a: 0.9,
        alpha: 0,
        theta: 0,
        thetaMin: -0.2,
        thetaMax: 0.2,
      }),
      J('revolute', 'r2', {
        d: 0,
        a: 0.9,
        alpha: 0,
        theta: 0,
        thetaMin: -0.25,
        thetaMax: 0.25,
      }),
      J('end-effector', 'ee', { d: 0.05, a: 0 }),
    ];
    const target = new Vector3(0.5, 0.4, 0.5);
    const result = solveIK(joints, target, BP, 400, 0.01, 0.06);
    const solved = applyIKResult(joints, result);
    for (const j of solved) {
      if (j.type === 'revolute') {
        expect(j.theta).toBeGreaterThanOrEqual(j.thetaMin - 1e-9);
        expect(j.theta).toBeLessThanOrEqual(j.thetaMax + 1e-9);
      }
      if (j.type === 'prismatic') {
        expect(j.d).toBeGreaterThanOrEqual(j.dMin - 1e-9);
        expect(j.d).toBeLessThanOrEqual(j.dMax + 1e-9);
      }
      if (j.type === 'elbow') {
        expect(j.theta).toBeGreaterThanOrEqual(j.thetaMin - 1e-9);
        expect(j.theta).toBeLessThanOrEqual(j.thetaMax + 1e-9);
        expect(j.theta2).toBeGreaterThanOrEqual(j.theta2Min - 1e-9);
        expect(j.theta2).toBeLessThanOrEqual(j.theta2Max + 1e-9);
      }
    }
  });

  it('produces poses that pass checkConstraints when geometry is mild', () => {
    const joints: Joint[] = [
      J('base', 'b'),
      J('revolute', 'r1', { d: 0.2, a: 0.5, alpha: 0, thetaMin: -PI, thetaMax: PI }),
      J('revolute', 'r2', { d: 0, a: 0.5, alpha: 0, thetaMin: -PI, thetaMax: PI }),
      J('end-effector', 'ee', { d: 0.1, a: 0 }),
    ];
    const known = joints.map(j =>
      j.id === 'r1' ? { ...j, theta: 0.4 } : j.id === 'r2' ? { ...j, theta: -0.2 } : j,
    );
    const target = eePos(known);
    const start = joints.map(j =>
      j.id === 'r1' || j.id === 'r2' ? { ...j, theta: 0 } : j,
    );
    const result = solveIK(start, target, BP, 300, 0.003, 0.05);
    const solved = applyIKResult(start, result);
    const c = checkConstraints(solved, BP);
    expect(c.valid).toBe(true);
  });
});

describe('IK sampling (diagnostic)', () => {
  it('Mulberry-seeded shots explore enough to get well below a bad DLS plateau', () => {
    const arm = (): Joint[] => [
      J('base', 'b'),
      J('revolute', 'waist', {
        d: 0.35,
        a: 0,
        alpha: 0,
        thetaMin: -Math.PI,
        thetaMax: Math.PI,
      }),
      J('elbow', 'el', {
        d: 0.2,
        a: 0.75,
        alpha: -Math.PI / 2,
        thetaMin: -Math.PI,
        thetaMax: Math.PI,
        theta2Min: -Math.PI,
        theta2Max: Math.PI,
      }),
      J('revolute', 'wrist', {
        d: 0,
        a: 0.55,
        alpha: 0,
        thetaMin: -Math.PI,
        thetaMax: Math.PI,
      }),
      J('end-effector', 'ee', { d: 0.12, a: 0, alpha: 0 }),
    ];
    const known = arm().map(j => {
      if (j.id === 'waist') return { ...j, theta: 0.8 };
      if (j.id === 'el') return { ...j, theta: -0.3, theta2: 0.4 };
      if (j.id === 'wrist') return { ...j, theta: 0.6 };
      return j;
    });
    const target = eePos(known);
    const safeT = ikPositionTarget(target);
    const start = arm().map(j => {
      if (j.id === 'waist' || j.id === 'wrist') return { ...j, theta: 0 };
      if (j.id === 'el') return { ...j, theta: 0, theta2: 0 };
      return j;
    });
    let min = Infinity;
    for (let i = 0; i < 12000; i++) {
      const shot = jointsWithSeededPose(start, 50000 + i * 1103);
      const e = safeT.distanceTo(positionFromMatrix(computeFK(shot, BP)));
      min = Math.min(min, e);
    }
    expect(min).toBeLessThan(0.07);
  });
});

describe('IK singular / degenerate cases', () => {
  it('pure yaw column (EE on axis): cannot correct XZ error; reports non-converged for off-axis target', () => {
    const joints: Joint[] = [
      J('base', 'b'),
      J('revolute', 'col', { d: 1, a: 0, alpha: 0, theta: 0, thetaMin: -PI, thetaMax: PI }),
      J('end-effector', 'ee', { d: 0.1, a: 0 }),
    ];
    const offAxis = new Vector3(0.3, 1.1, 0);
    const result = solveIK(joints, offAxis, BP, 120, 0.002, 0.04);
    expect(result.converged).toBe(false);
  });

  it('on-axis target for yaw column: converges in position', () => {
    const joints: Joint[] = [
      J('base', 'b'),
      J('revolute', 'col', { d: 1, a: 0, alpha: 0, theta: 0.7, thetaMin: -PI, thetaMax: PI }),
      J('end-effector', 'ee', { d: 0.1, a: 0 }),
    ];
    const target = eePos(joints);
    const start = joints.map(j => (j.id === 'col' ? { ...j, theta: 0 } : j));
    const err = ikErrorAfterSolve(start, target);
    expect(err).toBeLessThan(0.005);
  });
});
