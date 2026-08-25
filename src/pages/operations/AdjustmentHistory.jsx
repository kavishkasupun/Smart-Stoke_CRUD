import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner } from '../../components/ui';
import { getAdjustmentsHistory } from '../../services/stockAdjustmentService';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { canAdjustStock } from '../../utils/permissions';
import { getProductVariants } from '../../services/productService';

export default function AdjustmentHistory() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [variantsMap, setVariantsMap] = useState({});
  const canAdjust = userProfile ? canAdjustStock(userProfile.role, userProfile.branchId, 'all') : false;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [data, allVariants] = await Promise.all([
        getAdjustmentsHistory(),
        getProductVariants() // fetch all active to map IDs to names
      ]);
      
      const vMap = {};
      allVariants.forEach(v => {
        vMap[v.id] = v.name + (v.size ? ` (${v.size})` : '');
      });
      setVariantsMap(vMap);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load adjustments history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQtyBadge = (qty) => {
    if (qty > 0) return <span className="font-bold text-success-600">+{qty}</span>;
    if (qty < 0) return <span className="font-bold text-danger-600">{qty}</span>;
    return <span>{qty}</span>;
  };

  const filteredHistory = history.filter(item => 
    item.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.branch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      header: 'Variant', 
      accessor: 'variantId',
      render: (val) => <span className="text-surface-700">{variantsMap[val] || 'Unknown Variant'}</span>
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
