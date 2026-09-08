import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* ------------------------------------------------------------------------- */
/* SectionCutSentinel — a 1px scroll trigger placed between sections.        */
/*                                                                            */
/* When the sentinel scrolls into view, a one-shot "code rain" burst plays    */
/* and then unmounts. Replaces the previous always-on `CodeParticles` strips  */
/* between sections with a deliberate, scene-cut beat — much more cinematic.  */
/*                                                                            */
/* The burst is implemented inline (rather than via a new mode on             */
/* CodeParticles) because its motion shape and lifecycle differ enough that   */
/* a shared component would muddy both APIs.                                  */
/* ------------------------------------------------------------------------- */

const ARM_DELAY_MS = 700;       // wait this long after mount before allowing fires
const BURST_DURATION_MS = 1100; // cleanup the burst after this long

const CODE_GLYPHS = [
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  "<>",
  "=>",
  ";",
  "//",
  "const",
  "return",
  "import",
  "export",
  "function",
];

const SectionCutSentinel = () => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [isFiring, setIsFiring] = useState(false);
  /* Don't fire until the page has settled — sentinels in-viewport at mount shouldn't trigger. */
  const armedRef = useRef(false);
  /* Once-per-mount guard: scrolling back up past the sentinel doesn't replay the rain. */
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = ref.current;
    if (!el) return;

    const armTimeout = window.setTimeout(() => {
      armedRef.current = true;
    }, ARM_DELAY_MS);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!armedRef.current || hasFiredRef.current) return;
        if (entry.isIntersecting) {
          hasFiredRef.current = true;
          setIsFiring(true);
          window.setTimeout(() => setIsFiring(false), BURST_DURATION_MS);
        }
      },
      { threshold: 0.1 },
    );

    io.observe(el);

    return () => {
      window.clearTimeout(armTimeout);
      io.disconnect();
    };
  }, [prefersReducedMotion]);

  return (
    <>
      <div ref={ref} className="h-px w-full" aria-hidden="true" />
      {isFiring && <CodeRainBurst />}
    </>
  );
};

const CodeRainBurst = () => {
  /*
   * 14 drops, randomized at mount, fall from above the viewport down past it.
   * Each has its own column (x-percent), delay, duration, color tint, and size,
   * so even adjacent bursts feel distinct rather than mechanically identical.
   */
  const drops = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const colorIdx = i % 3;
        const colorClass =
          colorIdx === 0
            ? "text-primary"
            : colorIdx === 1
              ? "text-accent"
              : "text-pink-400";
        return {
          id: i,
          glyph: CODE_GLYPHS[Math.floor(Math.random() * CODE_GLYPHS.length)],
          /* Reserve the gutters so glyphs don't crowd against the chapter strip. */
          x: 6 + Math.random() * 80,
          delay: Math.random() * 0.18,
          duration: 0.7 + Math.random() * 0.3,
          colorClass,
          fontSize: i % 2 === 0 ? "text-sm" : "text-lg",
        };
      }),
    [],
  );

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 25 }}
      aria-hidden="true"
    >
      {drops.map((d) => (
        <motion.div
          key={d.id}
          initial={{ y: -60, opacity: 0 }}
          animate={{
            /*
             * 110vh ensures the glyph leaves the viewport entirely.
             * easeIn so they accelerate downward — feels like falling, not floating.
             */
            y: "110vh",
            opacity: [0, 0.85, 0],
          }}
          transition={{
            delay: d.delay,
            duration: d.duration,
            ease: "easeIn",
            opacity: { times: [0, 0.35, 1] },
          }}
          style={{ left: `${d.x}%`, top: 0 }}
          className={`absolute font-mono ${d.fontSize} ${d.colorClass}`}
        >
          {d.glyph}
        </motion.div>
      ))}
    </div>
  );
};

export default SectionCutSentinel;
