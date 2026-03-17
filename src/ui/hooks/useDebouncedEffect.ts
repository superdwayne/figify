import { useEffect, useRef } from 'react';

/**
 * A debounced version of useEffect that delays execution until after
 * the specified delay has passed since the last change to dependencies.
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delay: number = 500
): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<(() => void) | void>();

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // Run any previous cleanup
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current();
      }
      // Run the effect and store cleanup
      cleanupRef.current = effect();
    }, delay);

    // Cleanup on unmount or deps change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current();
      }
    };
  }, [...deps, delay]);
}
