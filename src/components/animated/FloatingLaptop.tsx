import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const CODE_SNIPPETS = [
  "const portfolio = () => {",
  "  return <Innovation />;",
  "};",
];

const FloatingLaptop = () => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [displayedCode, setDisplayedCode] = useState("");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  // Parallax effect - move slower than scroll
  const y = useTransform(scrollYProgress, [0, 0.3], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.3], [0.45, 0.45, 0]);

  // Typing animation
  useEffect(() => {
    const typingSpeed = 80; // milliseconds per character
    const pauseAtEnd = 2000; // pause before starting next line

    const timer = setTimeout(() => {
      const currentLine = CODE_SNIPPETS[currentLineIndex];

      if (currentCharIndex < currentLine.length) {
        // Still typing current line
        setDisplayedCode((prev) => prev + currentLine[currentCharIndex]);
        setCurrentCharIndex((prev) => prev + 1);
      } else {
        // Finished current line
        if (currentLineIndex < CODE_SNIPPETS.length - 1) {
          // Move to next line
          setDisplayedCode((prev) => prev + "\n");
          setCurrentLineIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        } else {
          // All lines complete, restart after pause
          setTimeout(() => {
            setDisplayedCode("");
            setCurrentLineIndex(0);
            setCurrentCharIndex(0);
          }, pauseAtEnd);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [currentCharIndex, currentLineIndex]);

  // Cursor blink
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  // Respect user's reduced motion preference
  if (prefersReducedMotion) return null;

  return (
    <motion.div
      className="absolute hidden lg:block pointer-events-none"
      style={{
        right: "10%",
        top: "40%",
        y, // Parallax
        opacity, // Fade on scroll
        zIndex: 10,
      }}
      animate={{
        y: [0, -15, 0],
        rotate: [-1, 1, -1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-hidden="true"
    >
      {/* Laptop Body */}
      <div className="relative w-[320px]">
        {/* Screen */}
        <div className="glass rounded-2xl p-4 shadow-2xl">
          {/* Screen Glow */}
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-20"
            style={{
              background:
                "radial-gradient(circle at center, hsl(var(--gradient-aurora-1)), transparent 70%)",
            }}
          />

          {/* Screen Content */}
          <div className="relative bg-black/90 rounded-lg p-4 font-mono text-xs leading-relaxed min-h-[120px]">
            <pre className="text-primary whitespace-pre-wrap">
              {displayedCode}
              {showCursor && (
                <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse" />
              )}
            </pre>
          </div>
        </div>

        {/* Laptop Base */}
        <div className="mt-1 h-2 rounded-b-xl glass" style={{ opacity: 0.6 }} />
      </div>
    </motion.div>
  );
};

export default FloatingLaptop;
