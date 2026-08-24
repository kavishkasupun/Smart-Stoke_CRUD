import { cn } from '../../utils/cn';

/**
 * Reusable Card component with optional header and footer.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {import('react').ReactNode} [props.headerAction] - Action button/link in header
 * @param {import('react').ReactNode} [props.footer]
 * @param {boolean} [props.hoverable=false]
 * @param {boolean} [props.noPadding=false]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Card({
  title,
  description,
  headerAction,
  footer,
  hoverable = false,
  noPadding = false,
  className,
  children,
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-surface-200 shadow-card',
        'transition-shadow duration-200',
        hoverable && 'hover:shadow-card-hover',
        className
      )}
    >
      {/* Header */}
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-surface-900">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-surface-500">{description}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0 ml-4">{headerAction}</div>}
        </div>
      )}

      {/* Body */}
      <div className={cn(!noPadding && 'px-5 py-4')}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-3 border-t border-surface-200 bg-surface-50/50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
}
