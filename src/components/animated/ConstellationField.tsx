import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIntro, type IntroPhase } from "@/contexts/IntroContext";
import { useScene, type Scene } from "@/contexts/SceneContext";
import * as THREE from "three";

/* ------------------------------------------------------------------------- */
/* Scene marks for the constellation.                                         */
/*                                                                            */
/* Each scene defines a *target* transform. The node graph lerps toward its   */
/* scene mark every frame, so it visibly travels between marks as the user    */
/* scrolls — intentional, choreographed motion rather than raw scroll noise.  */
/* Structure mirrors the original donut choreography 1:1 so the intro dive,   */
/* warp, particle field, nebula and lighting all behave identically.          */
/* ------------------------------------------------------------------------- */
interface GraphMark {
  posX: number;
  posY: number;
  posZ: number;
  scale: number;
  velScale: number; // multiplier on `rotationSpeed` for x/y rotation
  emissive: number; // node/edge glow strength (0..~1.6)
  opacity: number; // material opacity
  cameraZ: number; // camera dolly target
}

/*
 * Graph stays centered and same-sized as the hero for every section.
 * Only the skills section fades it out so the globe takes the stage.
 */
const GRAPH_MARKS: Record<Scene, GraphMark> = {
  hero:       { posX: 1.8, posY: 0, posZ: 0, scale: 1.0, velScale: 1.0, emissive: 0.9, opacity: 0.5, cameraZ: 9 },
  about:      { posX: 0, posY: 0, posZ: 0, scale: 1.0, velScale: 0.8, emissive: 0.8, opacity: 0.45, cameraZ: 9 },
  experience: { posX: 0, posY: 0, posZ: 0, scale: 1.0, velScale: 1.0, emissive: 0.9, opacity: 0.5, cameraZ: 9 },
  skills:     { posX: 0, posY: 0, posZ: 0, scale: 0.6, velScale: 0.4, emissive: 0.15, opacity: 0.08, cameraZ: 9 },
  education:  { posX: 0, posY: 0, posZ: 0, scale: 1.0, velScale: 0.8, emissive: 0.8, opacity: 0.42, cameraZ: 9 },
  projects:   { posX: 0, posY: 0, posZ: 0, scale: 1.0, velScale: 0.9, emissive: 0.8, opacity: 0.4, cameraZ: 9 },
};

