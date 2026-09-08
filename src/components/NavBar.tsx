import { useState, useEffect } from "react";
import { Menu, X, FileText } from "lucide-react";
import { navLinks, profile } from "@/data/profile";
import { motion, AnimatePresence } from "framer-motion";
import { useScene } from "@/contexts/SceneContext";
import GlitchText from "@/components/animated/GlitchText";

interface NavBarProps {
  onResumeClick: () => void;
  onLogoClick?: () => void;
}

const NavBar = ({ onResumeClick, onLogoClick }: NavBarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { activeScene } = useScene();

  /*
   * Active link is derived from `activeScene` (single source of truth shared
   * with ChapterStrip), so the navbar highlight, the chapter strip, and the
   * match-cut line all switch in lockstep instead of via competing IOs.
   */
  const activeSection = activeScene === "hero" ? "" : `#${activeScene}`;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      /* Cinematic spring drop — first element to land after the dive. */
      initial={{ y: -140, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 90,
        damping: 16,
        mass: 1,
        delay: 0.1,
      }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div
          className={`glass rounded-2xl px-6 py-3 flex items-center justify-between transition-all duration-500 ${
            isScrolled ? "shadow-lg" : ""
          }`}
        >
          {/* Logo — click to replay intro (or scroll to top if no replay handler). */}
          <button
            type="button"
            onClick={() => {
              if (onLogoClick) {
                onLogoClick();
              } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="font-display font-bold text-xl text-gradient relative group"
            title="Replay intro"
            aria-label="Replay intro"
          >
            <GlitchText text={`${profile.name.split(" ")[0]}.dev`} className="font-display font-bold text-xl text-gradient">
              {profile.name.split(" ")[0]}
              <span className="text-foreground/60">.dev</span>
            </GlitchText>
            {/* Subtle hint underline that reveals on hover */}
            <span className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform origin-left bg-gradient-to-r from-primary to-accent" />
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-300 ${
                  activeSection === link.href
                    ? "text-primary"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {activeSection === link.href && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 bg-primary/20 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </button>
            ))}
            <button
              onClick={onResumeClick}
              className="ml-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 flex items-center gap-2"
            >
              <FileText size={16} />
              Resume
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-foreground/5 transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 glass rounded-2xl p-4 overflow-hidden"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleNavClick(link.href)}
                    className={`px-4 py-3 rounded-xl text-left font-medium transition-all ${
                      activeSection === link.href
                        ? "bg-primary/20 text-primary"
                        : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onResumeClick();
                  }}
                  className="mt-2 px-4 py-3 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-2 justify-center"
                >
                  <FileText size={16} />
                  Resume
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default NavBar;
