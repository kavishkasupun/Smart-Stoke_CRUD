import { useState } from 'react';
import { Card } from '../components/ui';
import { Badge } from '../components/ui';
import {
  Package,
  AlertTriangle,
  DollarSign,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  PackagePlus,
  ClipboardEdit,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatters';
import { cn } from '../utils/cn';

/* ============================================================
   DEMO DATA — will be replaced with real Firestore data later
   ============================================================ */

const STAT_CARDS = [
  {
    id: 'products',
    label: 'Total Products',
    value: '1,248',
    change: '+12',
    changeLabel: 'this month',
    trend: 'up',
    icon: Package,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
  },
  {
    id: 'low-stock',
    label: 'Low Stock Items',
    value: '23',
    change: '+5',
    changeLabel: 'since yesterday',
    trend: 'up',
    icon: AlertTriangle,
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
  },
  {
    id: 'sales',
    label: "Today's Sales",
    value: formatCurrency(184500),
    change: '+18%',
    changeLabel: 'vs yesterday',
    trend: 'up',
    icon: DollarSign,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-600',
  },
  {
    id: 'transfers',
    label: 'Pending Transfers',
    value: '4',
    change: '2 urgent',
    changeLabel: '',
    trend: 'neutral',
    icon: ArrowLeftRight,
    iconBg: 'bg-info-100',
    iconColor: 'text-info-600',
  },
];

const SALES_DATA = [
  { name: 'Mon', mabola: 42000, jaffna: 28000 },
  { name: 'Tue', mabola: 38000, jaffna: 35000 },
  { name: 'Wed', mabola: 55000, jaffna: 42000 },
  { name: 'Thu', mabola: 48000, jaffna: 38000 },
  { name: 'Fri', mabola: 62000, jaffna: 52000 },
  { name: 'Sat', mabola: 78000, jaffna: 65000 },
  { name: 'Sun', mabola: 45000, jaffna: 32000 },
];

const MONTHLY_TREND = [
  { name: 'Jan', sales: 1200000 },
  { name: 'Feb', sales: 1350000 },
  { name: 'Mar', sales: 1100000 },
  { name: 'Apr', sales: 1480000 },
  { name: 'May', sales: 1620000 },
  { name: 'Jun', sales: 1750000 },
];

const RECENT_ACTIVITY = [
  {
    id: 1,
    type: 'sale',
    icon: ShoppingCart,
    title: 'Invoice #INV-2024-0847',
    description: 'Bill created for Walk-in Customer',
    branch: 'Mabola',
    time: '5 min ago',
    amount: 'Rs. 12,450.00',
  },
  {
    id: 2,
    type: 'transfer',
    icon: ArrowLeftRight,
    title: 'Transfer #TRF-0023',
    description: 'Mabola → Jaffna (15 items)',
    branch: 'Both',
    time: '22 min ago',
    amount: null,
  },
  {
    id: 3,
    type: 'receive',
    icon: PackagePlus,
    title: 'Stock Import #IMP-0089',
    description: 'Received 120 items from China shipment',
    branch: 'Mabola',
    time: '1 hour ago',
    amount: null,
  },
  {
    id: 4,
    type: 'adjustment',
    icon: ClipboardEdit,
    title: 'Adjustment #ADJ-0015',
    description: 'Stock count correction — 3 items',
    branch: 'Jaffna',
    time: '3 hours ago',
    amount: null,
  },
  {
    id: 5,
    type: 'sale',
    icon: ShoppingCart,
    title: 'Invoice #INV-2024-0846',
    description: 'Bill created for Ruwan Perera',
    branch: 'Jaffna',
    time: '4 hours ago',
    amount: 'Rs. 28,900.00',
  },
];

const LOW_STOCK_ITEMS = [
  { id: 1, name: 'Bluetooth Speaker X200', sku: 'SPK-X200', stock: 3, reorder: 20 },
  { id: 2, name: 'USB-C Hub 7-in-1', sku: 'HUB-7IN1', stock: 5, reorder: 15 },
  { id: 3, name: 'Wireless Mouse Pro', sku: 'MSE-PRO', stock: 2, reorder: 25 },
  { id: 4, name: 'LED Desk Lamp', sku: 'LMP-LED1', stock: 7, reorder: 30 },
  { id: 5, name: 'Phone Case Premium', sku: 'CSE-PRM', stock: 4, reorder: 50 },
];

const BRANCH_OPTIONS = [
  { value: 'all', label: 'All Branches' },
  { value: 'mabola', label: 'Mabola' },
  { value: 'jaffna', label: 'Jaffna' },
];

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */

export default function Dashboard() {
  const [selectedBranch, setSelectedBranch] = useState('all');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-sm text-surface-500 mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="px-3 py-2 bg-white border border-surface-300 rounded-lg text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
        >
          {BRANCH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.id} hoverable className="group">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-surface-500">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-surface-900">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs">
                    {stat.trend === 'up' && (
                      <TrendingUp className="w-3.5 h-3.5 text-success-500" />
                    )}
                    {stat.trend === 'down' && (
                      <TrendingDown className="w-3.5 h-3.5 text-danger-500" />
                    )}
                    <span className={cn(
                      'font-medium',
                      stat.trend === 'up' ? 'text-success-600' : stat.trend === 'down' ? 'text-danger-600' : 'text-surface-500'
                    )}>
                      {stat.change}
                    </span>
                    {stat.changeLabel && (
                      <span className="text-surface-400">{stat.changeLabel}</span>
                    )}
                  </div>
                </div>
                <div className={cn(
                  'flex items-center justify-center w-11 h-11 rounded-xl',
                  'transition-transform duration-200 group-hover:scale-110',
                  stat.iconBg
                )}>
                  <Icon className={cn('w-5 h-5', stat.iconColor)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Sales Chart */}
        <Card
          title="Weekly Sales by Branch"
          headerAction={
            <span className="text-xs text-surface-400">Last 7 days</span>
          }
        >
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SALES_DATA} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Bar
                  dataKey="mabola"
                  name="Mabola"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="jaffna"
                  name="Jaffna"
                  fill="#a5b4fc"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary-500" />
              <span className="text-xs text-surface-500">Mabola</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary-300" />
              <span className="text-xs text-surface-500">Jaffna</span>
            </div>
          </div>
        </Card>

        {/* Monthly Trend */}
        <Card
          title="Monthly Sales Trend"
          headerAction={
            <span className="text-xs text-surface-400">Last 6 months</span>
          }
        >
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value) => [formatCurrency(value), 'Sales']}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6, fill: '#4f46e5' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card
          title="Recent Activity"
          headerAction={
            <button className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 cursor-pointer">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="space-y-1 -mx-5 -my-4">
            {RECENT_ACTIVITY.map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className={cn(
                    'flex items-start gap-3 px-5 py-3.5',
                    'hover:bg-surface-50/50 transition-colors',
                    idx !== RECENT_ACTIVITY.length - 1 && 'border-b border-surface-100'
                  )}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-100 text-surface-500 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5 truncate">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default" size="sm">{activity.branch}</Badge>
                      <span className="text-xs text-surface-400">{activity.time}</span>
                    </div>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-semibold text-surface-900 whitespace-nowrap shrink-0">
                      {activity.amount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card
          title="Low Stock Alerts"
          headerAction={
            <Badge variant="danger" size="sm" dot>
              {LOW_STOCK_ITEMS.length} items
            </Badge>
          }
        >
          <div className="space-y-1 -mx-5 -my-4">
            {LOW_STOCK_ITEMS.map((item, idx) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between gap-3 px-5 py-3.5',
                  'hover:bg-surface-50/50 transition-colors',
                  idx !== LOW_STOCK_ITEMS.length - 1 && 'border-b border-surface-100'
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    SKU: {item.sku}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    'text-sm font-bold',
                    item.stock <= 3 ? 'text-danger-600' : 'text-warning-600'
                  )}>
                    {item.stock} left
                  </p>
                  <p className="text-xs text-surface-400">
                    Reorder: {item.reorder}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
