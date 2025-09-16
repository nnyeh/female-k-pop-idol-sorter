import { useState, useEffect, useRef } from 'react';

const easeOutCubic = (t: number): number => --t * t * t + 1;

/**
 * A custom hook that animates a number from its previous value to a new target value.
 * @param endValue The target number to animate to.
 * @param duration The duration of the animation in milliseconds.
 * @returns The current animated value.
 */
const useAnimatedCounter = (endValue: number, duration: number = 400): number => {
  const [displayValue, setDisplayValue] = useState(endValue);
  const frameId = useRef<number | null>(null);
  const startValue = useRef(endValue);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    // Set the start of the animation from the last displayed value
    startValue.current = displayValue;
    startTime.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - (startTime.current || now);
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const current = startValue.current + (endValue - startValue.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameId.current = requestAnimationFrame(animate);
      } else {
        // Ensure it settles on the exact final value
        setDisplayValue(endValue);
      }
    };

    // Cancel any ongoing animation before starting a new one
    if (frameId.current) {
      cancelAnimationFrame(frameId.current);
    }
    frameId.current = requestAnimationFrame(animate);

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, [endValue, duration]);

  return displayValue;
};

export default useAnimatedCounter;