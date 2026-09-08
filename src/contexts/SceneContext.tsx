import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";

/* ------------------------------------------------------------------------- */
/* Scene director.                                                            */
/*                                                                            */
/* The page is treated as a film: each section is a scene, and a single       */
/* IntersectionObserver decides which scene the viewport is currently in.     */
/* Background actors (constellation, chapter strip, match-cut line) subscribe via     */
/* `useScene()` and morph to scene-specific marks instead of reading raw      */
/* `scrollY`. This is what makes the constellation feel like a character with         */
/* intentions instead of background noise.                                     */
/* ------------------------------------------------------------------------- */

export type Scene =
  | "hero"
  | "about"
  | "experience"
  | "skills"
  | "education"
  | "projects";

export const SCENE_ORDER: readonly Scene[] = [
  "hero",
  "about",
  "experience",
  "skills",
  "education",
  "projects",
] as const;

interface SceneContextValue {
  /** State value — re-renders subscribers when the active scene changes. */
  activeScene: Scene;
  /** Mutable ref — read by `useFrame` in ConstellationField for jank-free animation. */
  activeSceneRef: MutableRefObject<Scene>;
  /** 0..1 progress of the active section relative to the viewport center. */
  sceneProgressRef: MutableRefObject<number>;
  /** Smoothed absolute scroll speed in px/ms. Read every frame by the 3D background. */
  scrollVelocityRef: MutableRefObject<number>;
  /** Sections call this in a useEffect to register themselves with the director. */
  registerSection: (id: Scene, ref: RefObject<HTMLElement>) => () => void;
  /** Global warp state for cinematic transitions out of the main page */
  isWarping: boolean;
  /** Trigger the warp transition and execute a callback (e.g. navigate) after animation */
  triggerWarp: (callback: () => void) => void;
}

const SceneContext = createContext<SceneContextValue | null>(null);

export const useScene = (): SceneContextValue => {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene must be used within a SceneProvider");
  return ctx;
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export const SceneProvider = ({ children }: { children: ReactNode }) => {
  /* id → ref. Used by the scroll listener to compute progress for the active section. */
  const sectionsRef = useRef<Map<Scene, RefObject<HTMLElement>>>(new Map());

  /* Hot-path values — read every frame by useFrame in the 3D background. */
  const activeSceneRef = useRef<Scene>("hero");
  const sceneProgressRef = useRef<number>(0);
  const scrollVelocityRef = useRef<number>(0);

  /* Tree-subscriber state — drives NavBar/ChapterStrip/SceneCutLine re-renders. */
  const [activeScene, setActiveScene] = useState<Scene>("hero");

  /* Single shared IO — populated lazily so registrations before the effect runs aren't lost. */
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementToSceneRef = useRef<Map<Element, Scene>>(new Map());
  /* Last-seen intersection ratio per scene — IO updates incrementally, we pick the max. */
  const ratioMapRef = useRef<Map<Scene, number>>(new Map());

  /* Warp transition state */
  const [isWarping, setIsWarping] = useState(false);

  const triggerWarp = useCallback((callback: () => void) => {
    setIsWarping(true);
    // Phase 1: spin-up 1.2s + Phase 2: zoom-through 1.8s = 3s total
    setTimeout(() => {
      callback();
      setTimeout(() => setIsWarping(false), 100);
    }, 3000);
  }, []);

  const recomputeActive = useCallback(() => {
    let bestScene: Scene | null = null;
    let bestRatio = 0;
    ratioMapRef.current.forEach((ratio, scene) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestScene = scene;
      }
    });
    /*
     * Hysteresis: only switch when *something* is meaningfully visible.
     * Prevents flicker between scenes during intro/replay when nothing is visible.
     */
    if (bestScene && bestRatio > 0.01 && bestScene !== activeSceneRef.current) {
      activeSceneRef.current = bestScene;
      setActiveScene(bestScene);
    }
  }, []);

  /* Build the shared IntersectionObserver once. */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const scene = elementToSceneRef.current.get(entry.target);
          if (!scene) return;
          ratioMapRef.current.set(
            scene,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        });
        recomputeActive();
      },
      {
        /* Many thresholds → smoother ratio updates as sections scroll past. */
        threshold: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
        /* Treat the central 60% of the viewport as the "stage" — fights edge flicker. */
        rootMargin: "-20% 0px -20% 0px",
      },
    );

    observerRef.current = io;
    /* Observe anything that registered before this effect ran. */
    elementToSceneRef.current.forEach((_, el) => io.observe(el));

    return () => {
      io.disconnect();
      observerRef.current = null;
    };
  }, [recomputeActive]);

  const registerSection = useCallback(
    (id: Scene, ref: RefObject<HTMLElement>): (() => void) => {
      const el = ref.current;
      if (!el) return () => {};

      sectionsRef.current.set(id, ref);
      elementToSceneRef.current.set(el, id);
      ratioMapRef.current.set(id, 0);
      observerRef.current?.observe(el);

      return () => {
        sectionsRef.current.delete(id);
        elementToSceneRef.current.delete(el);
        ratioMapRef.current.delete(id);
        observerRef.current?.unobserve(el);
      };
    },
    [],
  );

  /*
   * Passive scroll listener — updates `sceneProgressRef` (0..1) based on how
   * the active section's center has crossed the viewport center.
   *
   * Single rAF-coalesced computation per scroll tick keeps this cheap even
   * during fast scrolls. Only the *active* section is measured each frame —
   * not all six.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafPending = false;
    let lastY = window.scrollY;
    let lastT = performance.now();
    const compute = () => {
      rafPending = false;

      /* Scroll velocity (px/ms), smoothed — feeds the scroll-driven background. */
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        const v = Math.abs(window.scrollY - lastY) / dt;
        scrollVelocityRef.current = scrollVelocityRef.current * 0.7 + v * 0.3;
        lastY = window.scrollY;
        lastT = now;
      }

      const scene = activeSceneRef.current;
      const el = sectionsRef.current.get(scene)?.current;
      if (!el) {
        sceneProgressRef.current = 0;
        return;
      }
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      /*
       * Map "section center vs viewport center" into 0..1.
       * 0 when the section is entering from below, 1 when it has fully passed.
       * The (height + vh)/2 denominator normalizes for any section size.
       */
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = vh / 2;
      const halfRange = (rect.height + vh) / 2;
      const raw = (viewportCenter - sectionCenter + halfRange) / (2 * halfRange);
      sceneProgressRef.current = clamp01(raw);
    };

    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const value = useMemo<SceneContextValue>(
    () => ({
      activeScene,
      activeSceneRef,
      sceneProgressRef,
      scrollVelocityRef,
      registerSection,
      isWarping,
      triggerWarp,
    }),
    [activeScene, registerSection, isWarping, triggerWarp],
  );

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
};
