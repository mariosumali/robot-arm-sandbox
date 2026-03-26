import { Matrix4, Vector3 } from 'three';

export interface DHRow {
  index: number;
  type: string;
  a: number;
  d: number;
  alpha: number;
  theta: number;
  thetaMin: number;
  thetaMax: number;
}

export interface Joint {
  id: string;
  type: 'revolute' | 'prismatic' | 'l-shaped' | 'end-effector' | 'base';
  name: string;
  theta: number;
  d: number;
  a: number;
  alpha: number;
  thetaMin: number;
  thetaMax: number;
  dMin: number;
  dMax: number;
}

/**
 * Build the standard DH 4×4 homogeneous transform:
 * T = Rot_z(θ) · Trans_z(d) · Trans_x(a) · Rot_x(α)
 */
export function dhTransform(theta: number, d: number, a: number, alpha: number): Matrix4 {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  const m = new Matrix4();
  m.set(
    ct, -st * ca,  st * sa, a * ct,
    st,  ct * ca, -ct * sa, a * st,
     0,      sa,       ca,      d,
     0,       0,        0,      1
  );
  return m;
}

export function buildDHTable(joints: Joint[]): DHRow[] {
  return joints
    .filter(j => j.type !== 'base')
    .map((j, i) => ({
      index: i + 1,
      type: j.type,
      a: j.a,
      d: j.d,
      alpha: j.alpha,
      theta: j.theta,
      thetaMin: j.thetaMin,
      thetaMax: j.thetaMax,
    }));
}

/**
 * Compute cumulative transforms for every joint frame.
 * Returns an array of world-space Matrix4 — one per joint (including base).
 */
export function computeAllTransforms(joints: Joint[]): Matrix4[] {
  const transforms: Matrix4[] = [];
  let cumulative = new Matrix4().identity();

  for (const joint of joints) {
    if (joint.type === 'base') {
      transforms.push(cumulative.clone());
      continue;
    }
    const T = dhTransform(joint.theta, joint.d, joint.a, joint.alpha);
    cumulative = cumulative.clone().multiply(T);
    transforms.push(cumulative.clone());
  }
  return transforms;
}

/**
 * Forward kinematics: returns the end-effector world transform.
 */
export function computeFK(joints: Joint[]): Matrix4 {
  const transforms = computeAllTransforms(joints);
  return transforms.length > 0 ? transforms[transforms.length - 1] : new Matrix4().identity();
}

/**
 * Extract the translation (position) from a 4×4 matrix.
 */
export function positionFromMatrix(m: Matrix4): Vector3 {
  const v = new Vector3();
  v.setFromMatrixPosition(m);
  return v;
}

/**
 * Get indices of actuated joints (revolute or prismatic).
 */
function getActuatedIndices(joints: Joint[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < joints.length; i++) {
    if (joints[i].type === 'revolute' || joints[i].type === 'prismatic') {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Compute the 3×n Jacobian numerically via finite differences.
 */
function computeJacobian(joints: Joint[], actuatedIndices: number[], currentPos: Vector3): number[][] {
  const delta = 0.001;
  const n = actuatedIndices.length;
  const J: number[][] = [[], [], []];

  for (let col = 0; col < n; col++) {
    const idx = actuatedIndices[col];
    const joint = joints[idx];

    let originalVal: number;
    if (joint.type === 'revolute') {
      originalVal = joint.theta;
      joints[idx] = { ...joint, theta: originalVal + delta };
    } else {
      originalVal = joint.d;
      joints[idx] = { ...joint, d: originalVal + delta };
    }

    const perturbedPos = positionFromMatrix(computeFK(joints));

    if (joint.type === 'revolute') {
      joints[idx] = { ...joint, theta: originalVal };
    } else {
      joints[idx] = { ...joint, d: originalVal };
    }

    J[0][col] = (perturbedPos.x - currentPos.x) / delta;
    J[1][col] = (perturbedPos.y - currentPos.y) / delta;
    J[2][col] = (perturbedPos.z - currentPos.z) / delta;
  }

  return J;
}

/**
 * Multiply a 3×n matrix by its transpose → 3×3.
 */
function matMulJJT(J: number[][], n: number): number[][] {
  const result: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += J[i][k] * J[j][k];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

/**
 * Invert a 3×3 matrix. Returns null if singular.
 */
function invert3x3(m: number[][]): number[][] | null {
  const [a, b, c] = [m[0][0], m[0][1], m[0][2]];
  const [d, e, f] = [m[1][0], m[1][1], m[1][2]];
  const [g, h, i] = [m[2][0], m[2][1], m[2][2]];

  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

/**
 * Compute damped pseudoinverse: J† = Jᵀ · (J·Jᵀ + λ²I)⁻¹
 * Returns n×3 matrix.
 */
function dampedPseudoinverse(J: number[][], n: number, lambda: number): number[][] | null {
  const JJT = matMulJJT(J, n);
  const l2 = lambda * lambda;
  JJT[0][0] += l2;
  JJT[1][1] += l2;
  JJT[2][2] += l2;

  const inv = invert3x3(JJT);
  if (!inv) return null;

  // Jᵀ · inv → n×3
  const result: number[][] = [];
  for (let i = 0; i < n; i++) {
    result[i] = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += J[k][i] * inv[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

export interface IKResult {
  angles: number[];
  converged: boolean;
  iterations: number;
}

/**
 * Solve position-only IK using the damped Jacobian pseudoinverse method.
 */
export function solveIK(
  joints: Joint[],
  target: Vector3,
  maxIter = 100,
  tolerance = 0.001,
  lambda = 0.01
): IKResult {
  const workingJoints = joints.map(j => ({ ...j }));
  const actuatedIndices = getActuatedIndices(workingJoints);

  if (actuatedIndices.length === 0) {
    return { angles: [], converged: false, iterations: 0 };
  }

  let iterations = 0;
  let converged = false;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;
    const currentPos = positionFromMatrix(computeFK(workingJoints));
    const error = new Vector3().subVectors(target, currentPos);
    const errMag = error.length();

    if (errMag < tolerance) {
      converged = true;
      break;
    }

    const J = computeJacobian(workingJoints, actuatedIndices, currentPos);
    const Jpinv = dampedPseudoinverse(J, actuatedIndices.length, lambda);
    if (!Jpinv) break;

    const e = [error.x, error.y, error.z];

    for (let i = 0; i < actuatedIndices.length; i++) {
      const idx = actuatedIndices[i];
      let dq = 0;
      for (let k = 0; k < 3; k++) {
        dq += Jpinv[i][k] * e[k];
      }

      const joint = workingJoints[idx];
      if (joint.type === 'revolute') {
        let newTheta = joint.theta + dq;
        newTheta = Math.max(joint.thetaMin, Math.min(joint.thetaMax, newTheta));
        workingJoints[idx] = { ...joint, theta: newTheta };
      } else if (joint.type === 'prismatic') {
        let newD = joint.d + dq;
        newD = Math.max(joint.dMin, Math.min(joint.dMax, newD));
        workingJoints[idx] = { ...joint, d: newD };
      }
    }
  }

  const angles = actuatedIndices.map(idx => {
    const j = workingJoints[idx];
    return j.type === 'revolute' ? j.theta : j.d;
  });

  return { angles, converged, iterations };
}
