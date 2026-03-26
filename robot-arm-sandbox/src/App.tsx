import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { Viewport } from './components/Viewport';
import { RightPanel } from './components/RightPanel';
import { BottomPanel } from './components/BottomPanel';
import { useIK } from './hooks/useIK';
import { useSimulation } from './hooks/useSimulation';
import { useSandboxStore } from './lib/store';

function KeyboardShortcuts() {
  const selectedId = useSandboxStore(s => s.selectedJointId);
  const joints = useSandboxStore(s => s.joints);
  const removeJoint = useSandboxStore(s => s.removeJoint);
  const undo = useSandboxStore(s => s.undo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        if (selectedId) {
          const joint = joints.find(j => j.id === selectedId);
          if (joint && joint.type !== 'base') removeJoint(selectedId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, joints, removeJoint, undo]);

  return null;
}

export default function App() {
  useIK();
  useSimulation();

  const leftOpen = useSandboxStore(s => s.leftPanelOpen);
  const rightOpen = useSandboxStore(s => s.rightPanelOpen);
  const bottomOpen = useSandboxStore(s => s.bottomPanelOpen);

  const layoutClasses = [
    'app-layout',
    !leftOpen && 'left-collapsed',
    !rightOpen && 'right-collapsed',
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClasses}>
      <KeyboardShortcuts />
      <TopBar />
      {leftOpen && <LeftPanel />}
      <Viewport />
      {rightOpen && <RightPanel />}
      {bottomOpen && <BottomPanel />}
    </div>
  );
}
