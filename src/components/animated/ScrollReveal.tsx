import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type RevealDirection = "up" | "left" | "right" | "zoom";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Direction the block enters from. Default: "up". */
  from?: RevealDirection;
  /** Multiplier on the entry distance/rotation. 1 = standard, 1.5 = exaggerated. */
  intensity?: number;
  /** Disable the 3D rotation if you just want translation. */
  flat?: boolean;
  /** Optional delay in seconds before the entrance starts. */
  delay?: number;
}

/**
 * One-shot 3D entrance wrapper.
 *
 * Previously this was scroll-tied (transforms followed `scrollY`), which had
 * a subtle but real failure mode: when the user landed on a section via a
 * nav click or a fast scroll, cards lower in the section were stuck at
 * mid-animation (e.g. progress 0.7) because their scroll-tied transforms
 * never completed. Visually the cards looked "not fully arrived."
 *
 * The new model uses `whileInView` with `once: true`: the animation fires
 * once when the element enters the viewport, plays over a fixed 0.7s with
 * a smooth ease, then *latches* in the settled state. So whenever a section
 * is on screen, its content is guaranteed to be fully present.
 *
 * Trigger margin extends 150px below the viewport bottom so the animation
 * starts slightly before the element is visible — by the time the user is
 * focused on it, the entrance has already completed.
 *
 * Honors `prefers-reduced-motion`.
 */
const ScrollReveal = ({
  children,
  className,
  from = "up",
  intensity = 1,
  flat = false,
  delay = 0,
}: ScrollRevealProps) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  /* Initial transform values per direction. Settled state is always all-zeros + scale 1. */
  const startY = from === "up" ? 60 * intensity : 0;
  const startX =
    from === "left" ? -80 * intensity :
    from === "right" ? 80 * intensity : 0;
  const startRotateX = !flat && from === "up" ? -10 * intensity : 0;
  const startRotateY =
    !flat && from === "left" ? 14 * intensity :
    !flat && from === "right" ? -14 * intensity : 0;
  const startScale = from === "zoom" ? 0.85 : 0.95;

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: startX,
        y: startY,
        rotateX: startRotateX,
        rotateY: startRotateY,
        scale: startScale,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
      }}
      viewport={{ once: true, margin: "0px 0px 150px 0px" }}
      transition={{
        duration: 0.75,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        transformPerspective: 1100,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
