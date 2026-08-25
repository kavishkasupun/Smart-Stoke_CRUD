import {
  LayoutDashboard,
  Package,
  FolderTree,
  Warehouse,
  PackagePlus,
  ArrowLeftRight,
  ClipboardEdit,
  FileText,
  RotateCcw,
  Users,
  BarChart3,
  TrendingUp,
  UserCog,
  Bell,
  ScrollText,
  Settings,
} from 'lucide-react';

/**
 * Navigation configuration.
 * Each section contains a label and its menu items.
 * Each item has: id, label, icon, path, and optional badge.
 */
export const NAV_SECTIONS = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { id: 'products', label: 'Products', icon: Package, path: '/products' },
      { id: 'categories', label: 'Categories', icon: FolderTree, path: '/categories' },
      { id: 'stock-overview', label: 'Stock Overview', icon: Warehouse, path: '/stock-overview' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'stock-receiving', label: 'Stock Receiving', icon: PackagePlus, path: '/stock-receiving' },
      { id: 'stock-transfers', label: 'Stock Transfers', icon: ArrowLeftRight, path: '/stock-transfers' },
      { id: 'adjustments', label: 'Adjustments', icon: ClipboardEdit, path: '/adjustments' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { id: 'bills', label: 'Bills / Invoices', icon: FileText, path: '/bills' },
      { id: 'sales-returns', label: 'Sales Returns', icon: RotateCcw, path: '/sales-returns' },
      { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      { id: 'reports-dashboard', label: 'Analytics', icon: LayoutDashboard, path: '/reports/dashboard' },
      { id: 'inventory-reports', label: 'Inventory Reports', icon: TrendingUp, path: '/reports/inventory' },
      { id: 'operations-reports', label: 'Operations Reports', icon: ArrowLeftRight, path: '/reports/operations' },
      { id: 'sales-reports', label: 'Sales Reports', icon: BarChart3, path: '/reports/sales' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { id: 'users-roles', label: 'Users & Roles', icon: UserCog, path: '/settings/users' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/settings/notifications' },
      { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText, path: '/settings/audit-logs' },
    ],
  },
];

/**
 * Mobile bottom navigation — limited to 5 key items.
 */
export const MOBILE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
  { id: 'products', label: 'Products', icon: Package, path: '/products' },
  { id: 'bills', label: 'Bills', icon: FileText, path: '/bills' },
  { id: 'stock', label: 'Stock', icon: Warehouse, path: '/stock-overview' },
  { id: 'settings', label: 'More', icon: Settings, path: '/settings/users' },
];
