import { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable Select component.
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {string} [props.placeholder]
 * @param {Array<{value: string, label: string}>} [props.options=[]]
 * @param {boolean} [props.fullWidth=true]
 * @param {string} [props.className]
 * @param {string} [props.wrapperClassName]
 */
export const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    placeholder = 'Select an option',
    options = [],
    fullWidth = true,
    className,
    wrapperClassName,
    id,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn(fullWidth && 'w-full', wrapperClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-surface-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'block rounded-lg border bg-white text-surface-900 appearance-none',
            'text-sm',
            'transition-all duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-50',
            'cursor-pointer',
            error
              ? 'border-danger-500 focus:ring-danger-500/30 focus:border-danger-500'
              : 'border-surface-300 focus:ring-primary-500/30 focus:border-primary-500',
            'pl-3.5 pr-10 py-2.5',
            fullWidth && 'w-full',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-danger-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-surface-500">{hint}</p>
      )}
    </div>
  );
});
