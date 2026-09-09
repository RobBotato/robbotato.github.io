import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import { MapPin, Download, ChevronDown } from "lucide-react";
import { SiGithub, SiLinkedin } from "react-icons/si";
import { HiOutlineMail } from "react-icons/hi";
import { CodeParticles } from "@/components/animated";
import { profile } from "@/data/profile";
import { useScene } from "@/contexts/SceneContext";
import { scrollToSection } from "@/lib/sectionNavigation";

interface HeroSectionProps {
  onResumeClick: () => void;
}

/* ------------------------------------------------------------------------- */
/* Stage timings (seconds, relative to component mount).                     */
/* HeroSection is mounted only when phase === "done", so these run cleanly.  */
/* ------------------------------------------------------------------------- */
const STAGE = {
  pill: 0.45,
  typeStart: 0.85,
  charSpeedMs: 75,
  taglineOffset: 0.55,         // after typewriter finishes
  socialOffset: 1.0,           // after typewriter finishes
  ctaOffset: 1.55,             // after typewriter finishes
  scrollHintOffset: 2.4,       // after typewriter finishes
} as const;

/* ------------------------------------------------------------------------- */
/* Magnetic icon — DOM shape preserved exactly (single motion.a).            */
/*                                                                           */
/* The magnetic offset uses MotionValues piped through `style`, which        */
/* composes cleanly with the `animate` entry transforms (opacity/scale/      */
/* rotate). No wrapper divs — the anchor stays a direct flex child of the    */
/* parent so layout is identical to the original.                            */
/* ------------------------------------------------------------------------- */
const MagneticIcon = ({
  children,
  href,
  label,
  entryDelay = 0,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
  entryDelay?: number;
}) => {
  /* MotionValues for magnetic offset — driven imperatively, never via `animate`. */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 16);
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 16);
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="p-4 glass rounded-2xl transition-all"
      aria-label={label}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      /* Magnetic x/y in style (MotionValues), entry transforms in animate. */
      style={{ x: mx, y: my }}
      initial={{ opacity: 0, scale: 0.4, rotate: -25 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 13,
        mass: 1,
        delay: entryDelay,
      }}
    >
      {children}
    </motion.a>
  );
};

/* ------------------------------------------------------------------------- */
/* Typewriter that owns its own state — true setState-driven character feed. */
/* ------------------------------------------------------------------------- */
const TypewriterName = ({
  text,
  startDelaySec,
  charSpeedMs,
  onComplete,
}: {
  text: string;
  startDelaySec: number;
  charSpeedMs: number;
  onComplete?: () => void;
}) => {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cursorFadeId: ReturnType<typeof setTimeout> | null = null;

    const startId = setTimeout(() => {
      let i = 0;
      intervalId = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) {
          if (intervalId) clearInterval(intervalId);
          /* Cursor lingers and blinks for a beat after the last char lands. */
          cursorFadeId = setTimeout(() => {
            setDone(true);
            onComplete?.();
          }, 700);
        }
      }, charSpeedMs);
    }, startDelaySec * 1000);

    return () => {
      clearTimeout(startId);
      if (intervalId) clearInterval(intervalId);
      if (cursorFadeId) clearTimeout(cursorFadeId);
    };
  }, [text, startDelaySec, charSpeedMs, onComplete]);

  const visible = text.slice(0, count).replace(/ /g, " ");

  return (
    <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-bold mb-6 tracking-tight relative">
      <span className="text-gradient">{visible}</span>
      {!done && (
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="inline-block ml-1 -mb-1 w-[0.08em] h-[0.85em] bg-primary align-middle"
          style={{ boxShadow: "0 0 14px hsl(var(--primary))" }}
        />
      )}
    </h1>
  );
};

