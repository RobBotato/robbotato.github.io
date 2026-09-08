import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Text, TrackballControls } from "@react-three/drei";
import * as THREE from "three";

/* Default word set — competitive-programming / algorithm topics. */
const DEFAULT_WORDS = [
  "Dynamic Programming", "Segment Tree", "Dijkstra", "Binary Search", "DFS",
  "BFS", "Union-Find", "Fenwick Tree", "Topological Sort", "Bitmask DP",
  "Greedy", "Two Pointers", "Sliding Window", "Trie", "KMP",
  "Floyd–Warshall", "Max Flow", "Suffix Array", "Number Theory", "Combinatorics",
  "Meet in the Middle", "Prefix Sums",
];

/* Cyan ↔ emerald gradient across the sphere. Position-based so it's stable per word. */
const EMERALD = new THREE.Color("#10b981");
const CYAN = new THREE.Color("#22d3ee");
const HOVER = new THREE.Color("#a5f3fc");

const Word = ({
  position,
  children,
}: {
  position: THREE.Vector3;
  children: string;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  /* Mix emerald→cyan based on Y so the cloud has a subtle vertical gradient. */
  const baseColor = useMemo(() => {
    const t = (position.y / 6 + 1) / 2; // 0..1
    return new THREE.Color().lerpColors(EMERALD, CYAN, t);
  }, [position]);

  useFrame(() => {
    if (!ref.current) return;
    const target = hovered ? HOVER : baseColor;
    (ref.current as unknown as { color?: THREE.Color }).color?.lerp(target, 0.15);
  });

  return (
    <Billboard position={position}>
      <Text
        ref={ref as React.MutableRefObject<THREE.Mesh>}
        fontSize={0.55}
        letterSpacing={-0.02}
        anchorX="center"
        anchorY="middle"
        color={baseColor}
        outlineWidth={0.012}
        outlineColor="#020617"
        outlineOpacity={0.85}
        material-toneMapped={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        {children}
      </Text>
    </Billboard>
  );
};

const Cloud = ({
  radius = 5,
  words: wordList,
}: {
  radius?: number;
  words: string[];
}) => {
  const groupRef = useRef<THREE.Group>(null);

  /* Fibonacci sphere — even distribution of points on a unit sphere. */
  const words = useMemo(() => {
    const phi = Math.PI * (3 - Math.sqrt(5));
    return wordList.map((word, i) => {
      const y = 1 - (i / (wordList.length - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      return {
        position: new THREE.Vector3(x * radius, y * radius, z * radius),
        word,
      };
    });
  }, [wordList, radius]);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.0025;
    groupRef.current.rotation.x -= 0.0008;
  });

  return (
    <group ref={groupRef}>
      {words.map((item, index) => (
        <Word key={index} position={item.position}>
          {item.word}
        </Word>
      ))}
    </group>
  );
};

const WordGlobe = ({ words = DEFAULT_WORDS }: { words?: string[] }) => {
  return (
    <div className="w-full h-full min-h-[400px] md:min-h-[500px] cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 60 }}
        dpr={[1, 1]}
        gl={{ antialias: false, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#22d3ee" />
        <pointLight position={[-10, -10, -10]} intensity={0.4} color="#10b981" />

        <Cloud radius={6} words={words} />

        <TrackballControls noZoom noPan rotateSpeed={2.2} />
      </Canvas>
    </div>
  );
};

export default WordGlobe;
