import { useState, useEffect } from 'react';
import { Package, Box, AlertTriangle, XCircle, Store, Archive, ArrowDown, ArrowRight, ShoppingCart } from 'lucide-react';
import { Card, Table, Badge, Spinner } from '../components/ui';
import { getInventoryStats, getLowStockVariants, getOutOfStockVariants, getRecentActivity } from '../services/dashboardService';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [outOfStock, setOutOfStock] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, lowStockData, outOfStockData, activityData] = await Promise.all([
        getInventoryStats(),
        getLowStockVariants(),
        getOutOfStockVariants(),
        getRecentActivity()
      ]);
      
      setStats(statsData);
      setLowStock(lowStockData);
      setOutOfStock(outOfStockData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (variant) => {
    const qty = variant.stock?.overall || 0;
    if (qty === 0) return <Badge variant="danger">OUT OF STOCK</Badge>;
    if (qty <= (variant.reorderLevel || 0)) return <Badge variant="warning">LOW STOCK</Badge>;
    return <Badge variant="success">Normal</Badge>;
  };

  const stockColumns = [
    { 
      header: 'Product/Variant', 
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{val}</div>
          {row.size && <div className="text-xs text-surface-500">Size: {row.size}</div>}
        </div>
      )
    },
    { 
      header: 'Mabola', 
      accessor: 'stock',
      render: (s) => <span className="text-surface-700">{s?.mabola || 0}</span>
    },
    { 
      header: 'Overall', 
      accessor: 'stock',
      render: (s) => <span className="font-bold">{s?.overall || 0}</span>
    },
    { 
      header: 'Minimum', 
      accessor: 'reorderLevel',
      render: (val) => <span className="text-surface-500">{val || 0}</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (_, row) => getStatusBadge(row)
    }
  ];

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Spinner size="lg" />
        <p className="mt-4 text-surface-500">Loading dashboard data...</p>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Products', value: stats.totalProducts, icon: <Package className="w-6 h-6 text-primary-600" />, bg: 'bg-primary-50' },
    { label: 'Total Variants', value: stats.totalVariants, icon: <Box className="w-6 h-6 text-primary-600" />, bg: 'bg-primary-50' },
    { label: 'Overall Stock', value: stats.overallStock, icon: <Archive className="w-6 h-6 text-success-600" />, bg: 'bg-success-50' },
    { label: 'Mabola Stock', value: stats.mabolaStock, icon: <Store className="w-6 h-6 text-info-600" />, bg: 'bg-info-50' },
    { label: 'Jaffna Stock', value: stats.jaffnaStock, icon: <Store className="w-6 h-6 text-info-600" />, bg: 'bg-info-50' },
    { label: 'Low Stock', value: stats.lowStockCount, icon: <AlertTriangle className="w-6 h-6 text-warning-600" />, bg: 'bg-warning-50' },
    { label: 'Out of Stock', value: stats.outOfStockCount, icon: <XCircle className="w-6 h-6 text-danger-600" />, bg: 'bg-danger-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Inventory Dashboard</h1>
        <p className="text-sm text-surface-500 mt-1">Overview of your current stock and operations</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="p-4 flex flex-col items-center justify-center text-center">
            <div className={`w-12 h-12 rounded-full ${kpi.bg} flex items-center justify-center mb-3`}>
              {kpi.icon}
            </div>
            <div className="text-2xl font-bold text-surface-900 leading-none mb-1">{kpi.value}</div>
            <div className="text-xs font-medium text-surface-500 uppercase tracking-wider">{kpi.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Low Stock Section */}
          <Card>
            <div className="p-4 border-b border-surface-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning-500" />
              <h2 className="text-lg font-bold text-surface-900">Low Stock Variants</h2>
            </div>
            <Table 
              columns={stockColumns}
              data={lowStock.slice(0, 5)} // Show top 5 for dashboard
              emptyMessage="No variants are low in stock."
            />
          </Card>

          {/* Out of Stock Section */}
          <Card>
            <div className="p-4 border-b border-surface-200 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-danger-500" />
              <h2 className="text-lg font-bold text-surface-900">Out of Stock Variants</h2>
            </div>
            <Table 
              columns={stockColumns}
              data={outOfStock.slice(0, 5)}
              emptyMessage="All variants are in stock."
            />
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <div className="p-4 border-b border-surface-200">
              <h2 className="text-lg font-bold text-surface-900">Recent Activity</h2>
            </div>
            <div className="p-4 space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-4 p-3 rounded-lg hover:bg-surface-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'movement' ? 'bg-primary-50 text-primary-600' :
                    activity.type === 'transfer' ? 'bg-info-50 text-info-600' :
                    'bg-success-50 text-success-600'
                  }`}>
                    {activity.icon === 'arrow-down' && <ArrowDown className="w-5 h-5" />}
                    {activity.icon === 'arrow-right' && <ArrowRight className="w-5 h-5" />}
                    {activity.icon === 'shopping-cart' && <ShoppingCart className="w-5 h-5" />}
                    {activity.icon === 'alert-triangle' && <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm text-surface-900 font-medium">{activity.desc}</p>
                    <p className="text-xs text-surface-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-surface-200 bg-surface-50 text-center rounded-b-xl">
              <span className="text-xs text-surface-500 italic">Placeholders for future phases</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
