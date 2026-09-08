import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface KineticTitleProps {
  /** The text to render. */
  text: string;
  className?: string;
  /** Base delay before the entrance starts (seconds). Default 0. */
  delay?: number;
}

/* ------------------------------------------------------------------------- */
/* KineticTitle — section heading with a clean fade + slide-up entrance.      */
/*                                                                            */
/* Renders as a single inline-block span that carries its OWN gradient fill   */
/* (white -> blue). It does not rely on a `background-clip: text` parent —    */
/* that combination broke once the span became inline-block / transformed,    */
/* leaving the headings garbled. Self-contained gradient = always correct.    */
/* Triggers once via whileInView so the heading is fully settled on screen.   */
/* ------------------------------------------------------------------------- */
const KineticTitle = ({ text, className, delay = 0 }: KineticTitleProps) => {
  const prefersReducedMotion = useReducedMotion();

  const gradientStyle: React.CSSProperties = {
    display: "inline-block",
    backgroundImage: "var(--gradient-text)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
    paddingBottom: "0.08em", // room for descenders under the clip box
  };

  if (prefersReducedMotion) {
    return (
      <span className={className} style={gradientStyle}>
        {text}
      </span>
    );
  }

  return (
    <motion.span
      className={className}
      style={gradientStyle}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 80px 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {text}
    </motion.span>
  );
};

export default KineticTitle;
