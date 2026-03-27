import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Line, Environment } from '@react-three/drei';
import { Vector3, Mesh, Plane, Raycaster, Vector2, Quaternion } from 'three';
import { useSandboxStore } from '../lib/store';
import { computeAllTransforms, FLOOR_Y, checkFloorViolation, checkSelfCollision } from '../lib/kinematics';
import { setViewportRefs } from '../lib/viewportRef';
import { JointMesh } from './JointMesh';
import { AllSnapConnectors } from './SnapConnector';
import { SimControls } from './SimControls';
import { WaypointMarkers } from './WaypointMarkers';
import { PathVisualization } from './PathVisualization';
import { AnalyticsOverlay } from './AnalyticsOverlay';

function SceneBridge() {
  const { camera, gl } = useThree();
  useEffect(() => { setViewportRefs(camera, gl.domElement); }, [camera, gl]);
  return null;
}

/** Stable framing for README GIF / ?demo=readme (runs before first paint). */
function ReadmeDemoCameraRig() {
  const readmeDemo = useSandboxStore(s => s.readmeDemo);
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (!readmeDemo) return;
    camera.position.set(3.55, 2.75, 3.95);
    camera.lookAt(0, 0.52, 0);
    camera.updateProjectionMatrix();
  }, [readmeDemo, camera]);
  return null;
}

function IKTargetSphere() {
  const meshRef = useRef<Mesh>(null);
  const ikTarget = useSandboxStore(s => s.ikTarget);
  const setIKTarget = useSandboxStore(s => s.setIKTarget);
  const isDragging = useRef(false);
  const dragPlane = useRef(new Plane());
  const dragOffset = useRef(new Vector3());
  const { camera, gl } = useThree();

  const getNDC = useCallback((e: PointerEvent): Vector2 => {
    const r = gl.domElement.getBoundingClientRect();
    return new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }, [gl]);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation(); isDragging.current = true; gl.domElement.style.cursor = 'grabbing';
    const wp = new Vector3(ikTarget.x, ikTarget.y, ikTarget.z), cd = new Vector3();
    camera.getWorldDirection(cd); dragPlane.current.setFromNormalAndCoplanarPoint(cd, wp);
    const ndc = getNDC(e), rc = new Raycaster(); rc.setFromCamera(ndc, camera);
    const hp = new Vector3(); rc.ray.intersectPlane(dragPlane.current, hp);
    dragOffset.current.subVectors(wp, hp); gl.domElement.setPointerCapture(e.pointerId);
  }, [gl, camera, ikTarget, getNDC]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging.current) return; e.stopPropagation();
    const ndc = getNDC(e), rc = new Raycaster(); rc.setFromCamera(ndc, camera);
    const hp = new Vector3(); rc.ray.intersectPlane(dragPlane.current, hp);
    if (!hp) return;
    const tgt = hp.add(dragOffset.current);
    tgt.y = Math.max(FLOOR_Y, tgt.y);
    setIKTarget(tgt);
  }, [camera, getNDC, setIKTarget]);

  const handlePointerUp = useCallback((e: any) => {
    isDragging.current = false; gl.domElement.style.cursor = 'auto';
    gl.domElement.releasePointerCapture(e.pointerId);
  }, [gl]);

  return (
    <group>
      <mesh ref={meshRef} position={[ikTarget.x, ikTarget.y, ikTarget.z]}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        onPointerOver={() => { gl.domElement.style.cursor = 'grab'; }}
        onPointerOut={() => { if (!isDragging.current) gl.domElement.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[0.09, 24, 24]} />
        <meshStandardMaterial color="#c04040" emissive="#b03030" emissiveIntensity={0.6} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[ikTarget.x, ikTarget.y, ikTarget.z]}>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshStandardMaterial color="#c04040" transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

function FloorPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.001, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#111114" transparent opacity={0.85} metalness={0.1} roughness={0.9} />
    </mesh>
  );
}

function GroundShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.002, 0]}>
      <circleGeometry args={[5, 64]} />
      <meshStandardMaterial color="#1a1a1e" transparent opacity={0.4} metalness={0} roughness={1} />
    </mesh>
  );
}

