import { useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ShapeType = "circle" | "square" | "triangle" | "line";
type Layer = "bg" | "mid" | "fg";
type ColorPalette = "cyan" | "purple" | "pink";

interface Shape {
  id: number;
  type: ShapeType;
  size: number;
  x: number; // percentage
  y: number; // percentage
  layer: Layer;
  color: ColorPalette;
  duration: number;
  delay: number;
  rotation: number;
}

interface GeometricAmbienceProps {
  shapeCount?: number;
  colorPalette?: ColorPalette[];
  intensityLevel?: "subtle" | "moderate";
}

const PARALLAX_SPEEDS = {
  bg: 0.3,
  mid: 0.5,
  fg: 0.7,
};

const COLORS = {
  cyan: "hsl(199 89% 48%)",
  purple: "hsl(260 70% 55%)",
  pink: "hsl(320 70% 50%)",
};

const GeometricAmbience = ({
  shapeCount = 10,
  colorPalette = ["cyan", "purple", "pink"],
  intensityLevel = "subtle",
}: GeometricAmbienceProps) => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const opacity = intensityLevel === "subtle" ? 0.06 : 0.1;

  // Generate shapes once on mount
  const shapes = useMemo(() => {
    const shapeTypes: ShapeType[] = ["circle", "square", "triangle", "line"];
    const layers: Layer[] = ["bg", "mid", "fg"];

    return Array.from({ length: shapeCount }, (_, i) => {
      const shape: Shape = {
        id: i,
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
        size: 50 + Math.random() * 150, // 50-200px
        x: Math.random() * 100,
        y: Math.random() * 100,
        layer: layers[Math.floor(Math.random() * layers.length)],
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        duration: 40 + Math.random() * 30, // 40-70 seconds
        delay: Math.random() * -20, // Negative delay to start mid-animation
        rotation: Math.random() * 360,
      };
      return shape;
    });
  }, [shapeCount, colorPalette]);

  const renderShape = (shape: Shape) => {
    const { type, size, color } = shape;
    const fill = COLORS[color];
    const halfSize = size / 2;

    switch (type) {
      case "circle":
        return (
          <circle
            cx={halfSize}
            cy={halfSize}
            r={halfSize * 0.9}
            stroke={fill}
            strokeWidth="1.5"
            fill="none"
            opacity={opacity}
          />
        );
      case "square":
        return (
          <rect
            x={size * 0.1}
            y={size * 0.1}
            width={size * 0.8}
            height={size * 0.8}
            stroke={fill}
            strokeWidth="1.5"
            fill="none"
            opacity={opacity}
            rx="4"
          />
        );
      case "triangle":
        const points = `${halfSize},${size * 0.1} ${size * 0.9},${size * 0.9} ${size * 0.1},${size * 0.9}`;
        return (
          <polygon
            points={points}
            stroke={fill}
            strokeWidth="1.5"
            fill="none"
            opacity={opacity}
          />
        );
      case "line": {
        return (
          <line
            x1={size * 0.2}
            y1={size * 0.5}
            x2={size * 0.8}
            y2={size * 0.5}
            stroke={fill}
            strokeWidth="1.5"
            opacity={opacity}
          />
        );
      }
      default:
        return null;
    }
  };

  // Respect user's reduced motion preference
  if (prefersReducedMotion) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none hide-mobile overflow-hidden"
      style={{ zIndex: 5 }}
      aria-hidden="true"
    >
      {shapes.map((shape) => (
        <AnimatedShape
          key={shape.id}
          shape={shape}
          scrollYProgress={scrollYProgress}
          renderShape={renderShape}
        />
      ))}
    </div>
  );
};

// Individual shape component to properly use hooks
const AnimatedShape = ({
  shape,
  scrollYProgress,
  renderShape,
}: {
  shape: Shape;
  scrollYProgress: any;
  renderShape: (shape: Shape) => React.ReactNode;
}) => {
  // Create parallax effect based on layer
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -200 * PARALLAX_SPEEDS[shape.layer]]
  );

  return (
    <motion.div
      className="absolute will-change-transform"
      style={{
        left: `${shape.x}%`,
        top: `${shape.y}%`,
        y, // Parallax effect
      }}
      animate={{
        x: [0, 50, -30, 0],
        rotate: [shape.rotation, shape.rotation + 20, shape.rotation - 15, shape.rotation],
        scale: [1, 1.1, 0.95, 1],
      }}
      transition={{
        duration: shape.duration,
        delay: shape.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg
        width={shape.size}
        height={shape.size}
        className="blur-2xl"
        style={{ mixBlendMode: "screen" }}
      >
        {renderShape(shape)}
      </svg>
    </motion.div>
  );
};

export default GeometricAmbience;
