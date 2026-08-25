import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useSidebar } from '../../contexts/SidebarContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { NAV_SECTIONS } from '../../config/navigation';
import { APP_NAME } from '../../config/constants';
import { X, Package, ChevronDown, Sparkles } from 'lucide-react';

/**
 * Premium Sidebar navigation — modern glassmorphism design with 
 * gradient accents, animated indicators, and smooth micro-animations.
 */
export function Sidebar() {
  const { pathname } = useLocation();
  const { isOpen, close } = useSidebar();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsedSections, setCollapsedSections] = useState({});

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const handleNavClick = () => {
    if (!isDesktop) close();
  };

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Desktop: always visible. Tablet: overlay when open. Mobile: hidden (use MobileNav).
  if (!isDesktop && !isOpen) return null;

  return (
    <>
      {/* Overlay for tablet */}
      {!isDesktop && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 flex flex-col',
          'w-64 sidebar-panel',
          'transition-transform duration-300 ease-in-out',
          isDesktop
            ? 'translate-x-0'
            : isOpen
              ? 'translate-x-0 animate-slide-in'
              : '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-5 shrink-0 sidebar-logo-area">
          <Link to="/" className="flex items-center gap-3 group" onClick={handleNavClick}>
            <div className="sidebar-logo-icon">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold text-white tracking-tight leading-tight">
                {APP_NAME}
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-widest uppercase leading-tight">
                Inventory
              </span>
            </div>
          </Link>
          {!isDesktop && (
            <button
              onClick={close}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Divider with gradient */}
        <div className="mx-4 h-px sidebar-divider" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin sidebar-nav">
          {NAV_SECTIONS.map((section) => {
            const isCollapsed = collapsedSections[section.id];
            const hasActiveItem = section.items.some(item => isActive(item.path));

            return (
              <div key={section.id} className="mb-1.5">
                {/* Section Header — clickable to collapse */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 mb-0.5 rounded-lg group cursor-pointer hover:bg-white/[0.03] transition-all duration-200"
                >
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-[0.15em]',
                    hasActiveItem ? 'text-primary-400' : 'text-slate-500'
                  )}>
                    {section.label}
                  </span>
                  <ChevronDown className={cn(
                    'w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-all duration-300',
                    isCollapsed && '-rotate-90'
                  )} />
                </button>

                {/* Section Items */}
                <div className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                )}>
                  <ul className="space-y-0.5 pb-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <li key={item.id}>
                          <Link
                            to={item.path}
                            onClick={handleNavClick}
                            className={cn(
                              'sidebar-nav-item',
                              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium',
                              'transition-all duration-200 relative group',
                              active
                                ? 'sidebar-nav-item-active text-white'
                                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                            )}
                          >
                            {/* Active indicator bar */}
                            {active && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary-400 sidebar-active-indicator" />
                            )}

                            <div className={cn(
                              'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                              active
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'text-slate-400 group-hover:text-white group-hover:bg-white/[0.06]'
                            )}>
                              <Icon className="w-[18px] h-[18px]" />
                            </div>

                            <span className="flex-1">{item.label}</span>

                            {item.badge && (
                              <span className="sidebar-badge px-2 py-0.5 text-[10px] font-bold rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mx-4 h-px sidebar-divider" />
        <div className="px-4 py-4 shrink-0">
          {/* Version / Branding */}
          <div className="sidebar-bottom-card rounded-xl p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-slate-300 leading-tight">
                  {APP_NAME}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  v2.0 · © 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
