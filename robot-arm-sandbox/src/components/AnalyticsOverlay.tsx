import { useSandboxStore, getEEPosition } from '../lib/store';
import type { JointAnalytics } from '../lib/store';

const DEG = 180 / Math.PI;

function JointRow({ data }: { data: JointAnalytics }) {
  const typeColors: Record<string, string> = {
    base: '#7888a0',
    revolute: '#4a9fd4',
    prismatic: '#9b7bf0',
    elbow: '#e8943e',
    'end-effector': '#e85555',
  };
  const color = typeColors[data.type] || '#888';

  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td style={{ color, fontWeight: 600, fontSize: '10px', padding: '3px 6px', whiteSpace: 'nowrap' }}>
        {data.name}
      </td>
      <td style={{ fontSize: '10px', padding: '3px 4px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        {data.type === 'revolute' || data.type === 'elbow'
          ? `${(data.theta * DEG).toFixed(1)}°`
          : data.type === 'prismatic'
          ? `d=${data.d?.toFixed(3)}`
          : '—'}
      </td>
      {data.type === 'elbow' && data.theta2 !== undefined ? (
        <td style={{ fontSize: '10px', padding: '3px 4px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {(data.theta2 * DEG).toFixed(1)}°
        </td>
      ) : (
        <td style={{ fontSize: '10px', padding: '3px 4px', color: 'var(--text-dim)' }}>—</td>
      )}
      <td style={{ fontSize: '9px', padding: '3px 4px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
        ({data.worldPos[0].toFixed(2)}, {data.worldPos[1].toFixed(2)}, {data.worldPos[2].toFixed(2)})
      </td>
      <td style={{ fontSize: '10px', padding: '3px 4px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textAlign: 'right' }}>
        {data.distToNext > 0 ? data.distToNext.toFixed(3) : '—'}
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
      bottom: '12px',
      left: '12px',
      background: 'rgba(10,12,16,0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '8px',
      backdropFilter: 'blur(12px)',
      zIndex: 10,
      maxHeight: '260px',
      overflowY: 'auto',
      minWidth: '340px',
    }}>
      <div style={{
        fontSize: '9px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-dim)',
        marginBottom: '6px',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>Joint Analytics</span>
        <span style={{ color: distToTarget < 0.01 ? '#00ff88' : distToTarget < 0.1 ? '#ffaa00' : '#ff6666' }}>
          EE→Target: {distToTarget.toFixed(3)}
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <th style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'left', padding: '2px 6px', fontWeight: 500 }}>Joint</th>
            <th style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>θ₁</th>
            <th style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>θ₂</th>
            <th style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'left', padding: '2px 4px', fontWeight: 500 }}>World Pos</th>
            <th style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'right', padding: '2px 4px', fontWeight: 500 }}>Link</th>
          </tr>
        </thead>
        <tbody>
          {data.map(d => <JointRow key={d.id} data={d} />)}
        </tbody>
      </table>

      <div style={{
        marginTop: '6px',
        display: 'flex',
        gap: '12px',
        fontSize: '9px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)',
      }}>
        <span>EE: ({eePos.x.toFixed(3)}, {eePos.y.toFixed(3)}, {eePos.z.toFixed(3)})</span>
        <span>Target: ({ikTarget.x.toFixed(2)}, {ikTarget.y.toFixed(2)}, {ikTarget.z.toFixed(2)})</span>
      </div>
    </div>
  );
}
