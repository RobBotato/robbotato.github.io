import { useState, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* -------------------------------------------------------------------------- */
/* GlitchText — Idea D                                                        */
/*                                                                             */
/* Hovering the wrapped text triggers a brief 200ms chromatic-aberration       */
/* glitch (R/G channel split + subtle scanline flicker), echoing the intro     */
/* overlay's glitch effect. Reinforces the "hacker" visual motif across the    */
/* page.                                                                       */
/*                                                                             */
/* Uses CSS pseudo-elements for the R and G channel layers so no extra DOM     */
/* nodes are created. The glitch animates via data-attribute toggling.         */
/* -------------------------------------------------------------------------- */
interface GlitchTextProps {
  children: ReactNode;
  className?: string;
  /** The raw text content — needed for the pseudo-element `content` attr. */
  text: string;
}

const GlitchText = ({ children, className = "", text }: GlitchTextProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [isGlitching, setIsGlitching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (prefersReducedMotion) return;
    setIsGlitching(true);

    // Clear any pending timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Auto-stop after 250ms
    timeoutRef.current = setTimeout(() => {
      setIsGlitching(false);
    }, 250);
  };

  if (prefersReducedMotion) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={`glitch-wrap ${className}`}
      data-text={text}
      data-glitching={isGlitching ? "true" : "false"}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </span>
  );
};

export default GlitchText;
