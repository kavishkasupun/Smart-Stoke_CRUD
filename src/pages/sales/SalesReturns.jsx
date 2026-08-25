import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { Card, Button, Input, Table, Badge, Spinner } from '../../components/ui';
import { getSalesReturns } from '../../services/salesReturnService';
import { formatDate } from '../../utils/formatters';

export default function SalesReturns() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredReturns = returns.filter(ret => 
    ret.returnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.branch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search returns..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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
