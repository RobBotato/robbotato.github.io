import { useRef, useEffect } from "react";
import { useScroll, motion, useTransform } from "framer-motion";

interface ScrollVideoProps {
  src: string;
  className?: string;
  playbackRateMultiplier?: number;
}

const ScrollVideo = ({ src, className = "", playbackRateMultiplier = 1 }: ScrollVideoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // We will sync the video's currentTime to the scroll progress
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (video.duration) {
        // Scrub through the video based on scroll
        const targetTime = latest * video.duration * playbackRateMultiplier;
        // Clamp it to prevent errors
        video.currentTime = Math.min(Math.max(targetTime, 0), video.duration);
      }
    });

    return () => unsubscribe();
  }, [scrollYProgress, playbackRateMultiplier]);

  return (
    <motion.div 
      ref={containerRef} 
      style={{ opacity, scale }}
      className={`relative overflow-hidden rounded-3xl glass p-2 ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        className="w-full h-full object-cover rounded-2xl"
        preload="auto"
      />
      {/* Overlay to make it feel more integrated */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent pointer-events-none rounded-3xl" />
    </motion.div>
  );
};

export default ScrollVideo;
