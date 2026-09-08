import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { AnimatePresence, motion } from "framer-motion";
import AuroraBackground from "@/components/AuroraBackground";
import CursorGlow from "@/components/CursorGlow";
import ScrollMotionBlur from "@/components/ScrollMotionBlur";
import { GeometricAmbience, ChapterStrip, SceneCutLine, SectionCutSentinel, ConstellationField } from "@/components/animated";
import NavBar from "@/components/NavBar";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import SkillsSection from "@/components/sections/SkillsSection";
import EducationSection from "@/components/sections/EducationSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import Footer from "@/components/Footer";
import ResumeModal from "@/components/ResumeModal";
import BackToTop from "@/components/BackToTop";
import IntroOverlay from "@/components/intro/IntroOverlay";
import { IntroProvider, useIntro } from "@/contexts/IntroContext";
import { SceneProvider, useScene } from "@/contexts/SceneContext";
import { profile } from "@/data/profile";

const Index = () => {
  return (
    <IntroProvider>
      <SceneProvider>
        <IndexInner />
      </SceneProvider>
    </IntroProvider>
  );
};

const IndexInner = () => {
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const { phase, replayIntro } = useIntro();
  const { isWarping } = useScene();

  /* Body content fades in once the dive completes — synced with overlay's fade-out. */
  /* Body hides during warp so only the constellation is visible */
  const bodyVisible = phase === "done" && !isWarping;

  /*
   * Force-close the resume modal whenever we leave the "done" phase.
   * Without this, replaying the intro with the modal open would unmount the
   * modal but preserve `isResumeModalOpen=true`, causing it to pop open again
   * the moment the body re-mounts — jarring and unintentional.
   */
  useEffect(() => {
    if (phase !== "done") setIsResumeModalOpen(false);
  }, [phase]);

  return (
    <>
      <Helmet>
        <title>Robert Li</title>
        <meta
          name="description"
          content={`${profile.name} - ${profile.tagline}. ${profile.about.bio.substring(0, 150)}...`}
        />
        <meta property="og:title" content={`${profile.name} | ${profile.tagline}`} />
        <meta
          property="og:description"
          content={profile.about.bio.substring(0, 150)}
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={profile.contact.website} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${profile.name} | ${profile.tagline}`} />
        <meta
          name="twitter:description"
          content={profile.about.bio.substring(0, 150)}
        />
        <link rel="canonical" href={profile.contact.website} />
      </Helmet>

      <div className="relative min-h-screen">
        {/* Feature A: Cursor glow halo — always on */}
        <CursorGlow />
        {/* Feature C: Scroll-velocity motion blur — writes --scroll-blur CSS var */}
        <ScrollMotionBlur />
        {/* Constellation canvas — persistent across intro/ambient. Reads phase from context. */}
        <ConstellationField rotationSpeed={0.003} />

        {/* Intro overlay — only renders during intro/diving phases. */}
        <IntroOverlay />

        {/*
          Body content is *conditionally mounted* when the dive completes.
          Each child therefore runs its entry animation at the exact moment
          the user sees it — no more "animations fired while invisible".
        */}
        {/*
          `initial={false}` on AnimatePresence: skips the body fade-in for
          returning visitors who land directly with phase="done". Their cinematic
          hero reveal still plays (those animations live inside the body), but
          the body wrapper itself doesn't flash from opacity 0.
          `exit` ensures replay-from-nav unmounts gracefully instead of vanishing.
        */}
        <AnimatePresence initial={false}>
          {bodyVisible && (
            <motion.div
              key="portfolio-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <ChapterStrip />
              <SceneCutLine />
              <AuroraBackground />
              <GeometricAmbience shapeCount={10} colorPalette={["cyan", "purple", "pink"]} />

              <NavBar
                onResumeClick={() => setIsResumeModalOpen(true)}
                onLogoClick={replayIntro}
              />

              <main>
                <HeroSection onResumeClick={() => setIsResumeModalOpen(true)} />
                <SectionCutSentinel />
                <AboutSection />
                <SectionCutSentinel />
                <ExperienceSection />
                <SectionCutSentinel />
                <SkillsSection />
                <SectionCutSentinel />
                <EducationSection />
                <SectionCutSentinel />
                <ProjectsSection />
              </main>

              <Footer />

              <ResumeModal
                isOpen={isResumeModalOpen}
                onClose={() => setIsResumeModalOpen(false)}
              />

              <BackToTop />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Index;
