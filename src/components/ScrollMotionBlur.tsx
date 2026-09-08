import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* -------------------------------------------------------------------------- */
/* ScrollMotionBlur — Idea C                                                  */
/*                                                                             */
/* When the user scrolls fast, body content gets a brief, subtle motion blur  */
/* (CSS filter blur, ~2px max). Mimics a film camera's natural motion blur.   */
/* Imperceptible at slow scroll, very cinematic at fast scroll.               */
/*                                                                             */
/* Implementation: measure scroll velocity per frame, write to a CSS custom   */
/* property on <body>. A CSS rule on `main` reads the variable as a filter.   */
/* We clamp to 2px max so it never looks broken. The decay is handled per-    */
/* frame so the blur smoothly fades even after the user stops scrolling.      */
/* -------------------------------------------------------------------------- */
const ScrollMotionBlur = () => {
  const prefersReducedMotion = useReducedMotion();
  const lastScrollY = useRef(0);
  const lastTime = useRef(performance.now());
  const currentBlur = useRef(0);
  const rafId = useRef<number | null>(null);

  const tick = useCallback(() => {
    const now = performance.now();
    const dt = now - lastTime.current;
    lastTime.current = now;

    if (dt > 0) {
      const currentY = window.scrollY;
      const velocity = Math.abs(currentY - lastScrollY.current) / dt; // px/ms
      lastScrollY.current = currentY;

      // Map velocity to blur: 0 at slow scroll, max 1px at fast scroll
      // Halving the max blur radius drastically reduces GPU convolution overhead
      const targetBlur = Math.min(velocity * 0.3, 1.0);

      // Smooth interpolation: attack faster than decay for a natural feel
      if (targetBlur > currentBlur.current) {
        currentBlur.current += (targetBlur - currentBlur.current) * 0.4;
      } else {
        currentBlur.current += (targetBlur - currentBlur.current) * 0.15;
      }

      // Only update the DOM if blur is meaningful (avoids thrashing for no reason)
      if (currentBlur.current > 0.05) {
        document.documentElement.style.setProperty(
          "--scroll-blur",
          `${currentBlur.current.toFixed(2)}px`
        );
      } else {
        currentBlur.current = 0;
        document.documentElement.style.setProperty("--scroll-blur", "0px");
      }
    }

    rafId.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    // Set initial CSS custom property
    document.documentElement.style.setProperty("--scroll-blur", "0px");

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      document.documentElement.style.removeProperty("--scroll-blur");
    };
  }, [prefersReducedMotion, tick]);

  // This component is purely side-effectful; it renders nothing.
  return null;
};

export default ScrollMotionBlur;
