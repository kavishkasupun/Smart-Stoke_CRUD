import { useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

/**
 * Reusable Modal component with overlay.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [props.size='md']
 * @param {boolean} [props.closeOnOverlay=true]
 * @param {boolean} [props.closeOnEscape=true]
 * @param {boolean} [props.showCloseButton=true]
 * @param {import('react').ReactNode} [props.footer]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
  className,
  children,
}) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={cn(
          'relative z-10 bg-white shadow-modal',
          'flex flex-col',
          'animate-scale-in',
          isMobile
            ? 'w-full h-full rounded-none'
            : cn('w-full mx-4 rounded-xl max-h-[90vh]', sizeClasses[size]),
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-surface-900">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-surface-500">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
