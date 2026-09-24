import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Calendar } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner, Select, DateRangePicker } from '../../components/ui';
import { getTransfersHistory } from '../../services/stockTransferService';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function TransferHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('');

  const [dateRangePreset, setDateRangePreset] = useState('this-month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getTransfersHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load transfer history:', error);
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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED': return <Badge variant="success">COMPLETED</Badge>;
      case 'PENDING': return <Badge variant="warning">PENDING</Badge>;
      case 'CANCELLED': return <Badge variant="danger">CANCELLED</Badge>;
      default: return <Badge variant="surface">{status}</Badge>;
    }
  };

  const filteredHistory = React.useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.referenceId?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            item.sourceBranch?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            item.destinationBranch?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = statusFilter ? item.status === statusFilter : true;
      
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

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [history, debouncedSearch, statusFilter, startDate, endDate]);

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
      header: 'From', 
      accessor: 'sourceBranch',
      render: (val) => <span className="font-semibold">{val}</span>
    },
    { 
      header: 'To', 
      accessor: 'destinationBranch',
      render: (val) => <span className="font-semibold">{val}</span>
    },
    { 
      header: 'Items', 
      accessor: 'totalItems'
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (val) => getStatusBadge(val)
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/stock-transfers/${id}`)}
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
          <h1 className="text-2xl font-bold text-surface-900">Stock Transfers</h1>
          <p className="text-sm text-surface-500 mt-1">Manage and track branch-to-branch transfers</p>
        </div>
        
        <Button 
          onClick={() => navigate('/stock-transfers/new')} 
          icon={<Plus className="w-4 h-4" />}
        >
          New Transfer
        </Button>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search reference or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
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
            emptyMessage="No stock transfers found."
          />
        )}
      </Card>
    </div>
  );
}
