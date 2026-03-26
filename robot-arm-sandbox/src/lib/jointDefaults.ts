import type { Joint } from './kinematics';

const DEG = Math.PI / 180;

type JointType = Joint['type'];

const defaults: Record<JointType, Omit<Joint, 'id' | 'name'>> = {
  base: {
    type: 'base',
    theta: 0,
    d: 0,
    a: 0,
    alpha: 0,
    thetaMin: 0,
    thetaMax: 0,
    dMin: 0,
    dMax: 0,
  },
  revolute: {
    type: 'revolute',
    theta: 0,
    d: 0.3,
    a: 0.5,
    alpha: 0,
    thetaMin: -180 * DEG,
    thetaMax: 180 * DEG,
    dMin: 0,
    dMax: 0,
  },
  prismatic: {
    type: 'prismatic',
    theta: 0,
    d: 0.2,
    a: 0,
    alpha: 0,
    thetaMin: 0,
    thetaMax: 0,
    dMin: 0.1,
    dMax: 1.0,
  },
  'l-shaped': {
    type: 'l-shaped',
    theta: 0,
    d: 0.3,
    a: 0.4,
    alpha: 90 * DEG,
    thetaMin: -180 * DEG,
    thetaMax: 180 * DEG,
    dMin: 0,
    dMax: 0,
  },
  'end-effector': {
    type: 'end-effector',
    theta: 0,
    d: 0.15,
    a: 0,
    alpha: 0,
    thetaMin: 0,
    thetaMax: 0,
    dMin: 0,
    dMax: 0,
  },
};

export function getJointDefaults(type: JointType): Omit<Joint, 'id' | 'name'> {
  return { ...defaults[type] };
}

export function getJointLabel(type: JointType): string {
  switch (type) {
    case 'base': return 'Base Mount';
    case 'revolute': return 'Revolute Joint';
    case 'prismatic': return 'Telescoping Joint';
    case 'l-shaped': return 'L-Shaped Joint';
    case 'end-effector': return 'End Effector';
  }
}

export function getJointDescription(type: JointType): string {
  switch (type) {
    case 'base': return 'Fixed to world origin';
    case 'revolute': return 'Rotates around local Z axis';
    case 'prismatic': return 'Extends/retracts along Z';
    case 'l-shaped': return 'Rigid 90° offset link';
    case 'end-effector': return 'Terminal piece, no DOF';
  }
}
