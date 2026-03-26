import { useMemo } from 'react';
import { Vector3 } from 'three';
import { Line } from '@react-three/drei';
import { useSandboxStore } from '../lib/store';

function EETrail() {
  const eeTrace = useSandboxStore(s => s.eeTrace);
  const showTrace = useSandboxStore(s => s.showTrace);

  const points = useMemo(() => {
    if (!showTrace || eeTrace.length < 2) return null;
    return eeTrace.map(p => new Vector3(p[0], p[1], p[2]));
  }, [eeTrace, showTrace]);

  if (!points) return null;

  return (
    <Line
      points={points}
      color="#34d399"
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  );
}

function WaypointPathLine() {
  const waypointEEPath = useSandboxStore(s => s.waypointEEPath);
  const showPathLine = useSandboxStore(s => s.showPathLine);

  const points = useMemo(() => {
    if (!showPathLine || !waypointEEPath || waypointEEPath.length < 2) return null;
    return waypointEEPath.map(p => new Vector3(p[0], p[1], p[2]));
  }, [waypointEEPath, showPathLine]);

  if (!points) return null;

  return (
    <>
      <Line
        points={points}
        color="#ffaa00"
        lineWidth={2.5}
        transparent
        opacity={0.7}
        dashed
        dashSize={0.05}
        gapSize={0.03}
      />
      {points.map((p, i) => (
        <mesh key={`dot-${i}`} position={p}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
}

export function PathVisualization() {
  return (
    <group>
      <EETrail />
      <WaypointPathLine />
    </group>
  );
}
