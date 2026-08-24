import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Menu, Bell, Search, User, LogOut } from 'lucide-react';
import { logout } from '../../services/authService';
import { USER_ROLE_LABELS } from '../../config/constants';

/**
 * Top header bar — sticky, contains hamburger menu, search, and user actions.
 */
export function TopHeader() {
  const { toggle } = useSidebar();
  const { userProfile } = useAuth();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const roleLabel = userProfile ? USER_ROLE_LABELS[userProfile.role] : 'Guest';
  const branchLabel = userProfile?.branch === 'all' 
    ? 'All Branches' 
    : userProfile?.branch === 'mabola' 
      ? 'Mabola Branch' 
      : userProfile?.branch === 'jaffna'
        ? 'Jaffna Branch'
        : '';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-surface-200 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {!isDesktop && (
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100 transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Search bar — hidden on mobile, visible on tablet+ */}
          <div className="hidden sm:flex items-center gap-2 bg-surface-100 rounded-lg px-3 py-2 w-64 lg:w-80 transition-all focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:bg-white focus-within:border focus-within:border-primary-300">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input
              type="text"
              placeholder="Search products, bills, customers..."
              className="flex-1 bg-transparent text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {/* Mobile search button */}
          <button
            className="sm:hidden p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100 transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg text-surface-500 hover:text-surface-700 hover:bg-surface-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white" />
          </button>

          {/* User Profile display */}
          <div className="flex items-center gap-2 p-1.5 ml-2 border-l border-surface-200 pl-4">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <div className="hidden md:block text-left mr-2">
              <p className="text-sm font-medium text-surface-900 leading-tight">
                {userProfile?.name || 'User'}
              </p>
              <p className="text-xs text-surface-500 leading-tight">
                {roleLabel} {branchLabel && `• ${branchLabel}`}
              </p>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-danger-500 hover:bg-danger-50 transition-colors cursor-pointer ml-1"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
