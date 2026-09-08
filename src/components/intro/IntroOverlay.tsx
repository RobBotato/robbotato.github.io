import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useIntro } from "@/contexts/IntroContext";
import { profile } from "@/data/profile";
import { playClick, playDive } from "./audio";

const TYPEWRITER_TEXT = "// initializing portfolio...";

const IntroOverlay = () => {
  const { phase, startDive, skipIntro } = useIntro();

  if (phase === "done") return null;

  return (
    <AnimatePresence>
      {(phase === "intro" || phase === "diving") && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-30 flex items-center justify-center"
          style={{ pointerEvents: phase === "diving" ? "none" : "auto" }}
        >
          {/* Vignette: opaque at edges, transparent in middle so the constellation shows through. */}
          <DiveBackdrop diving={phase === "diving"} />

          {/* Scanlines for cinematic CRT feel — very subtle */}
          <div
            className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 3px)",
            }}
          />

          {/* Skip button — top right */}
          {phase === "intro" && (
            <button
              onClick={skipIntro}
              className="absolute top-6 right-6 text-xs font-mono text-foreground/40 hover:text-foreground/80 transition-colors tracking-wider"
              aria-label="Skip intro"
            >
              [ esc ] skip
            </button>
          )}

          {/* Centered cinematic content */}
          {phase === "intro" && (
            <IntroContent
              onBegin={() => {
                playDive();
                startDive();
              }}
              onClickPing={playClick}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ------------------------------------------------------------------------- */
/* Backdrop: dark vignette that lifts away during the dive.                  */
/* ------------------------------------------------------------------------- */

const DiveBackdrop = ({ diving }: { diving: boolean }) => (
  <motion.div
    initial={{ opacity: 1 }}
    animate={{ opacity: diving ? 0 : 1 }}
    transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1], delay: diving ? 0.6 : 0 }}
    className="absolute inset-0 pointer-events-none"
    style={{
      background:
        "radial-gradient(ellipse at center, rgba(2,6,23,0.35) 0%, rgba(2,6,23,0.85) 55%, rgba(2,6,23,0.98) 100%)",
    }}
  />
);

/* ------------------------------------------------------------------------- */
/* Staged reveal — typewriter line, glitch name, tagline, BEGIN button.      */
/* ------------------------------------------------------------------------- */

const IntroContent = ({
  onBegin,
  onClickPing,
}: {
  onBegin: () => void;
  onClickPing: () => void;
}) => {
  return (
    <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
      {/* Stage 1: typewriter init line */}
      <Typewriter text={TYPEWRITER_TEXT} delayMs={300} />

      {/* Stage 2: glitched name reveal */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mt-6"
      >
        <GlitchText>{profile.name}</GlitchText>
      </motion.h1>

      {/* Stage 3: tagline */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.55, duration: 0.7 }}
        className="text-lg md:text-2xl text-foreground/70 mt-4 font-light"
      >
        {profile.tagline}
      </motion.p>

      {/* Stage 4: BEGIN button */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 2.05, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="mt-12"
      >
        <BeginButton onBegin={onBegin} onHover={onClickPing} />
      </motion.div>

      {/* Stage 5: small hint at bottom */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45 }}
        transition={{ delay: 2.8, duration: 0.8 }}
        className="absolute -bottom-24 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.3em] text-foreground/40 uppercase whitespace-nowrap"
      >
        press enter or click begin
      </motion.p>
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* Typewriter — chars appear one at a time with blinking cursor.             */
/* ------------------------------------------------------------------------- */

const Typewriter = ({ text, delayMs }: { text: string; delayMs: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const start = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) clearInterval(interval);
      }, 38);
      return () => clearInterval(interval);
    }, delayMs);
    return () => clearTimeout(start);
  }, [text, delayMs]);

  return (
    <div className="font-mono text-sm md:text-base text-accent/90 tracking-wide">
      <span>{text.slice(0, count)}</span>
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="inline-block w-[0.5ch] -mb-0.5"
      >
        ▍
      </motion.span>
    </div>
  );
};

/* ------------------------------------------------------------------------- */
/* GlitchText — RGB chromatic aberration on the name. Pure CSS.              */
/* ------------------------------------------------------------------------- */

const GlitchText = ({ children }: { children: string }) => {
  return (
    <span className="relative inline-block text-gradient">
      <span aria-hidden className="absolute inset-0 text-[#06b6d4] mix-blend-screen animate-[glitch-r_2.4s_infinite_ease-in-out]">
        {children}
      </span>
      <span aria-hidden className="absolute inset-0 text-[#10b981] mix-blend-screen animate-[glitch-g_2.4s_infinite_ease-in-out]">
        {children}
      </span>
      <span className="relative">{children}</span>
    </span>
  );
};

/* ------------------------------------------------------------------------- */
/* BeginButton — neon, pulsing, magnetic-feeling.                            */
/* ------------------------------------------------------------------------- */

const BeginButton = ({
  onBegin,
  onHover,
}: {
  onBegin: () => void;
  onHover: () => void;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onBegin}
      onMouseEnter={() => {
        setHovered(true);
        onHover();
      }}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scale: 0.94 }}
      className="group relative px-10 py-4 rounded-full font-mono font-semibold text-base tracking-[0.25em] uppercase overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(6,182,212,0.18) 0%, rgba(16,185,129,0.18) 100%)",
        border: "1px solid rgba(34,211,238,0.55)",
        color: "#a5f3fc",
        boxShadow:
          "0 0 0 0 rgba(6,182,212,0.4), 0 0 36px rgba(6,182,212,0.18) inset",
      }}
      aria-label="Begin — enter portfolio"
    >
      {/* Pulsing ring */}
      <motion.span
        aria-hidden
        animate={
          hovered
            ? { scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }
            : { scale: [1, 1.12, 1], opacity: [0.35, 0, 0.35] }
        }
        transition={{ duration: hovered ? 1.2 : 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: "0 0 0 2px rgba(34,211,238,0.55)" }}
      />

      {/* Sweep highlight on hover */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "linear-gradient(120deg, transparent 30%, rgba(34,211,238,0.35) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "marquee-scroll 1.6s linear infinite",
        }}
      />

      <span className="relative z-10 flex items-center gap-3">
        <span className="text-accent">{">"}</span>
        Begin
        <motion.span
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="text-accent"
        >
          ▮
        </motion.span>
      </span>
    </motion.button>
  );
};

export default IntroOverlay;
