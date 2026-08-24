import { Link } from 'react-router-dom';
import { Button } from '../components/ui';
import { Home, FileQuestion } from 'lucide-react';

/**
 * 404 — Not Found page.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-surface-100 mb-6">
        <FileQuestion className="w-10 h-10 text-surface-400" />
      </div>
      <h1 className="text-4xl font-bold text-surface-900 mb-2">404</h1>
      <p className="text-lg text-surface-600 mb-1">Page not found</p>
      <p className="text-sm text-surface-400 max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved.
        Please check the URL or go back to the dashboard.
      </p>
      <Link to="/">
        <Button icon={<Home className="w-4 h-4" />}>
          Go to Dashboard
        </Button>
      </Link>
    </div>
  );
}
