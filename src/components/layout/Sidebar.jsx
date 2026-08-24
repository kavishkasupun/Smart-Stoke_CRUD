import { useLocation, Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useSidebar } from '../../contexts/SidebarContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { NAV_SECTIONS } from '../../config/navigation';
import { APP_NAME } from '../../config/constants';
import { X, Package } from 'lucide-react';

/**
 * Sidebar navigation — fixed on desktop, overlay on tablet, hidden on mobile.
 */
export function Sidebar() {
  const { pathname } = useLocation();
  const { isOpen, close } = useSidebar();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const handleNavClick = () => {
    if (!isDesktop) close();
  };

  // Desktop: always visible. Tablet: overlay when open. Mobile: hidden (use MobileNav).
  if (!isDesktop && !isOpen) return null;

  return (
    <>
      {/* Overlay for tablet */}
      {!isDesktop && isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 flex flex-col',
          'w-64 bg-sidebar-bg text-sidebar-text',
          'transition-transform duration-300 ease-in-out',
          isDesktop
            ? 'translate-x-0'
            : isOpen
              ? 'translate-x-0 animate-slide-in'
              : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border shrink-0">
          <Link to="/" className="flex items-center gap-3 group" onClick={handleNavClick}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600 text-white group-hover:bg-primary-500 transition-colors">
              <Package className="w-4.5 h-4.5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              {APP_NAME}
            </span>
          </Link>
          {!isDesktop && (
            <button
              onClick={close}
              className="p-1.5 rounded-lg text-sidebar-text hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} className="mb-6">
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-section">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.path}
                        onClick={handleNavClick}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                          'transition-all duration-200',
                          active
                            ? 'bg-sidebar-active text-sidebar-text-active shadow-sm'
                            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
                        )}
                      >
                        <Icon className={cn(
                          'w-[18px] h-[18px] shrink-0',
                          active ? 'text-primary-400' : 'text-sidebar-text'
                        )} />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-600 text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom info */}
        <div className="px-5 py-3 border-t border-sidebar-border shrink-0">
          <p className="text-xs text-sidebar-section">
            © 2026 {APP_NAME}
          </p>
        </div>
      </aside>
    </>
  );
}
