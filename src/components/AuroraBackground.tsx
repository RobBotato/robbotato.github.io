import { motion, useScroll, useTransform } from "framer-motion";

/*
 * Ambient backdrop for the monochrome-blue theme.
 *
 * Two slow blue glows on a black field + a faint moving scan grid, all tied
 * to page scroll so the background parallaxes behind the content. Much quieter
 * than a full aurora — it reads as "signal on black" to match the neural net.
 */
const AuroraBackground = () => {
  const { scrollYProgress } = useScroll();

  /* Parallax: glows drift up, grid drifts down, at different rates. */
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "-28%"]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const gridOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.05, 0.09, 0.05]);

  return (
    <>
      <motion.div className="aurora-bg" style={{ y: glowY }}>
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-5" />
      </motion.div>

      {/* Moving scan grid — parallax layer */}
      <motion.div
        aria-hidden
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          y: gridY,
          opacity: gridOpacity,
          backgroundImage:
            "linear-gradient(hsl(214 100% 70% / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(214 100% 70% / 0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />

      {/* Vignette — pure black edges for depth */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse at center, transparent 42%, hsl(0 0% 0% / 0.7) 100%)",
        }}
        aria-hidden
      />
      <div className="noise" />
    </>
  );
};

export default AuroraBackground;
