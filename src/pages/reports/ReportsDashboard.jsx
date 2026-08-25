import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie
} from 'recharts';
import { LayoutDashboard, TrendingUp, ArrowLeftRight, Package, Calendar } from 'lucide-react';
import { Card, DateRangePicker, Spinner } from '../../components/ui';
import { getDashboardAnalytics } from '../../services/reportService';
import { formatCurrency } from '../../utils/formatters';

export default function ReportsDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // Default to current month
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const analytics = await getDashboardAnalytics(startDate, endDate);
      setData(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-surface-200 shadow-lg rounded-lg">
          <p className="text-sm font-medium text-surface-900 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Reports Analytics</h1>
          <p className="text-sm text-surface-500 mt-1">High-level overview of your business performance</p>
        </div>
        <div className="w-full sm:w-auto bg-white p-2 rounded-xl border border-surface-200 shadow-sm">
          <DateRangePicker 
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-surface-200">
          <Spinner size="lg" />
          <p className="mt-4 text-surface-500">Compiling report data...</p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-surface-200 text-surface-500">
          No data available or invalid date range.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col justify-center">
              <div className="text-sm font-medium text-surface-500 flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary-500" /> Total Revenue
              </div>
              <div className="text-2xl font-bold text-surface-900">
                {formatCurrency(data.kpis.totalRevenue)}
              </div>
            </Card>
            
            <Card className="p-4 flex flex-col justify-center">
              <div className="text-sm font-medium text-surface-500 flex items-center gap-2 mb-2">
                <ArrowLeftRight className="w-4 h-4 text-danger-500" /> Total Returns
              </div>
              <div className="text-2xl font-bold text-surface-900">
                {formatCurrency(data.kpis.totalReturns)}
              </div>
            </Card>

            <Card className="p-4 flex flex-col justify-center">
              <div className="text-sm font-medium text-surface-500 flex items-center gap-2 mb-2">
                <LayoutDashboard className="w-4 h-4 text-info-500" /> Invoices Created
              </div>
              <div className="text-2xl font-bold text-surface-900">
                {data.kpis.totalInvoices}
              </div>
            </Card>

            <Card className="p-4 flex flex-col justify-center">
              <div className="text-sm font-medium text-surface-500 flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-warning-500" /> Low Stock Items
              </div>
              <div className="text-2xl font-bold text-surface-900">
                {data.kpis.lowStockCount}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend */}
            <Card className="p-5 flex flex-col h-[400px]">
              <h2 className="text-lg font-bold text-surface-900 mb-6">Sales Trend</h2>
              <div className="flex-1 min-h-0 w-full">
                {data.charts.salesTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.charts.salesTrend} margin={{ top: 5, right: 20, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748B' }} 
                        dy={10} 
                        angle={-45} 
                        textAnchor="end"
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        tickFormatter={(val) => `Rs.${val > 1000 ? (val/1000).toFixed(1)+'k' : val}`}
                      />
                      <Tooltip content={<CustomTooltip formatter={(val) => formatCurrency(val)} />} />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-surface-500">No sales in this period.</div>
                )}
              </div>
            </Card>

            {/* Branch Comparison */}
            <Card className="p-5 flex flex-col h-[400px]">
              <h2 className="text-lg font-bold text-surface-900 mb-6">Revenue by Branch</h2>
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.branchComparison} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="branch" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#64748B' }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      tickFormatter={(val) => `Rs.${val > 1000 ? (val/1000).toFixed(1)+'k' : val}`}
                    />
                    <Tooltip content={<CustomTooltip formatter={(val) => formatCurrency(val)} />} />
                    <Bar dataKey="sales" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {data.charts.branchComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.branch === 'Mabola' ? '#6366F1' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top Variants */}
            <Card className="p-5 flex flex-col h-[400px]">
              <h2 className="text-lg font-bold text-surface-900 mb-6">Top 5 Selling Variants</h2>
              <div className="flex-1 min-h-0 w-full">
                {data.charts.topVariants.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.charts.topVariants} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={150} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                      <Bar dataKey="quantity" name="Quantity Sold" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="flex items-center justify-center h-full text-surface-500">No data available.</div>
                )}
              </div>
            </Card>

            {/* Stock Movement IN vs OUT */}
            <Card className="p-5 flex flex-col h-[400px]">
              <h2 className="text-lg font-bold text-surface-900 mb-6">Stock Movement Distribution</h2>
              <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                {data.charts.movementChart[0].value > 0 || data.charts.movementChart[1].value > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.charts.movementChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.charts.movementChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-surface-500">No stock movements recorded in this period.</div>
                )}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                  <span className="text-sm text-surface-600">Incoming ({data.charts.movementChart[0].value})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                  <span className="text-sm text-surface-600">Outgoing ({data.charts.movementChart[1].value})</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
