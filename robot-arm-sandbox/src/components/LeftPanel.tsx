import { useSandboxStore, PRESET_NAMES } from '../lib/store';
import { FRIENDLY_NAMES, FRIENDLY_DESC, JOINT_ICONS, JOINT_COLORS } from '../lib/jointDefaults';
import type { Joint } from '../lib/kinematics';

const DRAGGABLE_TYPES: Joint['type'][] = ['revolute', 'prismatic', 'elbow', 'end-effector'];

export function LeftPanel() {
  const loadPreset = useSandboxStore(s => s.loadPreset);
  const addJoint = useSandboxStore(s => s.addJoint);

  return (
    <div className="panel panel-left">
      <div className="panel-header">Presets</div>
      <div className="panel-body" style={{ borderBottom: '1px solid var(--border-panel)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {PRESET_NAMES.map(name => (
            <button key={name} onClick={() => loadPreset(name)} style={{ textAlign: 'left', fontSize: 12 }}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-header">Joint Palette</div>
      <div className="panel-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DRAGGABLE_TYPES.map(type => (
            <div
              key={type}
              draggable
              onDragStart={e => { e.dataTransfer.setData('application/joint-type', type); e.dataTransfer.effectAllowed = 'copy'; }}
              onClick={() => addJoint(type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                border: `1px solid ${JOINT_COLORS[type]}33`,
                background: `${JOINT_COLORS[type]}0a`,
                cursor: 'grab', userSelect: 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${JOINT_COLORS[type]}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = `${JOINT_COLORS[type]}0a`; }}
            >
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', color: JOINT_COLORS[type] }}>{JOINT_ICONS[type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{FRIENDLY_NAMES[type]}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{FRIENDLY_DESC[type]}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.4 }}>
          Click to add or drag onto viewport
        </div>
      </div>
    </div>
  );
}
