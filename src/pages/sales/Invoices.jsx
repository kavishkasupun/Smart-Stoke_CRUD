import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Eye, Filter, Calendar } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner, Select, DateRangePicker } from '../../components/ui';
import { getInvoices } from '../../services/invoiceService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');

  const [dateRangePreset, setDateRangePreset] = useState('this-month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
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

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesMode = modeFilter === 'ALL' || invoice.mode === modeFilter;

    // Normalize invoice date
    const invDate = invoice.createdAt?.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt);
    const invTime = invDate.getTime();

    let matchesDate = true;
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (invTime < s.getTime()) matchesDate = false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (invTime > e.getTime()) matchesDate = false;
    }

    return matchesSearch && matchesMode && matchesDate;
  });

  const columns = [
    {
      header: 'Invoice No.',
      accessor: 'invoiceNumber',
      render: (val) => <span className="font-mono text-sm text-surface-900 font-bold">{val}</span>
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (val) => formatDate(val)
    },
    {
      header: 'Customer',
      accessor: 'customerName',
      render: (val, row) => (
        <div>
          <span className="font-medium text-surface-900">{val}</span>
          <br/>
          <span className="text-xs text-surface-500 capitalize">{row.branch}</span>
        </div>
      )
    },
    {
      header: 'Mode',
      accessor: 'mode',
      render: (val) => (
        <Badge variant={val === 'PRICE_INCLUDED' ? 'primary' : 'warning'}>
          {val === 'PRICE_INCLUDED' ? 'Standard Bill' : 'Quantity Only'}
        </Badge>
      )
    },
    {
      header: 'Grand Total',
      accessor: 'grandTotal',
      render: (val, row) => row.mode === 'PRICE_INCLUDED' ? formatCurrency(val) : '-'
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/bills/${id}`)}
          className="p-1.5"
        >
          <Eye className="w-4 h-4 text-surface-600" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Bills & Invoices</h1>
          <p className="text-sm text-surface-500 mt-1">Manage sales, billing, and dispatch notes</p>
        </div>
        
        <Button 
          onClick={() => navigate('/bills/new')} 
          icon={<Plus className="w-4 h-4" />}
        >
          Create New Bill
        </Button>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search invoice number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="w-full md:w-64 flex items-center gap-2">
            <Filter className="w-4 h-4 text-surface-500" />
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Modes</option>
              <option value="PRICE_INCLUDED">Standard Bills</option>
              <option value="QUANTITY_ONLY">Dispatch Notes</option>
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
            data={filteredInvoices}
            emptyMessage="No invoices found."
          />
        )}
      </Card>
    </div>
  );
}
