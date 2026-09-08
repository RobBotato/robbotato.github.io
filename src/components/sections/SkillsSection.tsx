import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SiReact, SiPython, SiTypescript, SiAmazon, SiDocker, SiPostgresql, SiNodedotjs, SiFastapi } from "react-icons/si";
import { SkillsGlobe, ScrollReveal, TiltCard, KineticTitle } from "@/components/animated";
import { skillCategories } from "@/data/profile";
import { useScene } from "@/contexts/SceneContext";

const techIcons = [
  { name: "React", icon: SiReact, color: "#61DAFB" },
  { name: "Python", icon: SiPython, color: "#3776AB" },
  { name: "TypeScript", icon: SiTypescript, color: "#3178C6" },
  { name: "AWS", icon: SiAmazon, color: "#FF9900" },
  { name: "Docker", icon: SiDocker, color: "#2496ED" },
  { name: "PostgreSQL", icon: SiPostgresql, color: "#4169E1" },
  { name: "Node.js", icon: SiNodedotjs, color: "#339933" },
  { name: "FastAPI", icon: SiFastapi, color: "#009688" },
];

const SkillsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { registerSection } = useScene();

  useEffect(() => registerSection("skills", sectionRef), [registerSection]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="skills" ref={sectionRef} className="py-24 px-4 relative">
      <div className="container mx-auto max-w-6xl relative">
        {/* Section Title — kinetic word-by-word reveal. */}
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-center text-gradient">
          <KineticTitle text="Skills & Technologies" />
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-center text-foreground/60 font-mono text-sm mb-12"
        >
          {"// click & drag the globe to explore the stack"}
        </motion.p>

        {/* Globe + Categories — side by side on lg, stacked on mobile.
            Globe is a peer of the grid now (not a faint background), so it
            actually reads as a feature instead of getting blurred out by glass. */}
        <div className="grid lg:grid-cols-5 gap-8 items-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-2 h-[400px] md:h-[500px] relative"
          >
            <SkillsGlobe />
            {/* Soft cyan/emerald glow underneath the canvas */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,hsl(189_94%_50%/0.18),transparent_60%)]" />
          </motion.div>

          <div className="lg:col-span-3 grid sm:grid-cols-2 gap-6">
          {skillCategories.map((category, categoryIndex) => (
            <ScrollReveal
              key={category.name}
              from={categoryIndex % 2 === 0 ? "left" : "right"}
              intensity={0.8}
            >
              <TiltCard className="h-full">
              <motion.div
                whileHover={{
                  y: -8,
                  boxShadow: "0 20px 60px rgba(6, 182, 212, 0.18)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="glass-strong rounded-2xl p-5 md:p-6 h-full"
              >
                <h3 className="font-display text-lg font-semibold mb-4 text-primary flex items-center gap-2">
                  <span className="font-mono text-accent text-sm">{`{`}</span>
                  {category.name}
                  <span className="font-mono text-accent text-sm">{`}`}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill, skillIndex) => (
                    <motion.span
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 0 18px rgba(6, 182, 212, 0.45)",
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.1 * categoryIndex + 0.02 * skillIndex,
                      }}
                      className="pill text-xs md:text-sm cursor-pointer"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
              </TiltCard>
            </ScrollReveal>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
