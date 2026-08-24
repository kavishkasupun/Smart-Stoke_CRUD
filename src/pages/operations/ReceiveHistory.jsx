import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Filter } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner } from '../../components/ui';
import { getReceivesHistory } from '../../services/stockReceiveService';
import { formatDate } from '../../utils/formatters';

export default function ReceiveHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredHistory = history.filter(item => 
    item.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
