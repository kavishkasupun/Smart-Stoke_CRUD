import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

/**
 * Placeholder page shown for routes that haven't been built yet.
 * Displays the current page name based on the URL path.
 */
export default function PlaceholderPage() {
  const { pathname } = useLocation();

  // Convert path to a readable page name
  const pageName = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' › ') || 'Page';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-50 mb-6">
        <Construction className="w-10 h-10 text-primary-400" />
      </div>
      <h1 className="text-2xl font-bold text-surface-900 mb-2">{pageName}</h1>
      <p className="text-sm text-surface-500 max-w-md">
        This page is under construction. It will be available in a future update.
      </p>
      <div className="mt-6 px-4 py-2 bg-surface-100 rounded-lg">
        <code className="text-xs text-surface-600">{pathname}</code>
      </div>
    </div>
  );
}
