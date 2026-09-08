import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* -------------------------------------------------------------------------- */
/* CursorGlow — Idea A                                                        */
/*                                                                             */
/* Soft ~200px cyan halo follows the cursor across the entire page.            */
/* Fixed-position, low opacity, additive blend. Gives the page a luminous,     */
/* "alive surface" feel without being distracting.                             */
/*                                                                             */
/* Implementation: single fixed div + pointer-move listener, no React state    */
/* in the hot path — all updates go through ref.current.style to avoid         */
/* React re-render overhead at 60fps.                                          */
/* -------------------------------------------------------------------------- */
const CursorGlow = () => {
  const glowRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const el = glowRef.current;
    if (!el) return;

    let rafId: number | null = null;
    let cx = -200;
    let cy = -200;

    const handlePointerMove = (e: PointerEvent) => {
      cx = e.clientX;
      cy = e.clientY;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (el) {
            el.style.transform = `translate3d(${cx - 120}px, ${cy - 120}px, 0)`;
            el.style.opacity = "1";
          }
          rafId = null;
        });
      }
    };

    const handlePointerLeave = () => {
      if (el) el.style.opacity = "0";
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
      style={{
        width: 240,
        height: 240,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, hsl(189 94% 50% / 0.12) 0%, hsl(189 94% 50% / 0.04) 40%, transparent 70%)",
        opacity: 0,
        transition: "opacity 0.35s ease-out",
        willChange: "transform",
        mixBlendMode: "screen",
      }}
    />
  );
};

export default CursorGlow;
