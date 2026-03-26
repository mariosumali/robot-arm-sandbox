import { useSandboxStore, getEEPosition } from '../lib/store';
import type { JointAnalytics } from '../lib/store';

const DEG = 180 / Math.PI;

const TYPE_COLORS: Record<string, string> = {
  base: '#7888a0',
  revolute: '#4a9fd4',
  prismatic: '#9b7bf0',
  elbow: '#e8943e',
  'end-effector': '#e85555',
};

function JointRow({ data }: { data: JointAnalytics }) {
  const color = TYPE_COLORS[data.type] || '#888';

  return (
    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <td style={{ color, fontWeight: 600, fontSize: 10, padding: '3px 6px', whiteSpace: 'nowrap' }}>
        {data.name}
      </td>
      <td style={{ fontSize: 10, padding: '3px 4px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        {data.type === 'revolute' || data.type === 'elbow'
          ? `${(data.theta * DEG).toFixed(1)}\u00B0`
          : data.type === 'prismatic'
          ? `d=${data.d?.toFixed(3)}`
          : '\u2014'}
      </td>
      {data.type === 'elbow' && data.theta2 !== undefined ? (
        <td style={{ fontSize: 10, padding: '3px 4px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {(data.theta2 * DEG).toFixed(1)}\u00B0
        </td>
      ) : (
        <td style={{ fontSize: 10, padding: '3px 4px', color: 'var(--text-faint)' }}>\u2014</td>
      )}
      <td style={{ fontSize: 9, padding: '3px 4px', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>
        ({data.worldPos[0].toFixed(2)}, {data.worldPos[1].toFixed(2)}, {data.worldPos[2].toFixed(2)})
      </td>
      <td style={{ fontSize: 10, padding: '3px 4px', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', textAlign: 'right' }}>
        {data.distToNext > 0 ? data.distToNext.toFixed(3) : '\u2014'}
      </td>
    </tr>
  );
}

export function AnalyticsOverlay() {
  const showAnalytics = useSandboxStore(s => s.showAnalytics);
  const getAnalytics = useSandboxStore(s => s.getAnalytics);
  const joints = useSandboxStore(s => s.joints);
  const basePosition = useSandboxStore(s => s.basePosition);
  const ikTarget = useSandboxStore(s => s.ikTarget);

  if (!showAnalytics) return null;

  const data = getAnalytics();
  const eePos = getEEPosition(joints, basePosition);
  const distToTarget = eePos.distanceTo(ikTarget);

  return (
    <div style={{
      position: 'absolute',
      bottom: 12,
      left: 12,
      background: 'rgba(17,24,32,0.94)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: 10,
      backdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 10,
      maxHeight: 260,
      overflowY: 'auto',
      minWidth: 340,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-faint)', marginBottom: 6,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Joint Analytics</span>
        <span className={distToTarget < 0.01 ? 'text-emerald' : distToTarget < 0.1 ? 'text-amber' : 'text-rose'}>
          EE\u2192Target: {distToTarget.toFixed(3)}
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
            <th style={{ fontSize: 9, color: 'var(--text-faint)', textAlign: 'left', padding: '2px 6px', fontWeight: 500 }}>Joint</th>
            <th style={{ fontSize: 9, color: 'var(--text-faint)', textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>\u03B8\u2081</th>
            <th style={{ fontSize: 9, color: 'var(--text-faint)', textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>\u03B8\u2082</th>
            <th style={{ fontSize: 9, color: 'var(--text-faint)', textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>World Pos</th>
            <th style={{ fontSize: 9, color: 'var(--text-faint)', textAlign: 'right', padding: '2px 4px', fontWeight: 500 }}>Link</th>
          </tr>
        </thead>
        <tbody>
          {data.map(d => <JointRow key={d.id} data={d} />)}
        </tbody>
      </table>

      <div style={{
        marginTop: 6, display: 'flex', gap: 12,
        fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)',
      }}>
        <span>EE: ({eePos.x.toFixed(3)}, {eePos.y.toFixed(3)}, {eePos.z.toFixed(3)})</span>
        <span>Target: ({ikTarget.x.toFixed(2)}, {ikTarget.y.toFixed(2)}, {ikTarget.z.toFixed(2)})</span>
      </div>
    </div>
  );
}
