import { useSandboxStore, PRESET_NAMES } from '../lib/store';
import { exportDHJSON, exportURDFStub, downloadFile } from '../lib/exporters';
import { useState, useRef, useEffect } from 'react';
import { LogoMark, IconSidebar, IconInspector, IconTimeline, IconExport } from './Icons';

function PanelToggle({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={`${active ? 'Hide' : 'Show'} ${label}`}
      style={{
        color: active ? 'var(--text-secondary)' : 'var(--text-faint)',
        background: active ? 'var(--bg-raised)' : 'transparent',
        border: `1px solid ${active ? 'var(--border-default)' : 'transparent'}`,
        padding: '3px 8px',
        fontSize: 10.5,
        fontWeight: 500,
        gap: 4,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function PresetDropdown() {
  const loadPreset = useSandboxStore(s => s.loadPreset);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? 'var(--bg-elevated)' : 'var(--bg-raised)',
          borderColor: open ? 'var(--border-strong)' : 'var(--border-default)',
          fontSize: 11,
          padding: '3px 10px',
        }}
      >
        Presets
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.4 }}>
          <path d="M2 3L4 5.5L6 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          minWidth: 170,
          padding: 3,
          animation: 'fade-slide-in 0.1s ease-out',
        }}>
          {PRESET_NAMES.map(name => (
            <button
              key={name}
              onClick={() => { loadPreset(name); setOpen(false); }}
              style={{
                display: 'flex',
                width: '100%',
                textAlign: 'left',
                padding: '5px 9px',
                fontSize: 11.5,
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--text-secondary)',
                fontWeight: 450,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const joints = useSandboxStore(s => s.joints);
  const leftOpen = useSandboxStore(s => s.leftPanelOpen);
  const rightOpen = useSandboxStore(s => s.rightPanelOpen);
  const bottomOpen = useSandboxStore(s => s.bottomPanelOpen);
  const toggleLeft = useSandboxStore(s => s.toggleLeftPanel);
  const toggleRight = useSandboxStore(s => s.toggleRightPanel);
  const toggleBottom = useSandboxStore(s => s.toggleBottomPanel);

  const jointCount = joints.filter(j => j.type !== 'base').length;
  const dofCount = joints.reduce((n, j) => {
    if (j.type === 'revolute' || j.type === 'prismatic') return n + 1;
    if (j.type === 'elbow') return n + 2;
    return n;
  }, 0);

  const handleExportDH = () => downloadFile(exportDHJSON(joints), 'dh-parameters.json', 'application/json');
  const handleExportURDF = () => downloadFile(exportURDFStub(joints), 'robot_arm.urdf', 'application/xml');

  return (
    <div className="topbar">
      <div className="topbar-logo">
        <LogoMark size={24} />
        <div>
          <div className="topbar-logo-text">Robot Arm Sandbox</div>
          <div className="topbar-logo-subtitle">DH Parameter Editor</div>
        </div>
      </div>

      <PresetDropdown />

      <div className="topbar-divider" />

      <span className="mono" style={{
        fontSize: 10,
        fontWeight: 500,
        color: 'var(--text-faint)',
      }}>
        {jointCount} parts &middot; {dofCount} DOF
      </span>

      <div className="topbar-spacer" />

      <div className="topbar-group">
        <PanelToggle icon={<IconSidebar size={12} />} label="Parts" active={leftOpen} onClick={toggleLeft} />
        <PanelToggle icon={<IconInspector size={12} />} label="Inspector" active={rightOpen} onClick={toggleRight} />
        <PanelToggle icon={<IconTimeline size={12} />} label="Timeline" active={bottomOpen} onClick={toggleBottom} />
      </div>

      <div className="topbar-divider" />

      <div className="topbar-group">
        <button onClick={handleExportDH} className="btn-ghost" style={{ fontSize: 10.5, padding: '3px 8px' }}>
          <IconExport size={11} />
          JSON
        </button>
        <button onClick={handleExportURDF} className="btn-ghost" style={{ fontSize: 10.5, padding: '3px 8px' }}>
          <IconExport size={11} />
          URDF
        </button>
      </div>
    </div>
  );
}
