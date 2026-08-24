import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner } from '../../components/ui';
import { getTransfersHistory } from '../../services/stockTransferService';
import { formatDate } from '../../utils/formatters';

export default function TransferHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED': return <Badge variant="success">COMPLETED</Badge>;
      case 'PENDING': return <Badge variant="warning">PENDING</Badge>;
      case 'CANCELLED': return <Badge variant="danger">CANCELLED</Badge>;
      default: return <Badge variant="surface">{status}</Badge>;
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sourceBranch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.destinationBranch?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    return matchesSearch && matchesStatus;
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
