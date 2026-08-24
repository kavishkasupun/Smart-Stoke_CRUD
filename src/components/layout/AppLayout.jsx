import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNav } from './MobileNav';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * Main application layout.
 *
 * Desktop: Fixed sidebar (w-64) + content area with top header.
 * Tablet:  Overlay sidebar + content area with top header.
 * Mobile:  Top header + content area + bottom nav.
 */
export function AppLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area — offset by sidebar width on desktop */}
      <div className={isDesktop ? 'ml-64' : ''}>
        {/* Top Header */}
        <TopHeader />

        {/* Page content */}
        <main className="p-4 lg:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
