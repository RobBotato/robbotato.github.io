import { useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface CodeParticle {
  id: number;
  symbol: string;
  x: number; // percentage
  y: number; // percentage
  duration: number;
  delay: number;
  parallaxSpeed: number;
  animationIndex: number; // Which keyframe animation to use
  fontSize: string;
}

interface CodeParticlesProps {
  count?: number;
  area?: "hero" | "section" | "full";
  colorScheme?: "primary" | "accent" | "mixed";
}

const CODE_SYMBOLS = [
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  "<",
  ">",
  ";",
  ":",
  "=>",
  "const",
  "let",
  "function",
  "return",
  "//",
  "import",
  "export",
];

const CodeParticles = ({
  count = 15,
  area = "full",
  colorScheme = "mixed",
}: CodeParticlesProps) => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // Generate particles once on mount
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const particle: CodeParticle = {
        id: i,
        symbol: CODE_SYMBOLS[Math.floor(Math.random() * CODE_SYMBOLS.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: 15 + Math.random() * 10, // 15-25 seconds
        delay: Math.random() * 5, // 0-5 second delay
        parallaxSpeed: 0.3 + Math.random() * 0.5, // 0.3-0.8x speed
        animationIndex: Math.floor(Math.random() * 4) + 1, // 1-4 (for keyframe variants)
        fontSize: Math.random() > 0.5 ? "text-sm" : "text-lg",
      };
      return particle;
    });
  }, [count]);

  // Get color class based on scheme
  const getColorClass = (index: number) => {
    if (colorScheme === "primary") return "text-primary";
    if (colorScheme === "accent") return "text-accent";
    // Mixed - alternate between primary, accent, and a pink hue
    const colors = ["text-primary", "text-accent", "text-pink-400"];
    return colors[index % colors.length];
  };

  // Get animation name based on index
  const getAnimationName = (index: number) => {
    return `float-random-${index}`;
  };

  // Respect user's reduced motion preference
  if (prefersReducedMotion) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none hide-mobile overflow-hidden"
      style={{ zIndex: 10 }}
      aria-hidden="true"
    >
      {particles.map((particle, index) => {
        return (
          <Particle
            key={particle.id}
            particle={particle}
            colorClass={getColorClass(index)}
            animationName={getAnimationName(particle.animationIndex)}
            scrollYProgress={scrollYProgress}
          />
        );
      })}
    </div>
  );
};

// Individual particle component to properly use hooks
const Particle = ({
  particle,
  colorClass,
  animationName,
  scrollYProgress,
}: {
  particle: CodeParticle;
  colorClass: string;
  animationName: string;
  scrollYProgress: any;
}) => {
  // Create parallax effect using scroll
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -100 * particle.parallaxSpeed]
  );

  return (
    <motion.div
      className={`absolute font-mono will-change-transform ${particle.fontSize} ${colorClass}`}
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        y, // Parallax effect
        animation: `${animationName} ${particle.duration}s ease-in-out infinite`,
        animationDelay: `${particle.delay}s`,
      }}
    >
      {particle.symbol}
    </motion.div>
  );
};

export default CodeParticles;
