import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Calendar } from 'lucide-react';
import { Card, Button, Input, Table, Badge, Spinner, Select, DateRangePicker } from '../../components/ui';
import { getSalesReturns } from '../../services/salesReturnService';
import { formatDate } from '../../utils/formatters';
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function SalesReturns() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [dateRangePreset, setDateRangePreset] = useState('this-month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const data = await getSalesReturns();
      setReturns(data);
    } catch (error) {
      console.error('Failed to load returns', error);
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

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = 
      ret.returnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.branch?.toLowerCase().includes(searchTerm.toLowerCase());

    // Normalize date
    const retDate = ret.createdAt?.toDate ? ret.createdAt.toDate() : new Date(ret.createdAt);
    const retTime = retDate.getTime();

    let matchesDate = true;
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (retTime < s.getTime()) matchesDate = false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (retTime > e.getTime()) matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  const columns = [
    { 
      header: 'Return No', 
      accessor: 'returnNumber',
      render: (val) => <span className="font-semibold text-slate-800">{val}</span>
    },
    { header: 'Date', accessor: 'createdAt', render: (val) => formatDate(val) },
    { 
      header: 'Invoice No', 
      accessor: 'invoiceNumber',
      render: (val, row) => (
        <span 
          className="text-primary-600 hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/bills/${row.invoiceId}`);
          }}
        >
          {val}
        </span>
      )
    },
    { header: 'Branch', accessor: 'branch', render: (val) => <span className="capitalize">{val}</span> },
    { 
      header: 'Product', 
      accessor: 'productName',
      render: (val, row) => (
        <div>
          <p className="font-medium text-slate-800">{val}</p>
          <p className="text-xs text-slate-500">{row.variantName}</p>
        </div>
      )
    },
    { 
      header: 'Qty', 
      accessor: 'returnQuantity',
      render: (val) => <span className="font-bold text-slate-800">{val}</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: () => <Badge variant="success">Completed</Badge>
    },
    {
      header: 'Actions',
      id: 'actions',
      render: (_, row) => (
        <Button 
          variant="ghost" 
          size="sm" 
          icon={<Eye className="w-4 h-4" />}
          onClick={() => navigate(`/sales-returns/${row.id}`)}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Returns</h1>
          <p className="text-sm text-slate-500 mt-1">Manage returned items and restocks</p>
        </div>
        <Button 
          variant="primary" 
          icon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/sales-returns/new')}
        >
          Process Return
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search returns..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
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
          <div className="p-8 flex justify-center"><Spinner size="lg" /></div>
        ) : (
          <Table 
            columns={columns} 
            data={filteredReturns} 
            emptyMessage="No sales returns found."
            onRowClick={(row) => navigate(`/sales-returns/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
