import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Filter, Calendar } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner, Select, DateRangePicker } from '../../components/ui';
import { getReceivesHistory } from '../../services/stockReceiveService';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function ReceiveHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [dateRangePreset, setDateRangePreset] = useState('this-month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getReceivesHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load receive history:', error);
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

  const filteredHistory = React.useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.referenceId?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            item.supplier?.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Normalize date (importDate is often a string, but let's handle timestamps if present)
      const itemDate = item.importDate?.toDate ? item.importDate.toDate() : new Date(item.importDate || item.createdAt);
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
  }, [history, debouncedSearch, startDate, endDate]);

  const columns = [
    { 
      header: 'Reference ID', 
      accessor: 'referenceId',
      render: (val) => <span className="font-mono font-medium text-surface-900">{val}</span>
    },
    { 
      header: 'Date', 
      accessor: 'importDate',
      render: (val) => formatDate(val)
    },
    { 
      header: 'Supplier', 
      accessor: 'supplier'
    },
    { 
      header: 'Destination', 
      accessor: 'destinationBranch',
      render: (val) => (
        <Badge variant={val?.toLowerCase() === 'mabola' ? 'primary' : 'info'}>
          {val}
        </Badge>
      )
    },
    { 
      header: 'Items', 
      accessor: 'totalItems'
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/stock-receiving/${id}`)}
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
          <h1 className="text-2xl font-bold text-surface-900">Stock Receiving</h1>
          <p className="text-sm text-surface-500 mt-1">History of all imported and received stock</p>
        </div>
        
        <Button 
          onClick={() => navigate('/stock-receiving/new')} 
          icon={<Plus className="w-4 h-4" />}
        >
          Receive Stock
        </Button>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search by reference or supplier..."
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
            emptyMessage="No stock receives found."
          />
        )}
      </Card>
    </div>
  );
}
