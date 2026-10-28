import { useLocation, Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { MOBILE_NAV_ITEMS } from '../../config/navigation';

import { useAuth } from '../../contexts/AuthContext';

/**
 * Mobile bottom navigation bar — visible only on mobile (<768px).
 * Shows 5 key navigation items.
 */
export function MobileNav() {
  const { pathname } = useLocation();
  const { userProfile } = useAuth();

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const getSectionId = (itemId) => {
    switch (itemId) {
      case 'dashboard': return 'main';
      case 'products':
      case 'stock': return 'inventory';
      case 'bills': return 'sales';
      case 'settings': return 'settings';
      default: return 'main';
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-surface-200 shadow-lg">
      <div className="flex items-center justify-around h-16 px-1">
        {MOBILE_NAV_ITEMS.filter(item => {
          const sectionId = getSectionId(item.id);
          if (sectionId === 'main') return true;
          
          if (userProfile?.features && userProfile.features.length > 0) {
            return userProfile.features.includes(sectionId);
          }
          
          if (userProfile?.role === 'SUPER_ADMIN') return true;
          return true;
        }).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg',
                'transition-all duration-200',
                active
                  ? 'text-primary-600'
                  : 'text-surface-400 hover:text-surface-600'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 transition-transform duration-200',
                active && 'scale-110'
              )} />
              <span className={cn(
                'text-[10px] font-medium leading-tight',
                active ? 'text-primary-600' : 'text-surface-500'
              )}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
      {/* Safe area for iPhone notch */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
