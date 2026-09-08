import { motion } from "framer-motion";
import { useScene, SCENE_ORDER, type Scene } from "@/contexts/SceneContext";

/* ------------------------------------------------------------------------- */
/* ChapterStrip — vertical "film strip" indicator on the right edge that     */
/* shows the user which chapter (section) they're currently in. Replaces the */
/* generic 1-pixel scroll progress bar with something that reads as a film   */
/* — chapter number + title + active glow.                                   */
/* ------------------------------------------------------------------------- */

interface Chapter {
  scene: Scene;
  number: string;
  label: string;
  href: string | null; // null for hero (no nav link)
}

const CHAPTERS: Chapter[] = [
  { scene: "hero",       number: "01", label: "Intro",      href: null },
  { scene: "about",      number: "02", label: "About",      href: "#about" },
  { scene: "experience", number: "03", label: "Experience", href: "#experience" },
  { scene: "skills",     number: "04", label: "Skills",     href: "#skills" },
  { scene: "education",  number: "05", label: "Education",  href: "#education" },
  { scene: "projects",   number: "06", label: "Projects",   href: "#projects" },
];

/* Sanity check at module-evaluation time: chapters cover every Scene, in order. */
if (CHAPTERS.length !== SCENE_ORDER.length) {
  console.warn("ChapterStrip: CHAPTERS length doesn't match SCENE_ORDER");
}

const ChapterStrip = () => {
  const { activeScene } = useScene();

  return (
    <div
      className="fixed right-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-3 pointer-events-auto"
      style={{ zIndex: 40 }}
      aria-label="Section navigation"
    >
      {CHAPTERS.map((chapter) => {
        const isActive = chapter.scene === activeScene;
        const handleClick = () => {
          if (chapter.href) {
            document.querySelector(chapter.href)?.scrollIntoView({ behavior: "smooth" });
          } else if (chapter.scene === "hero") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        };

        return (
          <button
            key={chapter.scene}
            type="button"
            onClick={handleClick}
            className="group flex items-center gap-3 cursor-pointer focus:outline-none"
            aria-label={`Chapter ${chapter.number} — ${chapter.label}`}
            aria-current={isActive ? "true" : undefined}
          >
            {/* Chapter caption — slides in from the right when active. */}
            <motion.div
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                x: isActive ? 0 : 8,
              }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-end"
            >
              <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-foreground/45 leading-tight">
                {`// ${chapter.number}`}
              </span>
              <span className="font-mono text-xs text-primary leading-tight">
                {chapter.label}
              </span>
            </motion.div>

            {/* Notch — short cyan bar that grows + glows when active. */}
            <motion.span
              initial={false}
              animate={{
                width: isActive ? 24 : 12,
                opacity: isActive ? 1 : 0.45,
                boxShadow: isActive
                  ? "0 0 14px hsl(189, 94%, 50%, 0.7)"
                  : "0 0 0px hsl(189, 94%, 50%, 0)",
              }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="h-[2px] rounded-full bg-primary group-hover:opacity-100"
            />
          </button>
        );
      })}
    </div>
  );
};

export default ChapterStrip;
