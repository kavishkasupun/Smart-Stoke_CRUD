import { useState, useEffect } from 'react';

/**
 * Hook to listen for a CSS media query match.
 *
 * @param {string} query - A CSS media query string, e.g. '(min-width: 768px)'
 * @returns {boolean} Whether the media query currently matches
 *
 * @example
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * const isTablet = useMediaQuery('(min-width: 768px)');
 * const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
