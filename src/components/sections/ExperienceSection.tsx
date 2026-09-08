import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Briefcase, MapPin, Calendar } from "lucide-react";
import { experiences } from "@/data/profile";
import { ScrollReveal, TiltCard, KineticTitle } from "@/components/animated";
import { parseBulletWithCounts } from "@/components/animated/CountUp";
import { useScene } from "@/contexts/SceneContext";

const ExperienceSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { registerSection } = useScene();

  useEffect(() => registerSection("experience", sectionRef), [registerSection]);

  /*
   * Two scroll subscriptions:
   *  - sectionScroll: drives the parallax and timeline-line draw
   *  - per-card scroll handled inside ScrollReveal
   */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [110, -110]);

  /* Timeline line "draws" itself as you scroll through the section. */
  const timelineProgress = useScroll({
    target: sectionRef,
    offset: ["start 70%", "end 30%"],
  }).scrollYProgress;
  const timelineScaleY = useTransform(timelineProgress, [0, 1], [0, 1]);

  return (
    <section id="experience" ref={sectionRef} className="py-24 px-4 relative">
      <motion.div style={{ y }} className="container mx-auto max-w-4xl">
        {/* Section Title — kinetic word-by-word reveal. */}
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-center text-gradient">
          <KineticTitle text="Experience" />
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.6 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-foreground/60 font-mono text-sm mb-12"
        >
          {"// career.timeline()"}
        </motion.p>

        {/* Timeline */}
        <div className="relative">
          {/*
            Animated timeline line — scaleY is driven by section scroll progress.
            The line literally "draws itself" as you scroll past the cards.
            transform-origin: top so it grows downward.
          */}
          <motion.div
            className="hidden md:block timeline-line"
            style={{ scaleY: timelineScaleY, transformOrigin: "top" }}
          />

          <div className="space-y-8">
            {experiences.map((exp, index) => (
              <ScrollReveal key={`${exp.company}-${index}`} from="right" intensity={1}>
                <div className="relative md:pl-16">
                  <div className="hidden md:block timeline-dot top-8" />

                  <TiltCard>
                  <motion.div
                    className="panel p-6 md:p-8"
                    whileHover={{
                      y: -8,
                      boxShadow: "0 20px 60px rgba(37,99,235, 0.18)",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                      <div className="flex items-start gap-4">
                        {exp.logoUrl ? (
                          <img
                            src={exp.logoUrl}
                            alt={`${exp.company} logo`}
                            className="w-12 h-12 md:w-14 md:h-14 rounded-xl border border-white/10 shadow-lg object-contain bg-white/95 shrink-0 p-1.5"
                          />
                        ) : (
                          <div
                            aria-hidden
                            className="w-12 h-12 md:w-14 md:h-14 rounded-xl border border-primary/20 bg-primary/10 text-primary shrink-0 flex items-center justify-center font-display text-xl md:text-2xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                          >
                            {exp.company.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-1">
                            {exp.role}
                          </h3>
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <Briefcase size={16} />
                            {exp.company}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-1 text-sm text-foreground/70 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-accent" />
                          <span className="font-mono text-xs tracking-wide">{exp.period}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-accent" />
                          <span>{exp.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="text-foreground/80 leading-relaxed text-sm md:text-base mb-6">
                      {parseBulletWithCounts(exp.summary)}
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-white/5">
                      {exp.skills.map((skill, skillIndex) => (
                        <span 
                          key={skillIndex} 
                          className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium tracking-wide hover:bg-blue-500/20 transition-colors cursor-default"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                  </TiltCard>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ExperienceSection;