/* ------------------------------------------------------------------------- */
/* Main HeroSection component.                                               */
/* ------------------------------------------------------------------------- */
const HeroSection = ({ onResumeClick }: HeroSectionProps) => {
  /*
   * Pre-compute the typewriter's total duration so every downstream stage
   * (tagline, social icons, CTAs, scroll hint) can schedule itself reliably
   * with a Framer `delay`. More deterministic than waiting on a callback.
   *
   *   start delay + (chars × charSpeed) + 700ms cursor linger
   */
  const typewriterEndSec =
    STAGE.typeStart +
    (profile.name.length * STAGE.charSpeedMs) / 1000 +
    0.7;

  /*
   * Pinned-hero "camera pull-back."
   *
   * The hero is wrapped in a 200vh outer container; the inner section sticks
   * to the viewport top for the first 100vh of scroll. During that pin, the
   * hero content slides up and fades — like a camera pulling back into the
   * rest of the film. The outer container is what we register with the
   * SceneDirector, so "hero" stays the active scene for the full 200vh.
   */
  const outerRef = useRef<HTMLDivElement>(null);
  const { registerSection } = useScene();

  useEffect(() => registerSection("hero", outerRef), [registerSection]);

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end start"],
  });

  /* Hero content rises and fades. Non-linear opacity range so it doesn't vanish too early. */
  const heroY = useTransform(heroScrollProgress, [0, 1], ["0%", "-32%"]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.6, 0.85], [1, 0.4, 0]);
  /* Subtle scale-down compounds the "camera pulling back" feeling. */
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 0.92]);
  /*
   * No on-screen chapter caption during the pull-back: the chapter strip on
   * the right edge already indicates which chapter is active, and the
   * match-cut line fires at the boundary. Adding a center caption fought the
   * constellation visually as it travelled between marks.
   */

  return (
    <div
      id="hero"
      ref={outerRef}
      className="relative"
      style={{ height: "200vh" }}
    >
      <section className="sticky top-0 h-screen flex items-center justify-center pt-20 pb-12 px-4 overflow-hidden">
      <motion.div
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="container mx-auto max-w-7xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* LEFT: Hero Content */}
          <div className="text-center lg:text-left">
            {/* Stage 1: Location pill */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 18,
                delay: STAGE.pill,
              }}
              className="inline-flex items-center gap-2 pill mb-8"
            >
              <MapPin size={14} className="text-primary" />
              <span className="text-sm text-foreground/80">{profile.region}</span>
            </motion.div>

            {/* Stage 2: Mono prompt + Typewriter name */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              transition={{ delay: STAGE.typeStart - 0.3, duration: 0.4 }}
              className="font-mono text-xs tracking-[0.25em] uppercase text-accent mb-3"
            >
              {"> whoami"}
            </motion.div>

            <TypewriterName
              text={profile.name}
              startDelaySec={STAGE.typeStart}
              charSpeedMs={STAGE.charSpeedMs}
            />

            {/* Stage 3: Tagline — fades + slides up after typewriter completes */}
            <motion.p
              initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: typewriterEndSec + STAGE.taglineOffset,
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-xl md:text-2xl text-muted-foreground mb-10 font-light"
            >
              {profile.tagline}
            </motion.p>

            {/*
              Stage 4: Social Icons — staggered spring bounce.
              No wrapper divs — each MagneticIcon is a direct flex child,
              identical DOM shape to the original. Stagger is achieved via
              per-icon `entryDelay` prop instead of variants.
            */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-10">
              <MagneticIcon
                href={profile.contact.github}
                label="GitHub"
                entryDelay={typewriterEndSec + STAGE.socialOffset}
              >
                <SiGithub size={24} />
              </MagneticIcon>
              <MagneticIcon
                href={profile.contact.linkedin}
                label="LinkedIn"
                entryDelay={typewriterEndSec + STAGE.socialOffset + 0.12}
              >
                <SiLinkedin size={24} />
              </MagneticIcon>
              <MagneticIcon
                href={`mailto:${profile.contact.email}`}
                label="Email"
                entryDelay={typewriterEndSec + STAGE.socialOffset + 0.24}
              >
                <HiOutlineMail size={24} />
              </MagneticIcon>
            </div>

            {/* Stage 5: CTAs — slide in from opposite sides, "collide" in the middle */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
              <motion.button
                onClick={onResumeClick}
                /* Resume drops in from off-screen-left with overshoot. */
                initial={{ x: -340, opacity: 0, rotate: -8 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 14,
                  mass: 1.1,
                  delay: typewriterEndSec + STAGE.ctaOffset,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold transition-colors hover:bg-primary/90 flex items-center gap-2 btn-shimmer shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
              >
                <Download size={20} />
                View Resume
              </motion.button>
              <motion.button
                type="button"
                onClick={() => scrollToSection("about")}
                /* Learn More crashes in from the right slightly later — feels like a collision. */
                initial={{ x: 340, opacity: 0, rotate: 8 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 14,
                  mass: 1.1,
                  delay: typewriterEndSec + STAGE.ctaOffset + 0.15,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl glass font-semibold transition-all"
              >
                Learn More
              </motion.button>
            </div>
          </div>

          {/* RIGHT: Reserved space for the constellation */}
          <div className="hidden lg:block h-[700px] w-[700px] relative" />
        </div>
      </motion.div>

      {/*
        Stage 6: Scroll Indicator — last to fade in.
        Wrapped in an outer motion.div tied to heroOpacity so it fades alongside
        the hero content during the pinned camera pull-back. CSS opacity
        multiplies through the tree, so the inner mount-time fade-in still works.
      */}
      <motion.div
        style={{ opacity: heroOpacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: typewriterEndSec + STAGE.scrollHintOffset,
            duration: 0.8,
          }}
          className="flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-foreground/40">
            scroll
          </span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="p-2 glass rounded-full"
          >
            <ChevronDown size={20} className="text-foreground/60" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Code Particles — rendered last, fade in after the cinematic reveal completes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: typewriterEndSec + STAGE.scrollHintOffset, duration: 1.2 }}
      >
        <CodeParticles count={6} area="hero" colorScheme="mixed" />
      </motion.div>
      </section>

    </div>
  );
};

export default HeroSection;
