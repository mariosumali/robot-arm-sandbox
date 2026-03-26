import { create } from 'zustand';
import { Vector3 } from 'three';
import { v4 as uuid } from 'uuid';
import type { Joint } from './kinematics';
import { solveIK as solveIKFn, computeFK, positionFromMatrix } from './kinematics';
import { getJointDefaults } from './jointDefaults';

export interface Keyframe {
  time: number;
  angles: Record<string, number>;
}

export interface SandboxStore {
  joints: Joint[];
  selectedJointId: string | null;
  ikTarget: Vector3;
  ikResult: { converged: boolean; iterations: number } | null;
  simulationState: 'idle' | 'playing' | 'recording';
  keyframes: Keyframe[];
  playbackTime: number;

  addJoint: (type: Joint['type']) => void;
  removeJoint: (id: string) => void;
  updateJoint: (id: string, patch: Partial<Joint>) => void;
  reorderJoint: (id: string, direction: 'up' | 'down') => void;
  selectJoint: (id: string | null) => void;
  setIKTarget: (pos: Vector3) => void;
  solveIK: () => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  recordKeyframe: () => void;
  setPlaybackTime: (t: number) => void;
}

function nameForIndex(type: Joint['type'], joints: Joint[]): string {
  if (type === 'base') return 'Base';
  if (type === 'end-effector') return 'End Effector';
  const count = joints.filter(j => j.type !== 'base' && j.type !== 'end-effector').length;
  return `Joint ${count + 1}`;
}

export const useSandboxStore = create<SandboxStore>((set, get) => ({
  joints: [
    {
      id: uuid(),
      ...getJointDefaults('base'),
      name: 'Base',
    },
  ],
  selectedJointId: null,
  ikTarget: new Vector3(1, 1, 0),
  ikResult: null,
  simulationState: 'idle',
  keyframes: [],
  playbackTime: 0,

  addJoint: (type) => {
    const { joints } = get();
    const newJoint: Joint = {
      id: uuid(),
      ...getJointDefaults(type),
      name: nameForIndex(type, joints),
    };
    set({ joints: [...joints, newJoint] });
  },

  removeJoint: (id) => {
    const { joints, selectedJointId } = get();
    const joint = joints.find(j => j.id === id);
    if (!joint || joint.type === 'base') return;
    const next = joints.filter(j => j.id !== id);
    set({
      joints: next,
      selectedJointId: selectedJointId === id ? null : selectedJointId,
    });
  },

  updateJoint: (id, patch) => {
    set({
      joints: get().joints.map(j => (j.id === id ? { ...j, ...patch } : j)),
    });
  },

  reorderJoint: (id, direction) => {
    const { joints } = get();
    const idx = joints.findIndex(j => j.id === id);
    if (idx < 0) return;
    if (joints[idx].type === 'base') return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 1 || targetIdx >= joints.length) return;
    if (joints[targetIdx].type === 'base') return;

    const next = [...joints];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    set({ joints: next });
  },

  selectJoint: (id) => set({ selectedJointId: id }),

  setIKTarget: (pos) => set({ ikTarget: pos.clone() }),

  solveIK: () => {
    const { joints, ikTarget } = get();
    const result = solveIKFn(joints, ikTarget);

    if (result.angles.length > 0) {
      const actuated = joints.filter(j => j.type === 'revolute' || j.type === 'prismatic');
      const updated = joints.map(j => {
        const aIdx = actuated.indexOf(j);
        if (aIdx < 0) return j;
        if (j.type === 'revolute') return { ...j, theta: result.angles[aIdx] };
        if (j.type === 'prismatic') return { ...j, d: result.angles[aIdx] };
        return j;
      });
      set({
        joints: updated,
        ikResult: { converged: result.converged, iterations: result.iterations },
      });
    } else {
      set({
        ikResult: { converged: false, iterations: 0 },
      });
    }
  },

  startSimulation: () => set({ simulationState: 'playing', playbackTime: 0 }),

  stopSimulation: () => set({ simulationState: 'idle', playbackTime: 0 }),

  recordKeyframe: () => {
    const { joints, keyframes } = get();
    const time = keyframes.length > 0
      ? keyframes[keyframes.length - 1].time + 1
      : 0;
    const angles: Record<string, number> = {};
    for (const j of joints) {
      if (j.type === 'revolute') angles[j.id] = j.theta;
      else if (j.type === 'prismatic') angles[j.id] = j.d;
    }
    set({
      keyframes: [...keyframes, { time, angles }],
      simulationState: 'recording',
    });
  },

  setPlaybackTime: (t) => set({ playbackTime: t }),
}));

export function getEEPosition(joints: Joint[]): Vector3 {
  return positionFromMatrix(computeFK(joints));
}
