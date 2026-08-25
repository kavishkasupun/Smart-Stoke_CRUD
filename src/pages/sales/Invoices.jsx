import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Eye, Filter } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner } from '../../components/ui';
import { getInvoices } from '../../services/invoiceService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');

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

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesMode = modeFilter === 'ALL' || invoice.mode === modeFilter;

    return matchesSearch && matchesMode;
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
              <option value="PRICE_INCLUDED">Standard Bills (Price)</option>
              <option value="QUANTITY_ONLY">Dispatch Notes (Qty Only)</option>
            </select>
          </div>
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
