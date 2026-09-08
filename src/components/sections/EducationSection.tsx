import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Calendar, Award } from "lucide-react";
import { education } from "@/data/profile";
import { ScrollReveal, TiltCard, KineticTitle } from "@/components/animated";
import { useScene } from "@/contexts/SceneContext";

const EducationSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { registerSection } = useScene();

  useEffect(() => registerSection("education", sectionRef), [registerSection]);

  return (
    <section id="education" ref={sectionRef} className="py-24 px-4 relative">
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-center text-gradient">
          <KineticTitle text="Education" />
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.6 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-foreground/60 font-mono text-sm mb-12"
        >
          {"// academic.history"}
        </motion.p>

        <div className="space-y-6">
          {education.map((edu, index) => (
            <ScrollReveal
              key={edu.school}
              from={index % 2 === 0 ? "left" : "right"}
              intensity={1}
            >
              <TiltCard>
              <motion.div
                whileHover={{
                  y: -8,
                  boxShadow: "0 20px 60px rgba(6, 182, 212, 0.18)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="glass-strong rounded-3xl p-6 md:p-8"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <GraduationCap size={20} />
                      <span className="font-medium">{edu.school}</span>
                    </div>
                    <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
                      {edu.degree}
                    </h3>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-1 text-sm">
                    <div className="flex items-center gap-1.5 text-foreground/70">
                      <Calendar size={14} className="text-accent" />
                      <span className="font-mono text-xs tracking-wide">{edu.period}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award size={14} className="text-primary" />
                      <span className="font-mono font-semibold text-primary">
                        GPA: {edu.gpa}
                      </span>
                    </div>
                  </div>
                </div>

                {edu.details && (
                  <ul className="space-y-2 mt-4">
                    {edu.details.map((detail, detailIndex) => (
                      <li
                        key={detailIndex}
                        className="flex items-start gap-3 text-foreground/90 text-sm md:text-base"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0 shadow-[0_0_10px_hsl(var(--accent))]" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EducationSection;
