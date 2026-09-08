import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type IntroPhase = "intro" | "diving" | "done";

interface IntroContextValue {
  phase: IntroPhase;
  /** Mutable ref holding 0..1 dive progress. Read from useFrame for jank-free animation. */
  diveProgressRef: React.MutableRefObject<number>;
  startDive: () => void;
  replayIntro: () => void;
  skipIntro: () => void;
}

const STORAGE_KEY = "portfolio-intro-seen-v1";
const DIVE_DURATION_MS = 1800;

const IntroContext = createContext<IntroContextValue | null>(null);

export const useIntro = (): IntroContextValue => {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error("useIntro must be used within an IntroProvider");
  return ctx;
};

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const IntroProvider = ({ children }: { children: ReactNode }) => {
  const prefersReducedMotion = useReducedMotion();

  /* On first mount: skip intro if user has seen it OR prefers reduced motion. */
  const [phase, setPhase] = useState<IntroPhase>(() => {
    if (typeof window === "undefined") return "done";
    if (prefersReducedMotion) return "done";
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1" ? "done" : "intro";
    } catch {
      return "intro";
    }
  });

  const diveProgressRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const cancelDiveRaf = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const startDive = useCallback(() => {
    if (phase !== "intro") return;
    cancelDiveRaf();

    /*
     * Always land at the top of the portfolio when the dive completes.
     * Reset *before* the body fades in so the scroll happens while it's still hidden.
     */
    window.scrollTo(0, 0);

    /* Reduced-motion users skip the dive animation entirely. */
    if (prefersReducedMotion) {
      diveProgressRef.current = 1;
      try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* storage unavailable */ }
      setPhase("done");
      return;
    }

    setPhase("diving");
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DIVE_DURATION_MS);
      diveProgressRef.current = easeInOutCubic(t);

      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        rafIdRef.current = null;
        try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* storage unavailable */ }
        setPhase("done");
      }
    };
    rafIdRef.current = requestAnimationFrame(tick);
  }, [phase, prefersReducedMotion, cancelDiveRaf]);

  const replayIntro = useCallback(() => {
    cancelDiveRaf();
    diveProgressRef.current = 0;
    /* Lock scroll position now so when body re-shows, it's at top. */
    window.scrollTo(0, 0);
    setPhase("intro");
  }, [cancelDiveRaf]);

  const skipIntro = useCallback(() => {
    cancelDiveRaf();
    diveProgressRef.current = 1;
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* storage unavailable */ }
    setPhase("done");
  }, [cancelDiveRaf]);

  /* Lock body scroll while the intro is showing. */
  useEffect(() => {
    if (phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  /* Allow Esc to skip the intro. */
  useEffect(() => {
    if (phase === "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipIntro();
      else if (e.key === "Enter" && phase === "intro") startDive();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, skipIntro, startDive]);

  /* Cleanup any in-flight RAF on unmount. */
  useEffect(() => () => cancelDiveRaf(), [cancelDiveRaf]);

  const value = useMemo<IntroContextValue>(
    () => ({ phase, diveProgressRef, startDive, replayIntro, skipIntro }),
    [phase, startDive, replayIntro, skipIntro],
  );

  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
};
