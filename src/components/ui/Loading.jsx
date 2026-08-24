import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

/**
 * Loading spinner.
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className]
 */
export function Spinner({ size = 'md', className }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2
      className={cn('animate-spin text-primary-600', sizeClasses[size], className)}
    />
  );
}

/**
 * Skeleton loading placeholder.
 *
 * @param {object} props
 * @param {string} [props.className]
 * @param {'text'|'circle'|'rect'} [props.variant='text']
 */
export function Skeleton({ className, variant = 'text' }) {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circle: 'w-10 h-10 rounded-full',
    rect: 'h-20 w-full rounded-lg',
  };

  return (
    <div className={cn('skeleton', variantClasses[variant], className)} />
  );
}

/**
 * Full-page loading overlay.
 *
 * @param {object} props
 * @param {string} [props.message='Loading...']
 */
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <Spinner size="lg" />
      <p className="mt-3 text-sm font-medium text-surface-600">{message}</p>
    </div>
  );
}

/**
 * Inline loading state for content areas.
 *
 * @param {object} props
 * @param {string} [props.message='Loading...']
 * @param {string} [props.className]
 */
export function ContentLoader({ message = 'Loading...', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Spinner size="md" />
      <p className="mt-3 text-sm text-surface-500">{message}</p>
    </div>
  );
}
