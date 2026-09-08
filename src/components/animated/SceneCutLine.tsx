import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useScene, Scene } from "@/contexts/SceneContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* ------------------------------------------------------------------------- */
/* SceneCutLine (CyberPulse) — A creative pulse effect that fires whenever   */
/* the active scene changes. Replaces the old horizontal line with an        */
/* expanding geometric ring and screen edge flashes for a futuristic feel.   */
/* ------------------------------------------------------------------------- */

const FLASH_DURATION_MS = 1000;

const SceneCutLine = () => {
  const { activeScene } = useScene();
  const prefersReducedMotion = useReducedMotion();
  const [flashKey, setFlashKey] = useState<number | null>(null);
  const isFirstRender = useRef(true);
  
  // Track which scenes have already triggered a pulse
  const pulsedScenes = useRef<Set<Scene>>(new Set());

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      pulsedScenes.current.add(activeScene);
      return;
    }
    
    // Only pulse if we haven't pulsed for this scene yet
    if (pulsedScenes.current.has(activeScene)) {
      return;
    }
    
    // Mark as pulsed
    pulsedScenes.current.add(activeScene);
    
    const key = performance.now();
    setFlashKey(key);
    const timeoutId = window.setTimeout(() => {
      setFlashKey((current) => (current === key ? null : current));
    }, FLASH_DURATION_MS);
    
    return () => window.clearTimeout(timeoutId);
  }, [activeScene]);

  if (prefersReducedMotion) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
      style={{ zIndex: 30 }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {flashKey !== null && (
          <>
            {/* Central Expanding Ring */}
            <motion.div
              key={`ring-${flashKey}`}
              initial={{ scale: 0.2, opacity: 0, borderWidth: "8px" }}
              animate={{ 
                scale: [0.2, 1.5, 3], 
                opacity: [0, 0.8, 0],
                borderWidth: ["8px", "2px", "0px"] 
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.8,
                ease: "easeOut"
              }}
              className="absolute rounded-full border-cyan-400"
              style={{
                width: "min(80vw, 600px)",
                height: "min(80vw, 600px)",
                boxShadow: "0 0 30px hsl(189, 94%, 50%, 0.4), inset 0 0 20px hsl(189, 94%, 50%, 0.2)"
              }}
            />

            {/* Subtle Screen Edge Flash */}
            <motion.div
              key={`flash-${flashKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay"
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SceneCutLine;
