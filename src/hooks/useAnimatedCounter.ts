import { useEffect, useRef, useState } from 'react';

const DURATION = 1100;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useAnimatedCounter(target: number, animate = true): number {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;

    if (!animate || prefersReduced) {
      setValue(target);
      return;
    }

    cancelAnimationFrame(rafRef.current);
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setValue(Math.round(from + (target - from) * easeOut(t)));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, animate]);

  return value;
}
