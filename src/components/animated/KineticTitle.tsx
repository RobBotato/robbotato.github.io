import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface KineticTitleProps {
  /** The text to render. Will be split on whitespace; each word animates independently. */
  text: string;
  className?: string;
  /** Stagger between word entrances (seconds). Default 0.08. */
  stagger?: number;
  /** Base delay before the first word starts (seconds). Default 0. */
  delay?: number;
}

/* ------------------------------------------------------------------------- */
/* KineticTitle — section title that builds itself word-by-word.              */
/*                                                                            */
/* Each word slides up + unblurs + scales in with a staggered delay, giving   */
/* section headings a cinematic "type-in" reveal that's far more distinctive  */
/* than a single fade-in. Triggers once via whileInView so it's always fully  */
/* present when the section is on screen.                                     */
/*                                                                            */
/* The outer span carries the gradient/text styling. CSS `background-clip:    */
/* text` propagates to inline-block children, so the gradient continues to    */
/* read across word boundaries even though each word is its own motion span.  */
/* ------------------------------------------------------------------------- */
const KineticTitle = ({
  text,
  className,
  stagger = 0.08,
  delay = 0,
}: KineticTitleProps) => {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) {
    return <span className={className}>{text}</span>;
  }

  const words = text.split(/\s+/);

  return (
    <motion.span
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px 80px 0px" }}
      className={className}
      style={{ display: "inline-block" }}
      aria-label={text}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          aria-hidden="true"
          variants={{
            hidden: { opacity: 0, y: 32, filter: "blur(8px)", scale: 0.92 },
            visible: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
          }}
          transition={{
            duration: 0.7,
            delay: delay + i * stagger,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            display: "inline-block",
            /* Reserve a real space character between words so word-wrap behaves naturally. */
            marginRight: i < words.length - 1 ? "0.28em" : 0,
            willChange: "transform, opacity, filter",
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default KineticTitle;
