import { cn } from '../../utils/cn';

const variants = {
  default: 'bg-surface-100 text-surface-700',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger:  'bg-danger-50 text-danger-700',
  info:    'bg-info-50 text-info-600',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
};

/**
 * Badge component for labels, tags, and status indicators.
 *
 * @param {object} props
 * @param {'default'|'primary'|'success'|'warning'|'danger'|'info'} [props.variant='default']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.dot=false] - Show a colored dot before the text
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  children,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'success' && 'bg-success-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'danger'  && 'bg-danger-500',
            variant === 'info'    && 'bg-info-500',
            variant === 'primary' && 'bg-primary-500',
            variant === 'default' && 'bg-surface-500'
          )}
        />
      )}
      {children}
    </span>
  );
}
