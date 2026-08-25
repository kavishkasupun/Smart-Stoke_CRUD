import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing an input value.
 * Useful for delaying search queries until the user has stopped typing.
 *
 * @param {any} value - The value to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {any} The debounced value.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes before the delay ends (e.g. user keeps typing)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
