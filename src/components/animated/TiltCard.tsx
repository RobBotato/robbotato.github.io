import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Maximum tilt angle in degrees on each axis. Default 6°. */
  maxTilt?: number;
}

/* ------------------------------------------------------------------------- */
/* TiltCard — cursor-driven 3D tilt wrapper.                                  */
/*                                                                            */
/* The same MotionValue + style composition pattern used by `MagneticIcon`    */
/* in HeroSection: cursor position drives `rotateX/Y` via MotionValues that   */
/* feed `style`, which composes cleanly with any `animate` props on inner     */
/* elements (so this works inside ScrollReveal without fighting it).          */
/*                                                                            */
/* Subtle (±6°) and spring-damped — adds physicality without being gimmicky.   */
/* ------------------------------------------------------------------------- */
const TiltCard = ({ children, className, maxTilt = 6 }: TiltCardProps) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  /*
   * Springs smooth out raw mouse position so even fast cursor flicks produce
   * a flowing tilt instead of a snap. Restore-to-zero on mouseleave is also
   * handled by the spring (we just write 0 to the source MotionValue).
   */
  const rxSource = useMotionValue(0);
  const rySource = useMotionValue(0);
  const rotateX = useSpring(rxSource, { stiffness: 220, damping: 22, mass: 0.6 });
  const rotateY = useSpring(rySource, { stiffness: 220, damping: 22, mass: 0.6 });

  if (prefersReducedMotion) {
    /* Reduced-motion users get a static card — no tilt, no perspective work. */
    return <div className={className}>{children}</div>;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 .. 0.5
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    /* Invert Y so cursor-up tilts the top toward the user (more natural). */
    rxSource.set(-cy * 2 * maxTilt);
    rySource.set(cx * 2 * maxTilt);
  };

  const handleMouseLeave = () => {
    rxSource.set(0);
    rySource.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1100,
        transformStyle: "preserve-3d",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default TiltCard;
