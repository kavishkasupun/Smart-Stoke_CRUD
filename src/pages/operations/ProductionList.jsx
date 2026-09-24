import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Factory, Clock, Search, Calendar } from 'lucide-react';
import { Card, Table, Button, Badge, Input, Spinner, Select, DateRangePicker } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getProductionOrders } from '../../services/productionService';
import { getProducts, getProductVariants } from '../../services/productService';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function ProductionList() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const branch = userProfile?.branchId; // 'mabola', 'jaffna', or 'all'
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [dateRangePreset, setDateRangePreset] = useState('this-month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  useEffect(() => {
    fetchData();
  }, [branch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersData, productsData, variantsData] = await Promise.all([
        getProductionOrders(branch),
        getProducts(),
        getProductVariants()
      ]);

      const enrichedOrders = ordersData.map(order => {
        const product = productsData.find(p => p.id === order.finishedProductId);
        const variant = order.finishedVariantId ? variantsData.find(v => v.id === order.finishedVariantId) : null;
        
        return {
          ...order,
          productName: product?.name || 'Unknown Product',
          variantName: variant ? variant.name : '',
          variantSize: variant?.size || '',
          sku: variant ? (variant.sku || '') : (product?.sku || '')
        };
      });

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Failed to load production orders:', error);
      toast.error('Failed to load production orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDatePresetChange = (preset) => {
    setDateRangePreset(preset);
    const now = new Date();
    switch (preset) {
      case 'today':
        setStartDate(now);
        setEndDate(now);
        break;
      case 'yesterday':
        setStartDate(subDays(now, 1));
        setEndDate(subDays(now, 1));
        break;
      case 'this-week':
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'last-week':
        setStartDate(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
        setEndDate(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
        break;
      case 'this-month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'last-month':
        setStartDate(startOfMonth(subMonths(now, 1)));
        setEndDate(endOfMonth(subMonths(now, 1)));
        break;
      case 'all-time':
        setStartDate(null);
        setEndDate(null);
        break;
      case 'custom':
        break;
      default:
        break;
    }
  };

  const filteredOrders = React.useMemo(() => {
    return orders.filter(item => {
      const matchesSearch = item.referenceId?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            item.productName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            item.variantName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            item.sku?.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Normalize date
      const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
      const itemTime = itemDate.getTime();

      let matchesDate = true;
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (itemTime < s.getTime()) matchesDate = false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        if (itemTime > e.getTime()) matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });
  }, [orders, debouncedSearch, startDate, endDate]);

  const columns = [
    {
      header: 'Order Number',
      accessor: 'referenceId',
      render: (val) => <span className="font-mono font-medium text-surface-900">{val}</span>
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      render: (val) => {
        if (!val) return <span className="text-sm text-surface-600">N/A</span>;
        const d = val?.toDate ? val.toDate() : new Date(val);
        return <span className="text-sm text-surface-600">{isNaN(d) ? 'N/A' : d.toLocaleString()}</span>;
      }
    },
    { 
      header: 'Branch', 
      accessor: 'branch',
      render: (val) => <span className="capitalize font-medium text-surface-700">{val}</span>
    },
    { 
      header: 'Finished Product', 
      accessor: 'productName',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{val}</div>
          <div className="text-xs text-surface-500">
            {row.variantName && `${row.variantName} `}
            {row.variantSize && `(${row.variantSize}) `}
            {row.sku && `• ${row.sku}`}
          </div>
        </div>
      )
    },
    { 
      header: 'Quantity', 
      accessor: 'quantityProduced',
      render: (val) => <span className="font-bold text-surface-900">{val}</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (val) => (
        <Badge variant={val === 'DRAFT' ? 'warning' : val === 'CANCELED' ? 'danger' : 'success'}>
          {val === 'DRAFT' ? 'Draft' : val === 'CANCELED' ? 'Canceled' : 'Completed'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/manufacturing/${id}`)}
          icon={<Eye className="w-4 h-4" />}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Factory className="w-6 h-6 text-primary-600" />
            Production Orders
          </h1>
          <p className="text-sm text-surface-500 mt-1">Manage manufacturing runs and track material usage.</p>
        </div>
        
        <Button 
          onClick={() => navigate('/manufacturing/new')} 
          icon={<Plus className="w-4 h-4" />}
        >
          New Production Order
        </Button>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search reference, product, sku..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        <div className="px-4 py-3 bg-surface-50 border-b border-surface-200 flex flex-col sm:flex-row items-center gap-3">
          <Calendar className="w-4 h-4 text-surface-500 hidden sm:block" />
          <Select 
            value={dateRangePreset} 
            onChange={(e) => handleDatePresetChange(e.target.value)} 
            className="w-full sm:w-48 text-sm bg-white"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this-week">This Week</option>
            <option value="last-week">Last Week</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="all-time">All Time</option>
            <option value="custom">Custom Range</option>
          </Select>
          
          {dateRangePreset === 'custom' && (
            <div className="w-full sm:w-auto">
              <DateRangePicker 
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Spinner />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={filteredOrders}
            emptyMessage={
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-900">No production orders found</h3>
                <p className="text-surface-500 mb-4">You haven't recorded any manufacturing runs for this period.</p>
                <Button onClick={() => navigate('/manufacturing/new')} icon={<Plus className="w-4 h-4" />}>
                  Create First Order
                </Button>
              </div>
            }
          />
        )}
      </Card>
    </div>
  );
}
