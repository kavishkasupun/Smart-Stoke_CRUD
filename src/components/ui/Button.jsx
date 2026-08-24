import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm',
  secondary:
    'bg-surface-100 text-surface-700 hover:bg-surface-200 focus:ring-surface-400 border border-surface-300',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 shadow-sm',
  success:
    'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 shadow-sm',
  warning:
    'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500 shadow-sm',
  ghost:
    'bg-transparent text-surface-600 hover:bg-surface-100 hover:text-surface-900 focus:ring-surface-400',
  outline:
    'bg-transparent text-primary-600 border border-primary-300 hover:bg-primary-50 focus:ring-primary-500',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
  xl: 'px-6 py-3 text-base gap-2.5',
};

/**
 * Reusable Button component.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'danger'|'success'|'warning'|'ghost'|'outline'} [props.variant='primary']
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.fullWidth=false]
 * @param {import('react').ReactNode} [props.icon]
 * @param {import('react').ReactNode} [props.iconRight]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconRight,
  className,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-all duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'cursor-pointer',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}