interface ConstellationFieldProps {
  rotationSpeed?: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const ConstellationField = ({ rotationSpeed = 0.003 }: ConstellationFieldProps) => {
  const prefersReducedMotion = useReducedMotion();
  const { phase, diveProgressRef } = useIntro();
  const { activeSceneRef, isWarping } = useScene();

  if (prefersReducedMotion) {
    /* No 3D at all for reduced-motion users. The intro is also skipped via context. */
    return null;
  }

  /*
   * Z-index switches between foreground (intro/diving) and ambient (done).
   * The CSS background color is solid slate during the intro so body content
   * never peeks through gaps in the graph.
   */
  const isForeground = phase !== "done" || isWarping;

  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none transition-[background-color] duration-700"
      style={{
        zIndex: isForeground ? 5 : -1,
        backgroundColor: isForeground ? "#020617" : "transparent",
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Deep space fog for depth */}
        <fog attach="fog" args={["#020617", 12, 28]} />

        <ambientLight intensity={0.18} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#22d3ee" />
        <pointLight position={[-10, -8, 4]} intensity={0.5} color="#10b981" />

        <GraphMesh
          rotationSpeed={rotationSpeed}
          phase={phase}
          diveProgressRef={diveProgressRef}
          activeSceneRef={activeSceneRef}
          isWarping={isWarping}
        />
        <ParticleField phase={phase} diveProgressRef={diveProgressRef} isWarping={isWarping} />
        <NebulaField phase={phase} />
      </Canvas>
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* Constellation graph — glowing nodes wired by proximity edges.             */
/* Camera + material morph between intro / diving / warping / ambient,        */
/* identical to the donut's phase machine.                                    */
/* ------------------------------------------------------------------------- */

const NODE_COUNT = 60;
const EDGE_DISTANCE = 1.55; // nodes closer than this get wired
const MAX_EDGES_PER_NODE = 4; // keep it a lattice, not a hairball
const GRAPH_RADIUS = 2.9;

const GraphMesh = ({
  rotationSpeed,
  phase,
  diveProgressRef,
  activeSceneRef,
  isWarping,
}: {
  rotationSpeed: number;
  phase: IntroPhase;
  diveProgressRef: React.MutableRefObject<number>;
  activeSceneRef: React.MutableRefObject<Scene>;
  isWarping: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const nodeMatRef = useRef<THREE.PointsMaterial>(null);
  const edgeMatRef = useRef<THREE.LineBasicMaterial>(null);
  const nodePointsRef = useRef<THREE.Points>(null);

  /* Continuous rotation accumulator — lives across all phases, never resets. */
  const rot = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });

  /* Live transform, lerped toward the active scene mark (ambient only). */
  const live = useRef<GraphMark>({ ...GRAPH_MARKS.hero });

  /* Track when the warp started so we can phase the animation. */
  const warpStart = useRef(0);
  if (!isWarping && warpStart.current !== 0) {
    warpStart.current = 0;
  }

  /* ---- Build the node cloud + proximity edges once ---- */
  const { nodePositions, edgeGeometry, nodeGeometry, basePointSize } = useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      /* Fibonacci-sphere-ish distribution, jittered inward for volume. */
      const t = i / NODE_COUNT;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = GRAPH_RADIUS * (0.55 + Math.random() * 0.45);
      nodes.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * r,
          Math.sin(phi) * Math.sin(theta) * r,
          Math.cos(phi) * r
        )
      );
    }

    const nodeArr = new Float32Array(NODE_COUNT * 3);
    nodes.forEach((n, i) => {
      nodeArr[i * 3] = n.x;
      nodeArr[i * 3 + 1] = n.y;
      nodeArr[i * 3 + 2] = n.z;
    });
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute("position", new THREE.BufferAttribute(nodeArr, 3));

    /* Proximity edges, capped per node. */
    const degree = new Array(NODE_COUNT).fill(0);
    const verts: number[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (degree[i] >= MAX_EDGES_PER_NODE || degree[j] >= MAX_EDGES_PER_NODE) continue;
        if (nodes[i].distanceTo(nodes[j]) < EDGE_DISTANCE) {
          verts.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
          degree[i]++;
          degree[j]++;
        }
      }
    }
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));

    return {
      nodePositions: nodeArr,
      edgeGeometry: eGeo,
      nodeGeometry: nGeo,
      basePointSize: 0.14,
    };
  }, []);

  useFrame(({ camera }) => {
    const group = groupRef.current;
    if (!group || !nodeMatRef.current || !edgeMatRef.current) return;

    const dp = diveProgressRef.current;

    /* 1. Target spin velocity for the current phase. */
    let targetVelX: number;
    let targetVelY: number;

    if (phase === "intro") {
      targetVelX = rotationSpeed * 0.8;
      targetVelY = rotationSpeed * 1.2;
    } else if (phase === "diving") {
      const spinBoost = 1 + dp * 4;
      targetVelX = rotationSpeed * 0.8 * spinBoost;
      targetVelY = rotationSpeed * 1.2 * spinBoost;
    } else {
      const mark = GRAPH_MARKS[activeSceneRef.current];
      targetVelX = rotationSpeed * 0.8 * mark.velScale;
      targetVelY = rotationSpeed * 1.2 * mark.velScale;
    }

    /* 2. Lerp velocity toward target — no snap on phase/scene change. */
    vel.current.x = lerp(vel.current.x, targetVelX, 0.06);
    vel.current.y = lerp(vel.current.y, targetVelY, 0.06);

    /* 3. Integrate. Always accumulates, never resets. */
    rot.current.x += vel.current.x;
    rot.current.y += vel.current.y;
    group.rotation.x = rot.current.x;
    group.rotation.y = rot.current.y;

    /* 4. Phase-specific scale / position / camera / glow. */
    let glow: number;

    if (phase === "intro") {
      const breathe = 1.5 + Math.sin(performance.now() * 0.0008) * 0.05;
      group.scale.setScalar(breathe);
      group.position.set(0, 0, 0);
      camera.position.z = 7;
      glow = 1.1;

      live.current.posX = 0;
      live.current.posY = 0;
      live.current.posZ = 0;
      live.current.scale = breathe;
      live.current.cameraZ = 7;
      live.current.emissive = glow;
      live.current.opacity = 0.85;
    } else if (phase === "diving") {
      /*
       * Dive curve:
       *  0.00–0.45 → camera dollies forward, graph grows huge, glow flares.
       *  0.45–1.00 → camera retreats to ambient z=9, graph shrinks, glow decays.
       */
      let camZ: number;
      let scale: number;
      let opacity: number;

      if (dp < 0.45) {
        const k = dp / 0.45;
        camZ = lerp(7, 0.5, k);
        scale = lerp(1.5, 3.4, k);
        glow = lerp(1.1, 1.6, k);
        opacity = lerp(0.85, 0.95, k);
      } else {
        const k = (dp - 0.45) / 0.55;
        camZ = lerp(0.5, 9, k);
        scale = lerp(3.4, 1.0, k);
        glow = lerp(1.6, 0.15, k);
        opacity = lerp(0.95, 0.45, k);
      }

      group.scale.setScalar(scale);
      group.position.set(0, 0, 0);
      camera.position.z = camZ;

      live.current.posX = 0;
      live.current.posY = 0;
      live.current.posZ = 0;
      live.current.scale = scale;
      live.current.cameraZ = camZ;
      live.current.emissive = glow;
      live.current.opacity = opacity;
    } else if (isWarping) {
      /*
       * Two-phase warp:
       *   Phase 1 (0–1.2s): graph centers, spins up hard, glows bright.
       *   Phase 2 (1.2s–end): camera punches through the cloud, edges fade.
       */
      if (warpStart.current === 0) warpStart.current = performance.now();
      const elapsed = (performance.now() - warpStart.current) / 1000;

      if (elapsed < 1.2) {
        const k = elapsed / 1.2;
        const spinMultiplier = 1 + k * k * 20;
        vel.current.x = rotationSpeed * 0.8 * spinMultiplier;
        vel.current.y = rotationSpeed * 1.2 * spinMultiplier;

        live.current.posX = lerp(live.current.posX, 0, 0.1);
        live.current.posY = lerp(live.current.posY, 0, 0.1);
        live.current.posZ = lerp(live.current.posZ, 0, 0.1);
        live.current.scale = lerp(live.current.scale, 1.2, 0.06);
        live.current.cameraZ = lerp(live.current.cameraZ, 7, 0.06);
        live.current.emissive = lerp(live.current.emissive, 1.5, 0.08);
        live.current.opacity = lerp(live.current.opacity, 0.95, 0.08);
      } else {
        const zoomK = Math.min((elapsed - 1.2) / 1.3, 1);
        live.current.scale = lerp(live.current.scale, 30, 0.06);
        live.current.cameraZ = lerp(live.current.cameraZ, 0.2, 0.07);
        live.current.opacity = lerp(live.current.opacity, 0, 0.06);
        live.current.emissive = lerp(live.current.emissive, 2.0, 0.05);
        vel.current.x = rotationSpeed * 25;
        vel.current.y = rotationSpeed * 35;
        void zoomK;
      }

      group.position.set(live.current.posX, live.current.posY, live.current.posZ);
      group.scale.setScalar(live.current.scale);
      camera.position.z = live.current.cameraZ;
      glow = live.current.emissive;
    } else {
      /* Ambient: lerp every transform component toward the active scene's mark. */
      const mark = GRAPH_MARKS[activeSceneRef.current];
      const POS_LERP = 0.04;
      const CAM_LERP = 0.03;
      const MAT_LERP = 0.07;

      live.current.posX = lerp(live.current.posX, mark.posX, POS_LERP);
      live.current.posY = lerp(live.current.posY, mark.posY, POS_LERP);
      live.current.posZ = lerp(live.current.posZ, mark.posZ, POS_LERP);
      live.current.scale = lerp(live.current.scale, mark.scale, POS_LERP);
      live.current.cameraZ = lerp(live.current.cameraZ, mark.cameraZ, CAM_LERP);
      live.current.emissive = lerp(live.current.emissive, mark.emissive, MAT_LERP);
      live.current.opacity = lerp(live.current.opacity, mark.opacity, MAT_LERP);

      const breatheNudge = 1 + Math.sin(performance.now() * 0.0005) * 0.025;

      group.position.set(live.current.posX, live.current.posY, live.current.posZ);
      group.scale.setScalar(live.current.scale * breatheNudge);
      camera.position.z = live.current.cameraZ;
      glow = live.current.emissive;
    }

    camera.lookAt(0, 0, 0);

    /* 5. Push glow/opacity onto the node + edge materials. */
    const op = live.current.opacity;
    /* Edges read fainter than nodes so the lattice stays legible over text. */
    edgeMatRef.current.opacity = Math.min(op * 0.7, 1);
    nodeMatRef.current.opacity = Math.min(op * 1.15, 1);
    /* "Glow" = point size swell during flares + a subtle node pulse. */
    const pulse = 1 + Math.sin(performance.now() * 0.0016) * 0.12;
    nodeMatRef.current.size = basePointSize * (0.75 + glow * 0.6) * pulse;
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial
          ref={edgeMatRef}
          color="#22d3ee"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points ref={nodePointsRef} geometry={nodeGeometry}>
        <pointsMaterial
          ref={nodeMatRef}
          size={basePointSize}
          color="#67e8f9"
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Faint emerald echo cloud for depth — offset copy of the nodes. */}
      <points geometry={nodeGeometry} position={[0.06, -0.04, -0.05]}>
        <pointsMaterial
          size={basePointSize * 0.55}
          color="#10b981"
          transparent
          opacity={0.25}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

/* ------------------------------------------------------------------------- */
/* Particle field — drifts during intro, streaks during dive.                */
/* During ambient, becomes a falling-star rain of particles drifting down.   */
/* ------------------------------------------------------------------------- */

const PARTICLE_COUNT = 400;
const AMBIENT_STAR_COUNT = 300;

const ParticleField = ({
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
    const base = new Float32Array(PARTICLE_COUNT * 3);
    const dirs = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
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
    const spreadX = 30;
    const spreadZ = 20;
    const height = 20;

    for (let i = 0; i < AMBIENT_STAR_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = Math.random() * height - height * 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ - 3;
      speeds[i] = 0.005 + Math.random() * 0.015;
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
        pointsRef.current.rotation.y += 0.0007;
        pointsRef.current.rotation.x -= 0.00035;
        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const stretch = dp * 25;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const idx = i * 3;
          arr[idx] = basePositions[idx] + streakDirs[idx] * stretch;
          arr[idx + 1] = basePositions[idx + 1] + streakDirs[idx + 1] * stretch;
          arr[idx + 2] = basePositions[idx + 2] + streakDirs[idx + 2] * stretch;
        }
        posAttr.needsUpdate = true;
        matRef.current.opacity = 0.85;
      } else if (phase === "intro") {
        pointsRef.current.rotation.y += 0.0007;
        pointsRef.current.rotation.x -= 0.00035;
        const posAttr = geometry.attributes.position as THREE.BufferAttribute;
        posAttr.array.set(basePositions);
        posAttr.needsUpdate = true;
        matRef.current.opacity = 0.85;
      } else {
        if (isWarping) {
          pointsRef.current.rotation.y += 0.002;
          const posAttr = geometry.attributes.position as THREE.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          const stretch = 15;
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const idx = i * 3;
            arr[idx] = lerp(arr[idx], basePositions[idx] + streakDirs[idx] * stretch, 0.05);
            arr[idx + 1] = lerp(arr[idx + 1], basePositions[idx + 1] + streakDirs[idx + 1] * stretch, 0.05);
            arr[idx + 2] = lerp(arr[idx + 2], basePositions[idx + 2] + streakDirs[idx + 2] * stretch, 0.05);
          }
          posAttr.needsUpdate = true;
          matRef.current.opacity = lerp(matRef.current.opacity, 0.85, 0.1);
        } else {
          matRef.current.opacity = 0;
        }
      }
    }

    if (fallingRef.current && fallingMatRef.current) {
      if (phase === "done" && !isWarping) {
        fallingMatRef.current.opacity = 0.55;
        const posAttr = fallingGeometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const topY = 14;
        const botY = -14;

        for (let i = 0; i < AMBIENT_STAR_COUNT; i++) {
          const yIdx = i * 3 + 1;
          arr[yIdx] -= fallingData.speeds[i];
          arr[i * 3] += Math.sin(performance.now() * 0.0001 + i) * 0.001;
          if (arr[yIdx] < botY) {
            arr[yIdx] = topY + Math.random() * 2;
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
          size={0.07}
          color="#67e8f9"
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={fallingRef} geometry={fallingGeometry}>
        <pointsMaterial
          ref={fallingMatRef}
          size={0.06}
          color="#a5f3fc"
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

/* ------------------------------------------------------------------------- */
/* Nebula clouds — soft volumetric glow that drifts behind the graph.        */
/* ------------------------------------------------------------------------- */

const NEBULA_COUNT = 6;

const NebulaField = ({ phase }: { phase: IntroPhase }) => {
  const groupRef = useRef<THREE.Group>(null);

  const nebulae = useMemo(() => {
    const meshes: Array<{
      position: [number, number, number];
      scale: number;
      color: string;
      speed: number;
      offset: number;
    }> = [];

    const colors = ["#06b6d4", "#10b981", "#6366f1", "#22d3ee", "#0ea5e9", "#14b8a6"];

    for (let i = 0; i < NEBULA_COUNT; i++) {
      const angle = (i / NEBULA_COUNT) * Math.PI * 2;
      const r = 6 + Math.random() * 8;
      meshes.push({
        position: [Math.cos(angle) * r, (Math.random() - 0.5) * 8, -3 + Math.random() * -6],
        scale: 2 + Math.random() * 3,
        color: colors[i % colors.length],
        speed: 0.0002 + Math.random() * 0.0003,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return meshes;
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.00008;
  });

  if (phase !== "done") return null;

  return (
    <group ref={groupRef}>
      {nebulae.map((n, i) => (
        <NebulaCloud key={i} {...n} />
      ))}
    </group>
  );
};

const NebulaCloud = ({
  position,
  scale,
  color,
  speed,
  offset,
}: {
  position: [number, number, number];
  scale: number;
  color: string;
  speed: number;
  offset: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = performance.now() * speed + offset;
    const s = scale * (1 + Math.sin(t) * 0.15);
    meshRef.current.scale.setScalar(s);
    meshRef.current.position.y = position[1] + Math.sin(t * 0.7) * 0.5;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.04}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default ConstellationField;
