import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Input component.
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {import('react').ReactNode} [props.icon] - Left icon
 * @param {import('react').ReactNode} [props.iconRight] - Right icon/action
 * @param {boolean} [props.fullWidth=true]
 * @param {string} [props.className]
 * @param {string} [props.wrapperClassName]
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    icon,
    iconRight,
    fullWidth = true,
    className,
    wrapperClassName,
    id,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn(fullWidth && 'w-full', wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-surface-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'block rounded-lg border bg-white text-surface-900',
            'text-sm placeholder:text-surface-400',
            'transition-all duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-50',
            error
              ? 'border-danger-500 focus:ring-danger-500/30 focus:border-danger-500'
              : 'border-surface-300 focus:ring-primary-500/30 focus:border-primary-500',
            icon ? 'pl-10' : 'pl-3.5',
            iconRight ? 'pr-10' : 'pr-3.5',
            'py-2.5',
            fullWidth && 'w-full',
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
            {iconRight}
          </div>
        )}
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
