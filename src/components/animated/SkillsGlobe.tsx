import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Text, TrackballControls } from "@react-three/drei";
import * as THREE from "three";

const SKILLS = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js", "AWS",
  "Docker", "PostgreSQL", "FastAPI", "C/C++", "Java", "SQL",
  "Next.js", "Django", "GraphQL", "Tailwind", "Three.js", "MongoDB",
  "Linux", "Kubernetes", "PyTorch", "Redis",
];

/* Cyan ↔ emerald gradient across the sphere. Position-based so it's stable per word. */
const CYAN = new THREE.Color("#3b9dff");
const EMERALD = new THREE.Color("#c8d4e6");
const HOVER = new THREE.Color("#bfdbfe");

const Word = ({
  position,
  children,
}: {
  position: THREE.Vector3;
  children: string;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  /* Mix cyan→emerald based on Y so the cloud has a subtle vertical gradient. */
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
  skills,
}: {
  radius?: number;
  skills: string[];
}) => {
  const groupRef = useRef<THREE.Group>(null);

  /* Fibonacci sphere — even distribution of points on a unit sphere. */
  const words = useMemo(() => {
    const phi = Math.PI * (3 - Math.sqrt(5));
    return skills.map((word, i) => {
      const y = 1 - (i / (skills.length - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      return {
        position: new THREE.Vector3(x * radius, y * radius, z * radius),
        word,
      };
    });
  }, [skills, radius]);

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

const SkillsGlobe = () => {
  return (
    <div className="w-full h-full min-h-[400px] md:min-h-[500px] cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Brighter scene than the constellation — this one is meant to be seen. */}
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#3b9dff" />
        <pointLight position={[-10, -10, -10]} intensity={0.4} color="#c8d4e6" />

        <Cloud radius={6} skills={SKILLS} />

        <TrackballControls noZoom noPan rotateSpeed={2.2} />
      </Canvas>
    </div>
  );
};

export default SkillsGlobe;
