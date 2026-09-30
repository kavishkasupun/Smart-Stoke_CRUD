import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Filter, Trash2, Edit2 } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageInventory } from '../../utils/permissions';
import { getProducts, deleteProduct } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useDebounce } from '../../hooks/useDebounce';

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
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');

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
  const categoryMap = React.useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {});
  }, [categories]);

  // Apply filters using useMemo
  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product?.name?.toLowerCase()?.includes(debouncedSearch.toLowerCase()) || false;
      const matchesCategory = selectedCategory ? product.categoryId === selectedCategory : true;
      const matchesType = selectedProductType ? product.productType === selectedProductType : true;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [products, debouncedSearch, selectedCategory]);

  const handleDelete = async (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    let totalStock = 0;
    if (product.hasVariants === false) {
      totalStock = parseFloat(product.stock?.overall || 0) || 0;
    } else {
      toast.showLoading('Checking stock...');
      try {
        const { getProductVariants } = await import('../../services/productService');
        const variants = await getProductVariants(id);
        totalStock = variants.reduce((sum, v) => sum + (parseFloat(v.stock?.overall || 0) || 0), 0);
      } catch (err) {
        console.error(err);
      }
      toast.hideLoading();
    }

    let message = 'Are you sure you want to delete this product? This action cannot be undone.';
    if (totalStock > 0) {
      message = `This product currently has ${totalStock} units in stock! Deleting it will PERMANENTLY DELETE all associated stock records and variants. Are you sure you want to proceed?`;
    } else if (product.hasVariants !== false) {
      message = `Deleting this product will also delete all of its variants. Are you sure you want to proceed?`;
    }

    const isConfirmed = await confirm({
      title: 'Delete Product',
      message: message,
      confirmText: 'Delete',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        toast.showLoading('Deleting Product...');
        await deleteProduct(id);
        toast.success('Product and its stock deleted successfully!');
        fetchData();
      } catch (err) {
        toast.error('Failed to delete product.');
      } finally {
        toast.hideLoading();
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
      header: 'Type',
      accessor: 'productType',
      render: (val) => (
        <Badge variant={val === 'RAW_MATERIAL' ? 'warning' : 'primary'}>
          {val === 'RAW_MATERIAL' ? 'Raw Material' : 'Finished Product'}
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
              onClick={() => navigate(`/products/${id}/edit`)}
              icon={<Edit2 className="w-4 h-4" />}
            >
              Edit
            </Button>
          )}
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
          
          <div className="w-full md:w-48 relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Types</option>
              <option value="FINISHED_PRODUCT">Finished Products</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
            </select>
          </div>
        </div>
        
        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Spinner />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={filteredProducts}
            emptyMessage="No products found matching your filters."
          />
        )}
      </Card>
    </div>
  );
}
