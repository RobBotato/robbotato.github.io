import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIntro, type IntroPhase } from "@/contexts/IntroContext";
import { useScene, type Scene } from "@/contexts/SceneContext";
import * as THREE from "three";

/* ------------------------------------------------------------------------- */
/* Neural-network background.                                                  */
/*                                                                            */
/* A layered feed-forward graph: nodes arranged in columns, every node wired  */
/* to every node in the next column, with bright "signal" pulses that travel  */
/* left -> right along the edges. Pulse rate and glow react to scroll         */
/* velocity (scroll-driven background). Keeps the original intro "dive",       */
/* warp-through, and per-scene choreography.                                   */
/* Palette: near-white nodes, electric-blue edges, white-blue pulses on black. */
/* ------------------------------------------------------------------------- */

const LAYER_SIZES = [4, 7, 9, 7, 3];
const LAYER_GAP = 1.7;
const NODE_GAP = 0.62;
const Z_JITTER = 0.5;

interface NetMark {
  posX: number;
  posY: number;
  posZ: number;
  scale: number;
  velScale: number; // multiplier on `rotationSpeed`
  glow: number; // node/pulse brightness (0..~1.6)
  opacity: number; // edge/node material opacity
  cameraZ: number;
}

/* Net stays centered / hero-sized for every section; skills fades it out. */
const NET_MARKS: Record<Scene, NetMark> = {
  hero:       { posX: 1.7, posY: 0, posZ: 0, scale: 1.0, velScale: 0.7, glow: 1.0, opacity: 0.5, cameraZ: 9 },
  about:      { posX: 0, posY: 0, posZ: 0, scale: 1.0, velScale: 0.5, glow: 0.9, opacity: 0.46, cameraZ: 9 },
  experience: { posX: 0, posY: 0, posZ: 0, scale: 1.0, velScale: 0.65, glow: 1.0, opacity: 0.5, cameraZ: 9 },
  skills:     { posX: 0, posY: 0, posZ: 0, scale: 0.62, velScale: 0.3, glow: 0.15, opacity: 0.07, cameraZ: 9 },
  education:  { posX: 0, posY: 0, posZ: 0, scale: 1.0, velScale: 0.5, glow: 0.85, opacity: 0.42, cameraZ: 9 },
  projects:   { posX: 0, posY: 0, posZ: 0, scale: 1.0, velScale: 0.6, glow: 0.85, opacity: 0.4, cameraZ: 9 },
};

