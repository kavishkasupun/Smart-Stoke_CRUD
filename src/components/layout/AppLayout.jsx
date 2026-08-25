import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNav } from './MobileNav';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';

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
    <div className="min-h-screen bg-surface-50 print:bg-white print:min-h-0">
      {/* Sidebar */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* Main area — offset by sidebar width on desktop */}
      <div className={cn(isDesktop ? 'ml-64' : '', 'print:m-0 print:w-full')}>
        {/* Top Header */}
        <div className="print:hidden">
          <TopHeader />
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6 pb-24 md:pb-6 print:p-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="print:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
