import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Filter, Trash2, Edit2 } from 'lucide-react';
import { Card, Table, Button, Input, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageInventory } from '../../utils/permissions';
import { getProducts, deleteProduct } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function Products() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const canManage = canManageInventory(userProfile?.role);
  const toast = useToast();
  const confirm = useConfirm();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load products data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build a lookup map for category names
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {});

  // Apply filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = product?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false;
    const matchesCategory = selectedCategory ? product.categoryId === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await deleteProduct(id);
        toast.success('Product deleted successfully!');
        fetchData();
      } catch (err) {
        toast.error('Failed to delete product.');
      }
    }
  };

  const columns = [
    { 
      header: 'Product Name', 
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{val}</div>
          {row.brand && <div className="text-xs text-surface-500">{row.brand}</div>}
        </div>
      )
    },
    { 
      header: 'Category', 
      accessor: 'categoryId',
      render: (val) => (
        <Badge variant="surface">
          {categoryMap[val] || 'Unknown'}
        </Badge>
      )
    },
    { 
      header: 'Status', 
      accessor: 'active',
      render: (val) => (
        <Badge variant={val ? 'success' : 'surface'}>
          {val ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/products/${id}`)}
            icon={<Eye className="w-4 h-4" />}
          >
            View
          </Button>
          {canManage && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
              onClick={() => handleDelete(id)}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Products</h1>
          <p className="text-sm text-surface-500 mt-1">Manage product catalog and variants</p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => navigate('/products/new')} 
            icon={<Plus className="w-4 h-4" />}
          >
            Add Product
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="w-full md:w-64 relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Data Table */}
        <Table 
          columns={columns}
          data={filteredProducts}
          isLoading={loading}
          emptyMessage="No products found matching your filters."
        />
      </Card>
    </div>
  );
}
