import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIntro, type IntroPhase } from "@/contexts/IntroContext";
import { useScene, type Scene } from "@/contexts/SceneContext";
import {
  shouldCancelClickAfterNeuronGrab,
  shouldHandleNeuralPointer,
} from "@/lib/neuralNetInteraction";
import * as THREE from "three";

/* ------------------------------------------------------------------------- */
/* Neural-network background.                                                  */
/*                                                                            */
/* A layered feed-forward graph: nodes in clean columns, every node wired to  */
/* every node in the next column, with bright "signal" pulses travelling      */
/* left -> right along the edges.                                             */
/*                                                                            */
/*  - Ambient motion is a gentle sway + pointer parallax (no full tumble).    */
/*  - Hovering a neuron lights it and its connected edges.                    */
/*  - Dragging a neuron moves it, clamped inside an invisible box; on release */
/*    it eases back home so the network always heals itself.                  */
/*  - Pulse rate / glow still react to scroll velocity.                       */
/*  - Keeps the intro "dive", warp-through, and per-scene choreography.       */
/* ------------------------------------------------------------------------- */

const LAYER_SIZES = [4, 7, 9, 7, 3];
const LAYER_GAP = 2.0;
const NODE_GAP = 0.72;
const Z_JITTER = 0.14;
const PULSE_COUNT = 48;
const PICK_PX = 26; // screen-space pick radius for a neuron

interface NetMark {
  posX: number;
  posY: number;
  posZ: number;
  scale: number;
  glow: number; // node/pulse brightness (0..~1.6)
  opacity: number; // edge/node material opacity
  cameraZ: number;
}

/* Net stays centered / hero-sized for every section; skills fades it out. */
const NET_MARKS: Record<Scene, NetMark> = {
  hero:       { posX: 1.7, posY: 0, posZ: 0, scale: 1.0, glow: 1.0, opacity: 0.5, cameraZ: 9 },
  about:      { posX: 0, posY: 0, posZ: 0, scale: 1.0, glow: 0.9, opacity: 0.46, cameraZ: 9 },
  experience: { posX: 0, posY: 0, posZ: 0, scale: 1.0, glow: 1.0, opacity: 0.5, cameraZ: 9 },
  skills:     { posX: 0, posY: 0, posZ: 0, scale: 0.62, glow: 0.15, opacity: 0.07, cameraZ: 9 },
  education:  { posX: 0, posY: 0, posZ: 0, scale: 1.0, glow: 0.85, opacity: 0.42, cameraZ: 9 },
  projects:   { posX: 0, posY: 0, posZ: 0, scale: 1.0, glow: 0.85, opacity: 0.4, cameraZ: 9 },
};

interface NeuralNetFieldProps {
  rotationSpeed?: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const wrapPi = (a: number) => {
  let x = (a + Math.PI) % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x - Math.PI;
};

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
        dpr={1}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
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
/* The network.                                                               */
/* ------------------------------------------------------------------------- */

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
  const { camera, gl } = useThree();

