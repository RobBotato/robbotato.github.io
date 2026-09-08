import { useRef, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

/* -------------------------------------------------------------------------- */
/* CountUp — Idea B                                                           */
/*                                                                             */
/* Animates a number from 0 to `end` when the element enters the viewport.    */
/* Used inside experience/project bullets to make metrics like "60%", "500+"  */
/* count up on view. The rest of the bullet text is passed as children.        */
/*                                                                             */
/* Accepts:                                                                    */
/*  - end: target number                                                       */
/*  - suffix: "%", "+", "K+", etc.                                             */
/*  - prefix: optional prefix like "$"                                         */
/*  - durationMs: how long the count-up takes (default 1200ms)                 */
/* -------------------------------------------------------------------------- */
interface CountUpProps {
  end: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
}

const CountUp = ({ end, suffix = "", prefix = "", durationMs = 1200 }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out quad for a satisfying deceleration
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(eased * end));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [started, end, durationMs]);

  return (
    <span ref={ref} className="font-mono font-semibold text-primary tabular-nums">
      {prefix}{started ? value : 0}{suffix}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* parseBulletWithCounts — utility                                             */
/*                                                                             */
/* Scans a bullet string for patterns like "60%", "500+", "$100K+",           */
/* "90%", etc. and replaces them with <CountUp> components. Returns a          */
/* ReactNode array suitable for rendering inline.                              */
/* -------------------------------------------------------------------------- */
const NUMBER_PATTERN = /(\$?\d[\d,]*\.?\d*)\s*(%|K\+|\+|x)?/g;

export const parseBulletWithCounts = (bullet: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  NUMBER_PATTERN.lastIndex = 0;

  while ((match = NUMBER_PATTERN.exec(bullet)) !== null) {
    const [fullMatch, numPart, suffixPart = ""] = match;
    const matchIndex = match.index;

    // Push any text before this match
    if (matchIndex > lastIndex) {
      parts.push(bullet.slice(lastIndex, matchIndex));
    }

    // Parse the number (strip $ and commas)
    const cleanNum = numPart.replace(/[$,]/g, "");
    const numValue = parseFloat(cleanNum);
    const hasPrefix = numPart.startsWith("$");

    // Only count-up if the number is meaningful (> 1) to avoid animating trivial values
    if (numValue > 1 && !isNaN(numValue)) {
      parts.push(
        <CountUp
          key={`${matchIndex}-${numValue}`}
          end={numValue}
          prefix={hasPrefix ? "$" : ""}
          suffix={suffixPart}
          durationMs={1000 + Math.min(numValue * 2, 800)}
        />
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Push any remaining text
  if (lastIndex < bullet.length) {
    parts.push(bullet.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [bullet];
};

export default CountUp;
