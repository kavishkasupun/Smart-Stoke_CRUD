import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Calendar } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner, Select, DateRangePicker } from '../../components/ui';
import { getAdjustmentsHistory } from '../../services/stockAdjustmentService';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { canAdjustStock } from '../../utils/permissions';
import { getProducts, getProductVariants } from '../../services/productService';
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function AdjustmentHistory() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [variantsMap, setVariantsMap] = useState({});
  const [productsMap, setProductsMap] = useState({});
  const canAdjust = userProfile ? canAdjustStock(userProfile.role, userProfile.branchId, 'all') : false;

  const [dateRangePreset, setDateRangePreset] = useState('this-month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [data, allVariants, allProducts] = await Promise.all([
        getAdjustmentsHistory(),
        getProductVariants(), // fetch all active to map IDs to names
        getProducts() 
      ]);
      
      const vMap = {};
      allVariants.forEach(v => {
        vMap[v.id] = v.name + (v.size ? ` (${v.size})` : '');
      });
      setVariantsMap(vMap);

      const pMap = {};
      allProducts.forEach(p => {
        pMap[p.id] = p.name;
      });
      setProductsMap(pMap);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load adjustments history:', error);
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

  const getQtyBadge = (qty) => {
    if (qty > 0) return <span className="font-bold text-success-600">+{qty}</span>;
    if (qty < 0) return <span className="font-bold text-danger-600">{qty}</span>;
    return <span>{qty}</span>;
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      item.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.branch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase());

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

  const columns = [
    { 
      header: 'Reference ID', 
      accessor: 'referenceId',
      render: (val) => <span className="font-mono font-medium text-surface-900">{val}</span>
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      render: (val) => formatDate(val?.toDate ? val.toDate().toISOString() : val)
    },
    { 
      header: 'Branch', 
      accessor: 'branch',
      render: (val) => <Badge variant="surface">{val}</Badge>
    },
    { 
      header: 'Item', 
      accessor: 'productId',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{productsMap[val] || 'Unknown Product'}</div>
          {row.variantId && <div className="text-xs text-surface-500">{variantsMap[row.variantId]}</div>}
        </div>
      )
    },
    { 
      header: 'Type', 
      accessor: 'type',
      render: (val) => <span className="text-xs font-semibold uppercase tracking-wider">{val.replace('_', ' ')}</span>
    },
    { 
      header: 'Adj Qty', 
      accessor: 'adjustQty',
      render: (val) => getQtyBadge(val)
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/adjustments/${id}`)}
          icon={<Eye className="w-4 h-4" />}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Stock Adjustments</h1>
          <p className="text-sm text-surface-500 mt-1">History of physical stock discrepancies</p>
        </div>
        
        {canAdjust && (
          <Button 
            onClick={() => navigate('/adjustments/new')} 
            icon={<Plus className="w-4 h-4" />}
          >
            New Adjustment
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search reference, branch, or type..."
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
            data={filteredHistory}
            emptyMessage="No stock adjustments found."
          />
        )}
      </Card>
    </div>
  );
}
