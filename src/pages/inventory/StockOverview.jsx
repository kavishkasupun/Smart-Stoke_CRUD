import { useState, useEffect } from 'react';
import { Search, Filter, Box } from 'lucide-react';
import { Card, Table, Badge, Input, Spinner } from '../../components/ui';
import { getProductVariants } from '../../services/productService';
import { getCategories } from '../../services/categoryService';

export default function StockOverview() {
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [variantsData, categoriesData] = await Promise.all([
        getProductVariants(), // We need a way to fetch all variants or change productService
        getCategories()
      ]);
      
      // Need to adjust getProductVariants in productService to fetch all if no productId is provided.
      setVariants(variantsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load stock overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (variant) => {
    const qty = variant.stock?.overall || 0;
    if (qty === 0) return 'out_of_stock';
    if (qty <= (variant.reorderLevel || 0)) return 'low_stock';
    return 'normal';
  };

  const getStatusBadge = (variant) => {
    const status = getStatus(variant);
    if (status === 'out_of_stock') return <Badge variant="danger">OUT OF STOCK</Badge>;
    if (status === 'low_stock') return <Badge variant="warning">LOW STOCK</Badge>;
    return <Badge variant="success">Normal</Badge>;
  };

  const filteredVariants = variants.filter(variant => {
    const matchesSearch = variant?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
                          variant?.sku?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false;
    const status = getStatus(variant);
    const matchesStatus = selectedStatus ? status === selectedStatus : true;
    
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { 
      header: 'Product/Variant Name', 
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{val}</div>
          {row.size && <div className="text-xs text-surface-500">Size: {row.size}</div>}
          <div className="text-xs text-surface-400 font-mono mt-0.5">SKU: {row.sku || 'N/A'}</div>
        </div>
      )
    },
    { 
      header: 'Mabola', 
      accessor: 'stock',
      render: (s) => <span className="text-surface-700">{s?.mabola || 0}</span>
    },
    { 
      header: 'Jaffna', 
      accessor: 'stock',
      render: (s) => <span className="text-surface-700">{s?.jaffna || 0}</span>
    },
    { 
      header: 'Overall', 
      accessor: 'stock',
      render: (s) => <span className="font-bold">{s?.overall || 0}</span>
    },
    { 
      header: 'Minimum', 
      accessor: 'reorderLevel',
      render: (val) => <span className="text-surface-500">{val || 0}</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (_, row) => getStatusBadge(row)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Stock Overview</h1>
          <p className="text-sm text-surface-500 mt-1">Monitor inventory levels across all branches</p>
        </div>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search by variant name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="w-full md:w-64 relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="normal">Normal</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
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
            data={filteredVariants}
            emptyMessage="No variants found matching your filters."
          />
        )}
      </Card>
    </div>
  );
}
