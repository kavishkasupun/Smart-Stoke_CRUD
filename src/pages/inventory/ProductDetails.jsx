import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Box, Trash2 } from 'lucide-react';
import { Card, Button, Table, Badge, Modal, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageInventory } from '../../utils/permissions';
import { getProductById, getProductVariants, addVariant, updateVariant, deleteVariant } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const canManage = canManageInventory(userProfile?.role);
  const toast = useToast();
  const confirm = useConfirm();

  const [product, setProduct] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Variant Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    size: '',
    sku: '',
    barcode: '',
    costPrice: '',
    sellingPrice: '',
    reorderLevel: '',
    minimumStockLevel: '',
    active: true
  });

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const [prod, vars, cats] = await Promise.all([
        getProductById(id),
        getProductVariants(id),
        getCategories()
      ]);
      
      if (!prod) {
        navigate('/products');
        return;
      }
      
      setProduct(prod);
      setVariants(vars);
      
      const cat = cats.find(c => c.id === prod.categoryId);
      setCategoryName(cat ? cat.name : 'Unknown Category');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (variant = null) => {
    setError(null);
    if (variant) {
      setEditingVariant(variant);
      setFormData({
        name: variant.name || '',
        size: variant.size || '',
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        costPrice: variant.costPrice || '',
        sellingPrice: variant.sellingPrice || '',
        reorderLevel: variant.reorderLevel || '',
        minimumStockLevel: variant.minimumStockLevel || '',
        active: variant.active
      });
    } else {
      setEditingVariant(null);
      setFormData({
        name: '',
        size: '',
        sku: '',
        barcode: '',
        costPrice: '',
        sellingPrice: '',
        reorderLevel: '',
        minimumStockLevel: '',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitVariant = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Variant name is required');
      toast.error('Variant name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const payload = {
        ...formData,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        reorderLevel: Number(formData.reorderLevel) || 0,
        minimumStockLevel: Number(formData.minimumStockLevel) || 0,
      };

      if (editingVariant) {
        await updateVariant(editingVariant.id, payload, userProfile.id);
        toast.success('Variant updated successfully!');
      } else {
        await addVariant(id, payload, userProfile.id);
        toast.success('Variant added successfully!');
      }

      await fetchProductDetails();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Failed to save variant');
      toast.error('Failed to save variant. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    const isConfirmed = await confirm({
      title: 'Delete Variant',
      message: 'Are you sure you want to delete this variant? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await deleteVariant(variantId);
        toast.success('Variant deleted successfully!');
        fetchProductDetails();
      } catch (err) {
        toast.error('Failed to delete variant.');
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-surface-500">Loading details...</div>;
  }

  if (!product) return null;

  const columns = [
    { 
      header: 'Variant Name & Size', 
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
      header: 'Pricing', 
      accessor: 'sellingPrice',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{formatCurrency(val)}</div>
          <div className="text-xs text-surface-500">Cost: {formatCurrency(row.costPrice)}</div>
        </div>
      )
    },
    { 
      header: 'Stock (Mabola)', 
      accessor: 'stock',
      render: (stock, row) => {
        const qty = stock?.mabola || 0;
        const lowStock = qty <= (row.reorderLevel || 0);
        return (
          <Badge variant={qty === 0 ? 'danger' : lowStock ? 'warning' : 'surface'}>
            {qty} units
          </Badge>
        );
      }
    },
    { 
      header: 'Stock (Jaffna)', 
      accessor: 'stock',
      render: (stock, row) => {
        const qty = stock?.jaffna || 0;
        const lowStock = qty <= (row.reorderLevel || 0);
        return (
          <Badge variant={qty === 0 ? 'danger' : lowStock ? 'warning' : 'surface'}>
            {qty} units
          </Badge>
        );
      }
    },
    { 
      header: 'Total Stock', 
      accessor: 'stock',
      render: (stock) => <span className="font-bold">{stock?.overall || 0}</span>
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
    ...(canManage ? [{
      header: 'Actions',
      accessor: 'id',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleOpenModal(row)}
            icon={<Edit2 className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            onClick={() => handleDeleteVariant(row.id)}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            icon={<ArrowLeft className="w-5 h-5" />} 
            onClick={() => navigate('/products')}
            className="p-2"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">{product.name}</h1>
              {!product.active && <Badge variant="surface">Inactive Product</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-surface-500 mt-1">
              <span>Category: <span className="font-medium text-surface-700">{categoryName}</span></span>
              {product.brand && <span>Brand: <span className="font-medium text-surface-700">{product.brand}</span></span>}
            </div>
          </div>
        </div>

        {canManage && (
          <Button 
            variant="outline"
            icon={<Edit2 className="w-4 h-4" />} 
            onClick={() => navigate(`/products/${id}/edit`)}
          >
            Edit Product
          </Button>
        )}
      </div>

      {product.description && (
        <Card className="p-4 bg-surface-50">
          <h3 className="text-sm font-medium text-surface-900 mb-1">Description</h3>
          <p className="text-sm text-surface-600 whitespace-pre-wrap">{product.description}</p>
        </Card>
      )}

      {/* Variants Section */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
            <Box className="w-5 h-5 text-primary-600" />
            Product Variants & Stock
          </h2>
          {canManage && (
            <Button 
              size="sm"
              icon={<Plus className="w-4 h-4" />} 
              onClick={() => handleOpenModal()}
            >
              Add Variant
            </Button>
          )}
        </div>

        <Card>
          <Table 
            columns={columns}
            data={variants}
            emptyMessage={
              <div className="text-center py-8">
                <p className="text-surface-500 mb-4">No variants added yet.</p>
                {canManage && (
                  <Button onClick={() => handleOpenModal()} variant="outline">
                    Add First Variant
                  </Button>
                )}
              </div>
            }
          />
        </Card>
      </div>

      {/* Variant Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingVariant ? 'Edit Variant' : 'Add New Variant'}
        size="lg"
      >
        <form onSubmit={handleSubmitVariant} className="p-6 space-y-6">
          {error && (
            <div className="p-3 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Variant Name"
              placeholder="e.g. 40W Bulb / Red Shirt"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={submitting}
            />
            <Input
              label="Size / Measurement (Optional)"
              placeholder="e.g. 40W, XL, 500ml"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SKU (Optional)"
              placeholder="Leave blank to auto-generate"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              disabled={submitting}
            />
            <Input
              label="Barcode (Optional)"
              placeholder="Leave blank to auto-generate"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cost Price (Rs.)"
              type="number"
              min="0"
              step="0.01"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              required
              disabled={submitting}
            />
            <Input
              label="Selling Price (Rs.)"
              type="number"
              min="0"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              required
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Reorder Level"
              type="number"
              min="0"
              placeholder="Alert when stock falls below"
              value={formData.reorderLevel}
              onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              disabled={submitting}
            />
            <Input
              label="Minimum Stock Level"
              type="number"
              min="0"
              placeholder="Absolute minimum required"
              value={formData.minimumStockLevel}
              onChange={(e) => setFormData({ ...formData, minimumStockLevel: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="variant-active-toggle"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500"
              disabled={submitting}
            />
            <label htmlFor="variant-active-toggle" className="text-sm font-medium text-surface-700">
              Variant is active and available for sale
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-surface-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              isLoading={submitting}
            >
              {editingVariant ? 'Save Variant' : 'Add Variant'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
