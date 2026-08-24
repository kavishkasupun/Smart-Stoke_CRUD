/**
 * Utility to conditionally join classNames together.
 * Filters out falsy values (false, null, undefined, 0, '').
 *
 * @param  {...(string|boolean|null|undefined)} classes
 * @returns {string}
 *
 * @example
 * cn('btn', isActive && 'btn-active', size === 'lg' && 'btn-lg')
 * // => 'btn btn-active btn-lg' (if both conditions are true)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
