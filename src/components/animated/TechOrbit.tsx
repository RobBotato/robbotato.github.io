import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { IconType } from "react-icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface TechIcon {
  name: string;
  icon: IconType;
  color?: string;
}

interface TechOrbitProps {
  icons: TechIcon[];
  orbitRadius?: { x: number; y: number };
  duration?: number;
}

const TechOrbit = ({
  icons,
  orbitRadius = { x: 200, y: 150 },
  duration = 40,
}: TechOrbitProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    // Calculate increment based on duration for smooth 360° rotation
    const incrementPerFrame = 360 / (duration * 60); // 60fps

    const interval = setInterval(() => {
      setRotation((prev) => (prev + incrementPerFrame) % 360);
    }, 1000 / 60); // 60fps

    return () => clearInterval(interval);
  }, [duration]);

  const getOrbitalPosition = (index: number, total: number) => {
    // Evenly space icons around the orbit
    const baseAngle = (360 / total) * index;
    const angle = baseAngle + rotation;
    const radians = (angle * Math.PI) / 180;

    const x = Math.cos(radians) * orbitRadius.x;
    const y = Math.sin(radians) * orbitRadius.y;

    return { x, y };
  };

  // Respect user's reduced motion preference
  if (prefersReducedMotion) return null;

  return (
    <div className="relative w-full h-full" aria-hidden="true">
      {/* Orbit Path (optional visual guide - very subtle) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/5"
        style={{
          width: orbitRadius.x * 2,
          height: orbitRadius.y * 2,
        }}
      />

      {/* Orbiting Icons */}
      {icons.map((techIcon, index) => {
        const pos = getOrbitalPosition(index, icons.length);
        const Icon = techIcon.icon;

        return (
          <motion.div
            key={techIcon.name}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
            style={{
              x: pos.x,
              y: pos.y,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
            }}
          >
            {/* Glass pill container */}
            <div
              className="pill px-3 py-2 backdrop-blur-md"
              style={{
                background: "hsla(var(--glass-bg))",
                backdropFilter: "blur(12px)",
                boxShadow: techIcon.color
                  ? `0 0 20px ${techIcon.color}40`
                  : "0 0 15px hsl(var(--primary) / 0.2)",
              }}
            >
              <Icon
                size={24}
                style={{
                  color: techIcon.color || "hsl(var(--primary))",
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TechOrbit;