interface NeuralNetFieldProps {
  rotationSpeed?: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const NeuralNetField = ({ rotationSpeed = 0.0016 }: NeuralNetFieldProps) => {
  const prefersReducedMotion = useReducedMotion();
  const { phase, diveProgressRef } = useIntro();
  const { activeSceneRef, isWarping, scrollVelocityRef } = useScene();

  if (prefersReducedMotion) return null;

  const isForeground = phase !== "done" || isWarping;

  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none transition-[background-color] duration-700"
      style={{
        zIndex: isForeground ? 5 : -1,
        backgroundColor: isForeground ? "#080808" : "transparent",
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={["#0a0a0a", 12, 30]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#3b82f6" />
        <pointLight position={[-10, -8, 4]} intensity={0.4} color="#e5e7eb" />

        <NetMesh
          rotationSpeed={rotationSpeed}
          phase={phase}
          diveProgressRef={diveProgressRef}
          activeSceneRef={activeSceneRef}
          isWarping={isWarping}
          scrollVelocityRef={scrollVelocityRef}
        />
        <StarField phase={phase} diveProgressRef={diveProgressRef} isWarping={isWarping} />
      </Canvas>
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* The network: layered nodes, dense inter-layer edges, traveling pulses.    */
/* ------------------------------------------------------------------------- */

const PULSE_COUNT = 90;

const NetMesh = ({
  rotationSpeed,
  phase,
  diveProgressRef,
  activeSceneRef,
  isWarping,
  scrollVelocityRef,
}: {
  rotationSpeed: number;
  phase: IntroPhase;
  diveProgressRef: React.MutableRefObject<number>;
  activeSceneRef: React.MutableRefObject<Scene>;
  isWarping: boolean;
  scrollVelocityRef: React.MutableRefObject<number>;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const nodeMatRef = useRef<THREE.PointsMaterial>(null);
  const edgeMatRef = useRef<THREE.LineBasicMaterial>(null);
  const pulseMatRef = useRef<THREE.PointsMaterial>(null);
  const pulsePointsRef = useRef<THREE.Points>(null);

  const rot = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const live = useRef<NetMark>({ ...NET_MARKS.hero });
  const warpStart = useRef(0);
  const velBoost = useRef(0); // smoothed scroll-driven excitation

  if (!isWarping && warpStart.current !== 0) warpStart.current = 0;

  /* ---- Build layered nodes + inter-layer edges once ---- */
  const { nodeGeometry, edgeGeometry, edgePairs, baseNodeSize } = useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    const layerRanges: Array<[number, number]> = [];

    LAYER_SIZES.forEach((size, li) => {
      const start = nodes.length;
      const x = (li - (LAYER_SIZES.length - 1) / 2) * LAYER_GAP;
      for (let j = 0; j < size; j++) {
        const y = (j - (size - 1) / 2) * NODE_GAP;
        const z = (Math.random() - 0.5) * Z_JITTER;
        nodes.push(new THREE.Vector3(x, y, z));
      }
      layerRanges.push([start, nodes.length]);
    });

    const nArr = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => {
      nArr[i * 3] = n.x;
      nArr[i * 3 + 1] = n.y;
      nArr[i * 3 + 2] = n.z;
    });
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute("position", new THREE.BufferAttribute(nArr, 3));

    /* Dense edges between consecutive layers. */
    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    const verts: number[] = [];
    for (let li = 0; li < layerRanges.length - 1; li++) {
      const [aStart, aEnd] = layerRanges[li];
      const [bStart, bEnd] = layerRanges[li + 1];
      for (let a = aStart; a < aEnd; a++) {
        for (let b = bStart; b < bEnd; b++) {
          pairs.push([nodes[a], nodes[b]]);
          verts.push(
            nodes[a].x, nodes[a].y, nodes[a].z,
            nodes[b].x, nodes[b].y, nodes[b].z
          );
        }
      }
    }
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));

    return {
      nodeGeometry: nGeo,
      edgeGeometry: eGeo,
      edgePairs: pairs,
      baseNodeSize: 0.16,
    };
  }, []);

  /* ---- Signal pulses: bright dots travelling along random edges ---- */
  const pulses = useRef(
    Array.from({ length: PULSE_COUNT }, () => ({
      edge: Math.floor(Math.random() * Math.max(1, 1)),
      t: Math.random(),
      speed: 0.004 + Math.random() * 0.01,
    }))
  );
  const pulseGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PULSE_COUNT * 3), 3));
    return g;
  }, []);

  /* Seed pulse edge indices once the real edge count is known. */
  const seeded = useRef(false);
  if (!seeded.current && edgePairs.length > 0) {
    pulses.current.forEach((p) => {
      p.edge = Math.floor(Math.random() * edgePairs.length);
    });
    seeded.current = true;
  }

  useFrame(({ camera }) => {
    const group = groupRef.current;
    if (!group || !nodeMatRef.current || !edgeMatRef.current || !pulseMatRef.current) return;

    const dp = diveProgressRef.current;

    /* Scroll-driven excitation — decays every frame, spikes on fast scroll. */
    const rawV = Math.min(scrollVelocityRef.current * 8, 3);
    velBoost.current = Math.max(velBoost.current * 0.92, rawV);

    /* 1. Target spin velocity per phase. */
    let targetVelX: number;
    let targetVelY: number;
    if (phase === "intro") {
      targetVelX = rotationSpeed * 0.6;
      targetVelY = rotationSpeed * 1.1;
    } else if (phase === "diving") {
      const spinBoost = 1 + dp * 4;
      targetVelX = rotationSpeed * 0.6 * spinBoost;
      targetVelY = rotationSpeed * 1.1 * spinBoost;
    } else {
      const mark = NET_MARKS[activeSceneRef.current];
      targetVelX = rotationSpeed * 0.25 * mark.velScale;
      targetVelY = rotationSpeed * 1.0 * mark.velScale * (1 + velBoost.current * 0.15);
    }

    vel.current.x = lerp(vel.current.x, targetVelX, 0.06);
    vel.current.y = lerp(vel.current.y, targetVelY, 0.06);
    rot.current.x += vel.current.x;
    rot.current.y += vel.current.y;
    group.rotation.x = rot.current.x;
    group.rotation.y = rot.current.y;

    /* 2. Phase-specific scale / position / camera / glow. */
    let glow: number;

    if (phase === "intro") {
      const breathe = 1.45 + Math.sin(performance.now() * 0.0008) * 0.05;
      group.scale.setScalar(breathe);
      group.position.set(0, 0, 0);
      camera.position.z = 7;
      glow = 1.1;
      Object.assign(live.current, { posX: 0, posY: 0, posZ: 0, scale: breathe, cameraZ: 7, glow, opacity: 0.85 });
    } else if (phase === "diving") {
      let camZ: number;
      let scale: number;
      let opacity: number;
      if (dp < 0.45) {
        const k = dp / 0.45;
        camZ = lerp(7, 0.5, k);
        scale = lerp(1.45, 3.2, k);
        glow = lerp(1.1, 1.7, k);
        opacity = lerp(0.85, 0.95, k);
      } else {
        const k = (dp - 0.45) / 0.55;
        camZ = lerp(0.5, 9, k);
        scale = lerp(3.2, 1.0, k);
        glow = lerp(1.7, 0.15, k);
        opacity = lerp(0.95, 0.46, k);
      }
      group.scale.setScalar(scale);
      group.position.set(0, 0, 0);
      camera.position.z = camZ;
      Object.assign(live.current, { posX: 0, posY: 0, posZ: 0, scale, cameraZ: camZ, glow, opacity });
    } else if (isWarping) {
      if (warpStart.current === 0) warpStart.current = performance.now();
      const elapsed = (performance.now() - warpStart.current) / 1000;
      if (elapsed < 1.2) {
        const k = elapsed / 1.2;
        const spinMultiplier = 1 + k * k * 18;
        vel.current.x = rotationSpeed * 0.6 * spinMultiplier;
        vel.current.y = rotationSpeed * 1.1 * spinMultiplier;
        live.current.posX = lerp(live.current.posX, 0, 0.1);
        live.current.posY = lerp(live.current.posY, 0, 0.1);
        live.current.posZ = lerp(live.current.posZ, 0, 0.1);
        live.current.scale = lerp(live.current.scale, 1.2, 0.06);
        live.current.cameraZ = lerp(live.current.cameraZ, 7, 0.06);
        live.current.glow = lerp(live.current.glow, 1.6, 0.08);
        live.current.opacity = lerp(live.current.opacity, 0.95, 0.08);
      } else {
        live.current.scale = lerp(live.current.scale, 28, 0.06);
        live.current.cameraZ = lerp(live.current.cameraZ, 0.2, 0.07);
        live.current.opacity = lerp(live.current.opacity, 0, 0.06);
        live.current.glow = lerp(live.current.glow, 2.0, 0.05);
        vel.current.x = rotationSpeed * 22;
        vel.current.y = rotationSpeed * 32;
      }
      group.position.set(live.current.posX, live.current.posY, live.current.posZ);
      group.scale.setScalar(live.current.scale);
      camera.position.z = live.current.cameraZ;
      glow = live.current.glow;
    } else {
      const mark = NET_MARKS[activeSceneRef.current];
      live.current.posX = lerp(live.current.posX, mark.posX, 0.04);
      live.current.posY = lerp(live.current.posY, mark.posY, 0.04);
      live.current.posZ = lerp(live.current.posZ, mark.posZ, 0.04);
      live.current.scale = lerp(live.current.scale, mark.scale, 0.04);
      live.current.cameraZ = lerp(live.current.cameraZ, mark.cameraZ, 0.03);
      live.current.glow = lerp(live.current.glow, mark.glow + velBoost.current * 0.12, 0.07);
      live.current.opacity = lerp(live.current.opacity, mark.opacity, 0.07);

      const breatheNudge = 1 + Math.sin(performance.now() * 0.0005) * 0.02;
      group.position.set(live.current.posX, live.current.posY, live.current.posZ);
      group.scale.setScalar(live.current.scale * breatheNudge);
      camera.position.z = live.current.cameraZ;
      glow = live.current.glow;
    }

    camera.lookAt(0, 0, 0);

    /* 3. Materials. */
    const op = live.current.opacity;
    edgeMatRef.current.opacity = Math.min(op * 0.55, 1);
    nodeMatRef.current.opacity = Math.min(op * 1.2, 1);
    const nodePulse = 1 + Math.sin(performance.now() * 0.0015) * 0.1;
    nodeMatRef.current.size = baseNodeSize * (0.7 + glow * 0.5) * nodePulse;

    /* 4. Advance signal pulses along their edges. */
    if (pulsePointsRef.current && edgePairs.length > 0) {
      const arr = pulseGeometry.attributes.position.array as Float32Array;
      const boost = 1 + velBoost.current * 1.6;
      for (let i = 0; i < PULSE_COUNT; i++) {
        const p = pulses.current[i];
        p.t += p.speed * boost;
        if (p.t >= 1) {
          p.t = 0;
          p.edge = Math.floor(Math.random() * edgePairs.length);
          p.speed = 0.004 + Math.random() * 0.01;
        }
        const [a, b] = edgePairs[p.edge];
        const e = easeInOut(p.t);
        arr[i * 3] = a.x + (b.x - a.x) * e;
        arr[i * 3 + 1] = a.y + (b.y - a.y) * e;
        arr[i * 3 + 2] = a.z + (b.z - a.z) * e;
      }
      pulseGeometry.attributes.position.needsUpdate = true;
      pulseMatRef.current.opacity = Math.min(op * 1.8, 1);
      pulseMatRef.current.size = 0.11 * (0.8 + glow * 0.7);
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial
          ref={edgeMatRef}
          color="#3b82f6"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points geometry={nodeGeometry}>
        <pointsMaterial
          ref={nodeMatRef}
          size={baseNodeSize}
          color="#dbeafe"
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={pulsePointsRef} geometry={pulseGeometry}>
        <pointsMaterial
          ref={pulseMatRef}
          size={0.11}
          color="#bfdbfe"
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Faint offset echo of the nodes for depth. */}
      <points geometry={nodeGeometry} position={[0.05, -0.03, -0.05]}>
        <pointsMaterial
          size={baseNodeSize * 0.5}
          color="#60a5fa"
          transparent
          opacity={0.22}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

/* ------------------------------------------------------------------------- */
/* Star field — drifts during intro, streaks during dive, rains in ambient.  */
/* ------------------------------------------------------------------------- */

const SHELL_COUNT = 360;
const AMBIENT_STAR_COUNT = 260;

const StarField = ({
  phase,
  diveProgressRef,
  isWarping,
}: {
  phase: IntroPhase;
  diveProgressRef: React.MutableRefObject<number>;
  isWarping: boolean;
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const { basePositions, streakDirs } = useMemo(() => {
    const base = new Float32Array(SHELL_COUNT * 3);
    const dirs = new Float32Array(SHELL_COUNT * 3);
    for (let i = 0; i < SHELL_COUNT; i++) {
      const r = 4 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const sx = Math.sin(phi) * Math.cos(theta);
      const sy = Math.sin(phi) * Math.sin(theta);
      const sz = Math.cos(phi);
      base[i * 3] = sx * r;
      base[i * 3 + 1] = sy * r;
      base[i * 3 + 2] = sz * r;
      dirs[i * 3] = sx;
      dirs[i * 3 + 1] = sy;
      dirs[i * 3 + 2] = sz;
    }
    return { basePositions: base, streakDirs: dirs };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(basePositions.slice(), 3));
    return g;
  }, [basePositions]);

  const fallingRef = useRef<THREE.Points>(null);
  const fallingMatRef = useRef<THREE.PointsMaterial>(null);

  const fallingData = useMemo(() => {
    const positions = new Float32Array(AMBIENT_STAR_COUNT * 3);
    const speeds = new Float32Array(AMBIENT_STAR_COUNT);
    for (let i = 0; i < AMBIENT_STAR_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 20 - 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 3;
      speeds[i] = 0.004 + Math.random() * 0.013;
    }
    return { positions, speeds };
  }, []);

  const fallingGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(fallingData.positions.slice(), 3));
    return g;
  }, [fallingData]);

  useFrame(() => {
    if (pointsRef.current && matRef.current) {
      const dp = diveProgressRef.current;
      if (phase === "diving") {
        pointsRef.current.rotation.y += 0.0006;
        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const stretch = dp * 25;
        for (let i = 0; i < SHELL_COUNT; i++) {
          const idx = i * 3;
          arr[idx] = basePositions[idx] + streakDirs[idx] * stretch;
          arr[idx + 1] = basePositions[idx + 1] + streakDirs[idx + 1] * stretch;
          arr[idx + 2] = basePositions[idx + 2] + streakDirs[idx + 2] * stretch;
        }
        posAttr.needsUpdate = true;
        matRef.current.opacity = 0.8;
      } else if (phase === "intro") {
        pointsRef.current.rotation.y += 0.0006;
        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        posAttr.array.set(basePositions);
        posAttr.needsUpdate = true;
        matRef.current.opacity = 0.8;
      } else if (isWarping) {
        pointsRef.current.rotation.y += 0.002;
        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < SHELL_COUNT; i++) {
          const idx = i * 3;
          arr[idx] = lerp(arr[idx], basePositions[idx] + streakDirs[idx] * 15, 0.05);
          arr[idx + 1] = lerp(arr[idx + 1], basePositions[idx + 1] + streakDirs[idx + 1] * 15, 0.05);
          arr[idx + 2] = lerp(arr[idx + 2], basePositions[idx + 2] + streakDirs[idx + 2] * 15, 0.05);
        }
        posAttr.needsUpdate = true;
        matRef.current.opacity = lerp(matRef.current.opacity, 0.8, 0.1);
      } else {
        matRef.current.opacity = 0;
      }
    }

    if (fallingRef.current && fallingMatRef.current) {
      if (phase === "done" && !isWarping) {
        fallingMatRef.current.opacity = 0.4;
        const posAttr = fallingGeometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < AMBIENT_STAR_COUNT; i++) {
          const yIdx = i * 3 + 1;
          arr[yIdx] -= fallingData.speeds[i];
          arr[i * 3] += Math.sin(performance.now() * 0.0001 + i) * 0.001;
          if (arr[yIdx] < -14) {
            arr[yIdx] = 14 + Math.random() * 2;
            arr[i * 3] = (Math.random() - 0.5) * 30;
          }
        }
        posAttr.needsUpdate = true;
      } else if (isWarping) {
        fallingMatRef.current.opacity = lerp(fallingMatRef.current.opacity, 0, 0.1);
      } else {
        fallingMatRef.current.opacity = 0;
      }
    }
  });

  return (
    <>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          ref={matRef}
          size={0.06}
          color="#cbd5e1"
          transparent
          opacity={0.8}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={fallingRef} geometry={fallingGeometry}>
        <pointsMaterial
          ref={fallingMatRef}
          size={0.05}
          color="#e2e8f0"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
};

export default NeuralNetField;