function ArmLinks() {
  const joints = useSandboxStore(s => s.joints);
  const bp = useSandboxStore(s => s.basePosition);
  const { transforms } = useMemo(() => computeAllTransforms(joints, bp), [joints, bp]);
  const points = useMemo(() => transforms.map(t => new Vector3(t.elements[12], t.elements[13], t.elements[14])), [transforms]);

  const { hasFloor, hasSelfCol } = useMemo(() => ({
    hasFloor: checkFloorViolation(points),
    hasSelfCol: checkSelfCollision(points),
  }), [points]);

  const linkColor = hasFloor || hasSelfCol ? '#9a3a3a' : '#505868';
  const traceColor = hasFloor || hasSelfCol ? '#9a3a3a' : '#5b8ec9';

  if (points.length < 2) return null;
  return (
    <>
      {points.slice(0, -1).map((p, i) => {
        const len = p.distanceTo(points[i + 1]);
        if (len < 0.001) return null;
        return (
          <mesh
            key={`rod-${i}`}
            position={new Vector3().addVectors(p, points[i + 1]).multiplyScalar(0.5)}
            quaternion={new Quaternion().setFromUnitVectors(
              new Vector3(0, 1, 0),
              new Vector3().subVectors(points[i + 1], p).normalize(),
            )}
            castShadow
          >
            <cylinderGeometry args={[0.028, 0.028, len, 8]} />
            <meshStandardMaterial color={linkColor} metalness={0.6} roughness={0.3} />
          </mesh>
        );
      })}
      <Line points={points} color={traceColor} lineWidth={1} transparent opacity={0.10} />
    </>
  );
}

function ClickToAddWaypoint() {
  const addWaypoint = useSandboxStore(s => s.addWaypoint);

  const handleClick = useCallback((e: any) => {
    if (e.shiftKey) {
      e.stopPropagation();
      const point = e.point as Vector3;
      addWaypoint(new Vector3(point.x, Math.max(FLOOR_Y, point.y), point.z));
    }
  }, [addWaypoint]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_Y + 0.0001, 0]}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function ArmScene() {
  const joints = useSandboxStore(s => s.joints);
  const bp = useSandboxStore(s => s.basePosition);
  const selectJoint = useSandboxStore(s => s.selectJoint);
  const isDraggingJoint = useSandboxStore(s => s.isDraggingJoint);
  const readmeDemo = useSandboxStore(s => s.readmeDemo);
  const { transforms } = useMemo(() => computeAllTransforms(joints, bp), [joints, bp]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 10, 4]} intensity={1.2} castShadow shadow-mapSize={1024} color="#ffffff" />
      <directionalLight position={[-4, 6, -3]} intensity={0.4} color="#e0e4ea" />
      <pointLight position={[1, 3, 2]} intensity={0.3} color="#ffffff" distance={10} />

      <Environment preset="city" environmentIntensity={0.15} />

      <Grid
        args={[40, 40]}
        cellSize={0.5}
        sectionSize={2}
        cellColor="#2a2a2e"
        sectionColor="#3a3a40"
        fadeDistance={20}
        infiniteGrid
      />
      <FloorPlane />
      <GroundShadow />
      <ClickToAddWaypoint />

      <group onPointerMissed={() => selectJoint(null)}>
        {joints.map((j, i) => (
          <JointMesh key={j.id} joint={j} worldMatrix={transforms[i]} parentMatrix={i > 0 ? transforms[i - 1] : null} index={i} />
        ))}
      </group>

      <ArmLinks />
      <AllSnapConnectors />
      <IKTargetSphere />
      <WaypointMarkers />
      <PathVisualization />

      <OrbitControls
        makeDefault
        enabled={!isDraggingJoint && !readmeDemo}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2}
      />
      {!readmeDemo && (
        <GizmoHelper alignment="bottom-left" margin={[48, 48]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.7} />
        </GizmoHelper>
      )}

      <ReadmeDemoCameraRig />
      <SceneBridge />
    </>
  );
}

export function Viewport() {
  const addJoint = useSandboxStore(s => s.addJoint);
  const showAnalytics = useSandboxStore(s => s.showAnalytics);
  const readmeDemo = useSandboxStore(s => s.readmeDemo);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); const t = e.dataTransfer.getData('application/joint-type');
    if (t) addJoint(t as any);
  }, [addJoint]);

  return (
    <div className="panel-viewport">
      {!readmeDemo && <SimControls />}
      <div
        className="viewport-canvas-area"
        data-readme-demo={readmeDemo ? 'true' : undefined}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Canvas shadows camera={{ position: [2.5, 2.5, 4], fov: 50, near: 0.01, far: 100 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: false, toneMapping: 3 }}
          onCreated={({ gl }) => { gl.setClearColor('#e8e8ec'); }}
        >
          <ArmScene />
        </Canvas>
        <ViewportHint />
      </div>
      {showAnalytics && <AnalyticsOverlay />}
    </div>
  );
}

function ViewportHint() {
  const joints = useSandboxStore(s => s.joints);
  if (joints.length >= 2) return null;
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      color: '#888890', fontSize: 12, fontFamily: 'var(--font-sans)',
      pointerEvents: 'none', textAlign: 'center', zIndex: 2,
    }}>
      Pick a preset or add parts from the left
    </div>
  );
}
