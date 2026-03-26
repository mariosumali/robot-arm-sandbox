import { useState } from 'react';
import { useSandboxStore } from '../lib/store';
import { FRIENDLY_NAMES, FRIENDLY_DESC, JOINT_COLORS } from '../lib/jointDefaults';
import { JOINT_TYPE_ICONS, IconChevron } from './Icons';
import type { Joint } from '../lib/kinematics';

const DRAGGABLE_TYPES: Joint['type'][] = ['revolute', 'prismatic', 'elbow', 'end-effector'];

function Section({ title, badge, defaultOpen = true, children }: {
  title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel-section">
      <div className="panel-section-header" onClick={() => setOpen(!open)}>
        <IconChevron
          size={10}
          color="var(--text-faint)"
          className={`panel-section-chevron ${open ? 'open' : ''}`}
        />
        {title}
        {badge && (
          <span className="panel-section-badge" style={{
            background: 'var(--bg-raised)',
            color: 'var(--text-muted)',
          }}>{badge}</span>
        )}
      </div>
      {open && <div className="panel-section-body">{children}</div>}
    </div>
  );
}

function ArmChainPreview() {
  const joints = useSandboxStore(s => s.joints);
  const selectedId = useSandboxStore(s => s.selectedJointId);
  const selectJoint = useSandboxStore(s => s.selectJoint);

  if (joints.length <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', padding: '2px 0' }}>
      {joints.map((j, i) => {
        const color = JOINT_COLORS[j.type];
        const isSelected = j.id === selectedId;
        const Icon = JOINT_TYPE_ICONS[j.type];
        return (
          <div key={j.id} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => selectJoint(j.id)}
              title={j.name}
              style={{
                width: 24,
                height: 24,
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSelected ? '#fff' : color,
                background: isSelected ? color : 'var(--bg-raised)',
                border: `1px solid ${isSelected ? color : 'var(--border-default)'}`,
                cursor: 'pointer',
                padding: 0,
                transition: 'all 100ms ease',
              }}
            >
              {Icon ? <Icon size={13} color={isSelected ? '#fff' : color} /> : null}
            </button>
            {i < joints.length - 1 && (
              <div style={{
                width: 8,
                height: 1,
                background: 'var(--border-strong)',
                borderRadius: 1,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LeftPanel() {
  const addJoint = useSandboxStore(s => s.addJoint);
  const joints = useSandboxStore(s => s.joints);

  return (
    <div className="panel panel-left">
      <Section title="Chain" badge={`${joints.length}`}>
        <ArmChainPreview />
        {joints.length <= 1 && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-faint)',
            textAlign: 'center',
            padding: '6px 0',
            lineHeight: 1.5,
          }}>
            Load a preset or add parts below
          </div>
        )}
      </Section>

      <Section title="Add Part">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {DRAGGABLE_TYPES.map(type => {
            const color = JOINT_COLORS[type];
            const Icon = JOINT_TYPE_ICONS[type];
            return (
              <div
                key={type}
                className="joint-card"
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/joint-type', type);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => addJoint(type)}
              >
                <div className="joint-card-icon" style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border-default)',
                }}>
                  {Icon && <Icon size={15} color={color} />}
                </div>
                <div className="joint-card-info">
                  <div className="joint-card-name">{FRIENDLY_NAMES[type]}</div>
                  <div className="joint-card-desc">{FRIENDLY_DESC[type]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div style={{ marginTop: 'auto', padding: '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', lineHeight: 1.7, letterSpacing: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Shortcuts</div>
          <div><kbd style={kbdStyle}>Del</kbd> Remove selected</div>
          <div><kbd style={kbdStyle}>⌘Z</kbd> Undo</div>
          <div><kbd style={kbdStyle}>Shift+click</kbd> Add waypoint</div>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  fontWeight: 500,
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-default)',
  borderRadius: 3,
  padding: '0px 4px',
  marginRight: 4,
  lineHeight: '16px',
  verticalAlign: 'middle',
  color: 'var(--text-muted)',
};
