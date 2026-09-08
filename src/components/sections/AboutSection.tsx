import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { profile } from "@/data/profile";
import { ScrollReveal, TiltCard, KineticTitle } from "@/components/animated";
import { useScene } from "@/contexts/SceneContext";

const AboutSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { registerSection, triggerWarp } = useScene();
  const navigate = useNavigate();

  useEffect(() => registerSection("about", sectionRef), [registerSection]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  /* Pure parallax y for the section — entrance is handled by ScrollReveal. */
  const parallaxY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section id="about" ref={sectionRef} className="py-32 px-4 relative">
      <motion.div style={{ y: parallaxY }} className="container mx-auto max-w-4xl">
        <ScrollReveal from="zoom" intensity={1}>
        <TiltCard maxTilt={4}>
        <div className="glass-strong rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Subtle background glow that moves opposite to scroll */}
          <motion.div 
            style={{ y: useTransform(scrollYProgress, [0, 1], [-50, 50]) }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none"
          />
          {/* Section Title — kinetic word-by-word reveal. */}
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 text-gradient">
            <KineticTitle text="About Me" />
          </h2>

          {/* Bio */}
          <p className="text-lg md:text-xl text-foreground/90 leading-relaxed mb-8">
            {profile.about.bio}
          </p>

          {/* Highlight Chips */}
            <div className="flex flex-wrap gap-3 mb-10">
              {profile.about.highlights.map((highlight, index) => (
                <motion.span
                  key={highlight}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(11, 165, 236, 0.2)" }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className="pill bg-primary/10 text-primary border-primary/20 cursor-default"
                >
                  {highlight}
                </motion.span>
              ))}
            </div>

            {/* Warp Button */}
            <motion.button
              onClick={() => triggerWarp(() => navigate('/hobbies'))}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-display font-bold text-white bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-full overflow-hidden transition-colors"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <span>Explore My World</span>
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </motion.button>
          </div>
        </TiltCard>
        </ScrollReveal>
      </motion.div>
    </section>
  );
};

export default AboutSection;
