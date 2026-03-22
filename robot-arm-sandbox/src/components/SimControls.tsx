import { useSandboxStore } from '../lib/store';

export function SimControls() {
  const animState = useSandboxStore(s => s.animState);
  const ikResult = useSandboxStore(s => s.ikResult);
  const solveAndAnimate = useSandboxStore(s => s.solveAndAnimate);
  const solveIK = useSandboxStore(s => s.solveIK);
  const play = useSandboxStore(s => s.play);
  const stop = useSandboxStore(s => s.stop);
  const resetPose = useSandboxStore(s => s.resetPose);
  const animEndPose = useSandboxStore(s => s.animEndPose);
  const joints = useSandboxStore(s => s.joints);

  const waypoints = useSandboxStore(s => s.waypoints);
  const pathAnimState = useSandboxStore(s => s.pathAnimState);
  const solveWaypointPath = useSandboxStore(s => s.solveWaypointPath);
  const playPath = useSandboxStore(s => s.playPath);
  const pausePath = useSandboxStore(s => s.pausePath);
  const stopPath = useSandboxStore(s => s.stopPath);

  const animSpeed = useSandboxStore(s => s.animSpeed);
  const setAnimSpeed = useSandboxStore(s => s.setAnimSpeed);
  const animLoop = useSandboxStore(s => s.animLoop);
  const toggleAnimLoop = useSandboxStore(s => s.toggleAnimLoop);

  const showTrace = useSandboxStore(s => s.showTrace);
  const toggleTrace = useSandboxStore(s => s.toggleTrace);
  const clearTrace = useSandboxStore(s => s.clearTrace);
  const showAnalytics = useSandboxStore(s => s.showAnalytics);
  const toggleAnalytics = useSandboxStore(s => s.toggleAnalytics);
  const showPathLine = useSandboxStore(s => s.showPathLine);
  const togglePathLine = useSandboxStore(s => s.togglePathLine);

  const hasDOF = joints.some(j => j.type === 'revolute' || j.type === 'prismatic' || j.type === 'elbow');
  const hasWaypoints = waypoints.length > 0;
  const isAnyPlaying = animState === 'playing' || pathAnimState === 'playing';

  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '3px 8px', fontSize: '9px', fontWeight: 600,
    background: active ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: '4px',
    color: active ? '#00e5ff' : 'var(--text-dim)',
    cursor: 'pointer',
    lineHeight: '1.2',
  });

  return (
    <div style={{
      position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
      zIndex: 10,
    }}>
      {/* Primary actions */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px',
        background: 'rgba(10,12,16,0.92)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        backdropFilter: 'blur(12px)',
      }}>
        <button
          onClick={solveAndAnimate}
          disabled={!hasDOF || isAnyPlaying}
          style={{
            padding: '6px 16px', fontSize: '12px', fontWeight: 600,
            background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.5)',
            borderRadius: '6px', color: '#00e5ff',
            cursor: hasDOF && !isAnyPlaying ? 'pointer' : 'default',
            opacity: hasDOF && !isAnyPlaying ? 1 : 0.4,
          }}
        >
          Solve & Animate
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />

        <button
          onClick={solveIK}
          disabled={!hasDOF || isAnyPlaying}
          title="Solve instantly"
          style={{
            padding: '6px 12px', fontSize: '11px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px', color: 'var(--text-secondary)',
            cursor: hasDOF && !isAnyPlaying ? 'pointer' : 'default',
            opacity: hasDOF && !isAnyPlaying ? 1 : 0.4,
          }}
        >
          Instant Solve
        </button>

        {hasWaypoints && (
          <>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />
            {pathAnimState === 'idle' ? (
              <>
                <button
                  onClick={() => { solveWaypointPath(); }}
                  disabled={!hasDOF}
                  style={{
                    padding: '6px 12px', fontSize: '11px',
                    background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.3)',
                    borderRadius: '6px', color: '#ffaa00', cursor: 'pointer',
                  }}
                >
                  Solve Path
                </button>
                <button
                  onClick={playPath}
                  disabled={!hasDOF}
                  style={{
                    padding: '6px 12px', fontSize: '11px',
                    background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)',
                    borderRadius: '6px', color: '#00ff88', cursor: 'pointer',
                  }}
                >
                  Play Path
                </button>
              </>
            ) : pathAnimState === 'playing' ? (
              <>
                <button onClick={pausePath} style={{
                  padding: '6px 12px', fontSize: '11px',
                  background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.3)',
                  borderRadius: '6px', color: '#ffaa00', cursor: 'pointer',
                }}>Pause</button>
                <button onClick={stopPath} style={{
                  padding: '6px 12px', fontSize: '11px',
                  background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)',
                  borderRadius: '6px', color: '#ff6666', cursor: 'pointer',
                }}>Stop</button>
              </>
            ) : (
              <>
                <button onClick={playPath} style={{
                  padding: '6px 12px', fontSize: '11px',
                  background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)',
                  borderRadius: '6px', color: '#00ff88', cursor: 'pointer',
                }}>Resume</button>
                <button onClick={stopPath} style={{
                  padding: '6px 12px', fontSize: '11px',
                  background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)',
                  borderRadius: '6px', color: '#ff6666', cursor: 'pointer',
                }}>Stop</button>
              </>
            )}
          </>
        )}

        {animEndPose && animState !== 'playing' && pathAnimState !== 'playing' && (
          <>
            <button onClick={play} style={{
              padding: '6px 12px', fontSize: '11px',
              background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)',
              borderRadius: '6px', color: '#00ff88', cursor: 'pointer',
            }}>Replay</button>
            <button onClick={resetPose} style={{
              padding: '6px 12px', fontSize: '11px',
              background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)',
              borderRadius: '6px', color: '#ff6666', cursor: 'pointer',
            }}>Reset</button>
          </>
        )}

        {animState === 'playing' && (
          <button onClick={stop} style={{
            padding: '6px 12px', fontSize: '11px',
            background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)',
            borderRadius: '6px', color: '#ff6666', cursor: 'pointer',
          }}>Stop</button>
        )}

        {ikResult && (
          <span style={{
            fontSize: '10px', fontFamily: 'var(--font-mono)',
            color: ikResult.converged ? '#00ff88' : '#ff6666',
            padding: '0 4px',
          }}>
            {ikResult.converged ? `Solved (${ikResult.iterations})` : 'No solution'}
          </span>
        )}
      </div>

      {/* Secondary controls row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '4px 8px',
        background: 'rgba(10,12,16,0.85)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginRight: '2px' }}>Speed</span>
        <input
          type="range" min={0.1} max={4} step={0.1} value={animSpeed}
          onChange={e => setAnimSpeed(Number(e.target.value))}
          style={{ width: '60px', height: '3px' }}
        />
        <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: '28px' }}>
          {animSpeed.toFixed(1)}x
        </span>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

        <button onClick={toggleAnimLoop} style={pillBtn(animLoop)} title="Loop animation">
          Loop {animLoop ? 'ON' : 'OFF'}
        </button>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.06)', margin: '0 2px' }} />

        <button onClick={toggleTrace} style={pillBtn(showTrace)} title="Show EE trail">
          Trail
        </button>
        {showTrace && (
          <button onClick={clearTrace} style={{
            ...pillBtn(false), color: 'var(--text-dim)', fontSize: '8px', padding: '2px 5px',
          }} title="Clear trail">
            Clear
          </button>
        )}

        <button onClick={togglePathLine} style={pillBtn(showPathLine)} title="Show solved path">
          Path
        </button>

        <button onClick={toggleAnalytics} style={pillBtn(showAnalytics)} title="Show joint analytics">
          Analytics
        </button>
      </div>
    </div>
  );
}