  const groupRef = useRef<THREE.Group>(null);
  const nodeMatRef = useRef<THREE.PointsMaterial>(null);
  const haloMatRef = useRef<THREE.PointsMaterial>(null);
  const edgeMatRef = useRef<THREE.LineBasicMaterial>(null);
  const pulseMatRef = useRef<THREE.PointsMaterial>(null);
  const trailMatRef = useRef<THREE.PointsMaterial>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);

  const rot = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const live = useRef<NetMark>({ ...NET_MARKS.hero });
  const warpStart = useRef(0);
  const velBoost = useRef(0);
  const swayDamp = useRef(1);

  /* Interaction state (all refs — no re-renders in the hot path). */
  const hover = useRef(-1);
  const appliedHover = useRef(-2);
  const drag = useRef<{ index: number; target: THREE.Vector3 }>({
    index: -1,
    target: new THREE.Vector3(),
  });
  const pointerNDC = useRef({ x: 0, y: 0 });
  const interactive = useRef(false);
  const netDirty = useRef(true); // rewrite node/edge buffers this frame?

  if (!isWarping && warpStart.current !== 0) warpStart.current = 0;

  /* ---- Build the network once ---- */
  const built = useMemo(() => {
    const nodes: THREE.Vector3[] = []; // LIVE positions (mutated every frame)
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

    const homes = nodes.map((n) => n.clone());

    const nArr = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => {
      nArr[i * 3] = n.x;
      nArr[i * 3 + 1] = n.y;
      nArr[i * 3 + 2] = n.z;
    });
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute("position", new THREE.BufferAttribute(nArr, 3));

    /* Dense edges between consecutive layers. */
    const edgePairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    const nodeEdges: number[][] = nodes.map(() => []);
    for (let li = 0; li < layerRanges.length - 1; li++) {
      const [aStart, aEnd] = layerRanges[li];
      const [bStart, bEnd] = layerRanges[li + 1];
      for (let a = aStart; a < aEnd; a++) {
        for (let b = bStart; b < bEnd; b++) {
          const idx = edgePairs.length;
          edgePairs.push([nodes[a], nodes[b]]);
          nodeEdges[a].push(idx);
          nodeEdges[b].push(idx);
        }
      }
    }

    const eArr = new Float32Array(edgePairs.length * 2 * 3);
    const eColor = new Float32Array(edgePairs.length * 2 * 3);
    for (let i = 0; i < edgePairs.length * 2; i++) {
      eColor[i * 3] = 0.12;
      eColor[i * 3 + 1] = 0.32;
      eColor[i * 3 + 2] = 0.8;
    }
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute("position", new THREE.BufferAttribute(eArr, 3));
    eGeo.setAttribute("color", new THREE.BufferAttribute(eColor, 3));

    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PULSE_COUNT * 3), 3));
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PULSE_COUNT * 3), 3));

    const maxLayerX = ((LAYER_SIZES.length - 1) / 2) * LAYER_GAP;
    const maxNodeY = ((Math.max(...LAYER_SIZES) - 1) / 2) * NODE_GAP;
    const bounds = {
      minX: -maxLayerX - 1.0,
      maxX: maxLayerX + 1.0,
      minY: -maxNodeY - 0.9,
      maxY: maxNodeY + 0.9,
      minZ: -1.4,
      maxZ: 1.4,
    };

    return {
      nodes,
      homes,
      nodeGeometry: nGeo,
      edgeGeometry: eGeo,
      edgeColor: eColor,
      edgePairs,
      nodeEdges,
      pulseGeometry: pulseGeo,
      trailGeometry: trailGeo,
      bounds,
      baseNodeSize: 0.18,
    };
  }, []);

  const pulses = useRef(
    Array.from({ length: PULSE_COUNT }, () => ({
      edge: 0,
      t: Math.random(),
      speed: 0.004 + Math.random() * 0.009,
    }))
  );
  const seeded = useRef(false);
  if (!seeded.current && built.edgePairs.length > 0) {
    pulses.current.forEach((p) => (p.edge = Math.floor(Math.random() * built.edgePairs.length)));
    seeded.current = true;
  }

  /* ---- Pointer interaction: pick / drag neurons ---- */
  useEffect(() => {
    const dom = gl.domElement;
    const tmp = new THREE.Vector3();
    let grabbedThisPress = false;

    const pickNode = (clientX: number, clientY: number): number => {
      const g = groupRef.current;
      if (!g) return -1;
      g.updateWorldMatrix(true, false);
      const rect = dom.getBoundingClientRect();
      let best = -1;
      let bestDist = PICK_PX;
      for (let i = 0; i < built.nodes.length; i++) {
        tmp.copy(built.nodes[i]).applyMatrix4(g.matrixWorld).project(camera);
        if (tmp.z < -1 || tmp.z > 1) continue;
        const sx = (tmp.x * 0.5 + 0.5) * rect.width + rect.left;
        const sy = (-tmp.y * 0.5 + 0.5) * rect.height + rect.top;
        const d = Math.hypot(sx - clientX, sy - clientY);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    };

    const updateDragTarget = (clientX: number, clientY: number) => {
      const g = groupRef.current;
      if (!g || drag.current.index < 0) return;
      g.updateWorldMatrix(true, false);
      const rect = dom.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

      const nodeWorld = built.nodes[drag.current.index].clone().applyMatrix4(g.matrixWorld);
      const ray = new THREE.Vector3(ndcX, ndcY, 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize();
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const denom = ray.dot(camDir);

      let hit: THREE.Vector3;
      if (Math.abs(denom) > 1e-5) {
        const dist = nodeWorld.clone().sub(camera.position).dot(camDir) / denom;
        hit = camera.position.clone().add(ray.multiplyScalar(dist));
      } else {
        hit = nodeWorld;
      }

      const localHit = g.worldToLocal(hit);
      drag.current.target.set(
        clamp(localHit.x, built.bounds.minX, built.bounds.maxX),
        clamp(localHit.y, built.bounds.minY, built.bounds.maxY),
        clamp(localHit.z, built.bounds.minZ, built.bounds.maxZ)
      );
    };

    const endDrag = () => {
      if (drag.current.index >= 0) {
        drag.current.index = -1;
        document.body.style.userSelect = "";
        document.body.style.cursor = hover.current >= 0 ? "grab" : "";
      }
    };

    const onMove = (e: PointerEvent) => {
      if (drag.current.index >= 0) {
        updateDragTarget(e.clientX, e.clientY);
        if (e.cancelable) e.preventDefault();
        return;
      }
      if (!shouldHandleNeuralPointer(e.target)) {
        if (hover.current !== -1) {
          hover.current = -1;
          document.body.style.cursor = "";
        }
        return;
      }
      if (!interactive.current) {
        if (hover.current !== -1) {
          hover.current = -1;
          document.body.style.cursor = "";
        }
        return;
      }
      const rect = dom.getBoundingClientRect();
      pointerNDC.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      const hit = pickNode(e.clientX, e.clientY);
      if (hit !== hover.current) {
        hover.current = hit;
        document.body.style.cursor = hit >= 0 ? "grab" : "";
      }
    };

    const onDown = (e: PointerEvent) => {
      if (!interactive.current || !shouldHandleNeuralPointer(e.target)) return;
      const hit = pickNode(e.clientX, e.clientY);
      if (hit >= 0) {
        drag.current.index = hit;
        drag.current.target.copy(built.nodes[hit]);
        grabbedThisPress = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        if (e.cancelable) e.preventDefault();
      }
    };

    /* Swallow the click that would otherwise fire on a page element under the
       cursor right after a neuron grab, so dragging never navigates. */
    const onClickCapture = (e: MouseEvent) => {
      const shouldCancel = shouldCancelClickAfterNeuronGrab(
        grabbedThisPress,
        e.target,
      );
      grabbedThisPress = false;
      if (shouldCancel) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("click", onClickCapture, true);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [camera, gl, built]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !nodeMatRef.current || !edgeMatRef.current || !pulseMatRef.current) return;

    const t = performance.now();
    const dp = diveProgressRef.current;
    interactive.current =
      phase === "done" && !isWarping && activeSceneRef.current !== "skills";

    if (!interactive.current) {
      if (hover.current !== -1) {
        hover.current = -1;
        document.body.style.cursor = "";
      }
      if (drag.current.index >= 0) {
        drag.current.index = -1;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    }

    /* Scroll-driven excitation. */
    const rawV = Math.min(scrollVelocityRef.current * 8, 3);
    velBoost.current = Math.max(velBoost.current * 0.92, rawV);

    /* ---- Rotation ---- */
    if (phase === "intro" || phase === "diving" || isWarping) {
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
        targetVelX = vel.current.x;
        targetVelY = vel.current.y;
      }
      vel.current.x = lerp(vel.current.x, targetVelX, 0.06);
      vel.current.y = lerp(vel.current.y, targetVelY, 0.06);
      rot.current.x += vel.current.x;
      rot.current.y += vel.current.y;
      group.rotation.x = rot.current.x;
      group.rotation.y = rot.current.y;
    } else {
      /* Ambient: gentle sway + pointer parallax, never a full tumble. */
      const damp = hover.current >= 0 || drag.current.index >= 0 ? 0.32 : 1;
      swayDamp.current = lerp(swayDamp.current, damp, 0.08);
      const targetYaw =
        Math.sin(t * 0.00018) * 0.26 * swayDamp.current + pointerNDC.current.x * 0.14;
      const targetPitch =
        -0.04 + Math.sin(t * 0.00012) * 0.05 * swayDamp.current + pointerNDC.current.y * 0.1;
      group.rotation.y = lerp(wrapPi(group.rotation.y), targetYaw, 0.05);
      group.rotation.x = lerp(group.rotation.x, targetPitch, 0.05);
      rot.current.x = group.rotation.x;
      rot.current.y = group.rotation.y;
    }

    /* ---- Scale / position / camera / glow ---- */
    let glow: number;
    if (phase === "intro") {
      const breathe = 1.45 + Math.sin(t * 0.0008) * 0.05;
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
      if (warpStart.current === 0) warpStart.current = t;
      const elapsed = (t - warpStart.current) / 1000;
      if (elapsed < 1.2) {
        const k = elapsed / 1.2;
        const spinMultiplier = 1 + k * k * 18;
        vel.current.x = rotationSpeed * 0.6 * spinMultiplier;
        vel.current.y = rotationSpeed * 1.1 * spinMultiplier;
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
      group.position.set(0, 0, 0);
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

      const breatheNudge = 1 + Math.sin(t * 0.0005) * 0.02;
      group.position.set(live.current.posX, live.current.posY, live.current.posZ);
      group.scale.setScalar(live.current.scale * breatheNudge);
      camera.position.z = live.current.cameraZ;
      glow = live.current.glow;
    }
    camera.lookAt(0, 0, 0);

    /* ---- Node spring: drag follows pointer, everything else eases home ---- */
    const springing = phase === "done" && !isWarping;
    let anyMoved = false;
    for (let i = 0; i < built.nodes.length; i++) {
      const n = built.nodes[i];
      if (!springing) {
        n.copy(built.homes[i]);
      } else if (i === drag.current.index) {
        n.lerp(drag.current.target, 0.35);
        anyMoved = true;
      } else if (n.distanceToSquared(built.homes[i]) > 1e-6) {
        n.lerp(built.homes[i], 0.045);
        anyMoved = true;
      } else {
        n.copy(built.homes[i]); // snap — kills sub-pixel drift so we can idle
      }
    }

    /*
     * Only rewrite the node + edge position buffers when the graph shape is
     * actually changing (a neuron is being dragged or is springing home, or
     * we just left the dive). Otherwise the geometry is already correct and
     * we skip ~1.5k float writes + 2 GPU uploads every frame.
     */
    if (anyMoved) netDirty.current = true;
    if (netDirty.current) {
      const nPos = built.nodeGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < built.nodes.length; i++) {
        nPos[i * 3] = built.nodes[i].x;
        nPos[i * 3 + 1] = built.nodes[i].y;
        nPos[i * 3 + 2] = built.nodes[i].z;
      }
      built.nodeGeometry.attributes.position.needsUpdate = true;

      const ePos = built.edgeGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < built.edgePairs.length; i++) {
        const [a, b] = built.edgePairs[i];
        ePos[i * 6] = a.x;
        ePos[i * 6 + 1] = a.y;
        ePos[i * 6 + 2] = a.z;
        ePos[i * 6 + 3] = b.x;
        ePos[i * 6 + 4] = b.y;
        ePos[i * 6 + 5] = b.z;
      }
      built.edgeGeometry.attributes.position.needsUpdate = true;

      if (!anyMoved) netDirty.current = false; // settled — stop rebuilding next frame
    }

    /* ---- Edge highlight follows the hovered neuron ---- */
    if (hover.current !== appliedHover.current) {
      const col = built.edgeColor;
      for (let i = 0; i < col.length; i += 3) {
        col[i] = 0.12;
        col[i + 1] = 0.32;
        col[i + 2] = 0.8;
      }
      if (hover.current >= 0) {
        for (const eIdx of built.nodeEdges[hover.current]) {
          for (let v = 0; v < 2; v++) {
            const base = (eIdx * 2 + v) * 3;
            col[base] = 0.62;
            col[base + 1] = 0.82;
            col[base + 2] = 1.0;
          }
        }
      }
      built.edgeGeometry.attributes.color.needsUpdate = true;
      appliedHover.current = hover.current;
    }

    /* ---- Hover marker ---- */
    if (hoverMeshRef.current) {
      if (hover.current >= 0) {
        hoverMeshRef.current.visible = true;
        hoverMeshRef.current.position.copy(built.nodes[hover.current]);
        const s = 1 + Math.sin(t * 0.008) * 0.12;
        hoverMeshRef.current.scale.setScalar(s);
      } else {
        hoverMeshRef.current.visible = false;
      }
    }

    /* ---- Materials ---- */
    const op = live.current.opacity;
    edgeMatRef.current.opacity = Math.min(op * 0.6, 1);
    nodeMatRef.current.opacity = Math.min(op * 1.25, 1);
    if (haloMatRef.current) haloMatRef.current.opacity = Math.min(op * 0.35, 1);
    const nodeThrob = 1 + Math.sin(t * 0.0015) * 0.08;
    nodeMatRef.current.size = built.baseNodeSize * (0.72 + glow * 0.5) * nodeThrob;
    if (haloMatRef.current) haloMatRef.current.size = built.baseNodeSize * 3.4 * (0.8 + glow * 0.4);

    /* ---- Signal pulses (+ short trail) ---- */
    const pArr = built.pulseGeometry.attributes.position.array as Float32Array;
    const trArr = built.trailGeometry.attributes.position.array as Float32Array;
    const boost = 1 + velBoost.current * 1.6;
    for (let i = 0; i < PULSE_COUNT; i++) {
      const p = pulses.current[i];
      p.t += p.speed * boost;
      if (p.t >= 1) {
        p.t = 0;
        p.edge = Math.floor(Math.random() * built.edgePairs.length);
        p.speed = 0.004 + Math.random() * 0.009;
      }
      const [a, b] = built.edgePairs[p.edge];
      const e = easeInOut(p.t);
      const eTrail = easeInOut(Math.max(0, p.t - 0.06));
      pArr[i * 3] = a.x + (b.x - a.x) * e;
      pArr[i * 3 + 1] = a.y + (b.y - a.y) * e;
      pArr[i * 3 + 2] = a.z + (b.z - a.z) * e;
      trArr[i * 3] = a.x + (b.x - a.x) * eTrail;
      trArr[i * 3 + 1] = a.y + (b.y - a.y) * eTrail;
      trArr[i * 3 + 2] = a.z + (b.z - a.z) * eTrail;
    }
    built.pulseGeometry.attributes.position.needsUpdate = true;
    built.trailGeometry.attributes.position.needsUpdate = true;
    pulseMatRef.current.opacity = Math.min(op * 1.9, 1);
    pulseMatRef.current.size = 0.12 * (0.8 + glow * 0.7);
    if (trailMatRef.current) {
      trailMatRef.current.opacity = Math.min(op * 0.9, 1);
      trailMatRef.current.size = 0.08 * (0.8 + glow * 0.6);
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={built.edgeGeometry}>
        <lineBasicMaterial
          ref={edgeMatRef}
          vertexColors
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Soft halo behind the nodes */}
      <points geometry={built.nodeGeometry}>
        <pointsMaterial
          ref={haloMatRef}
          size={built.baseNodeSize * 3.4}
          color="#3b82f6"
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Node cores */}
      <points geometry={built.nodeGeometry}>
        <pointsMaterial
          ref={nodeMatRef}
          size={built.baseNodeSize}
          color="#eef4ff"
          transparent
          opacity={0.8}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Pulse trails */}
      <points geometry={built.trailGeometry}>
        <pointsMaterial
          ref={trailMatRef}
          size={0.08}
          color="#7ab8ff"
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Pulse heads */}
      <points geometry={built.pulseGeometry}>
        <pointsMaterial
          ref={pulseMatRef}
          size={0.12}
          color="#e0ecff"
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Hover marker — a small wireframe cage around the neuron under the cursor */}
      <mesh ref={hoverMeshRef} visible={false}>
        <icosahedronGeometry args={[0.22, 1]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------------- */
/* Star field — drifts during intro, streaks during dive, rains in ambient.  */
/* ------------------------------------------------------------------------- */

const SHELL_COUNT = 220;
const AMBIENT_STAR_COUNT = 150;

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
