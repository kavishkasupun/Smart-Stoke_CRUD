import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, Button, Input, Spinner } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getProducts, getProductVariants } from '../../services/productService';
import { createAdjustment } from '../../services/stockAdjustmentService';
import { BRANCHES } from '../../config/constants';
import { canAdjustStock } from '../../utils/permissions';

const ADJUSTMENT_TYPES = [
  'DAMAGED',
  'LOST',
  'FOUND',
  'COUNTING_ERROR',
  'OTHER'
];

export default function CreateAdjustmentForm() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    branch: '',
    productId: '',
    variantId: '',
    adjustQty: '',
    type: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    // Permission check
    if (userProfile && !canAdjustStock(userProfile.role, userProfile.branchId, 'all')) {
      toast.error("You don't have permission to adjust stock.");
      navigate('/stock-overview');
      return;
    }
    fetchInventoryData();
  }, [userProfile]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [prodData, varData] = await Promise.all([
        getProducts({ activeOnly: true }),
        getProductVariants() 
      ]);
      setProducts(prodData);
      setVariants(varData.filter(v => v.active));
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStock = () => {
    if (!formData.branch || !formData.variantId) return null;
    const variant = variants.find(v => v.id === formData.variantId);
    if (!variant || !variant.stock) return 0;
    const branchKey = formData.branch.toLowerCase();
    return variant.stock[branchKey] || 0;
  };

  const currentStock = getAvailableStock();
  const newStock = currentStock !== null && formData.adjustQty !== '' 
    ? currentStock + Number(formData.adjustQty) 
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.branch || !formData.variantId || formData.adjustQty === '' || !formData.type) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (Number(formData.adjustQty) === 0) {
      toast.error('Adjustment quantity cannot be zero.');
      return;
    }

    if (newStock < 0) {
      toast.error('Adjustment would result in negative stock. Please check your quantities.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Confirm Stock Adjustment',
      message: `Are you sure you want to adjust stock by ${formData.adjustQty}? The new system stock will be ${newStock}.`,
      confirmText: 'Confirm Adjustment',
      type: 'warning'
    });

    if (!isConfirmed) return;

    try {
      setSubmitting(true);
      toast.showLoading('Adjusting Stock...');
      await createAdjustment(formData, userProfile.id);
      toast.success('Stock adjusted successfully!');
      navigate('/adjustments');
    } catch (error) {
      toast.error(error.message || 'Failed to adjust stock.');
    } finally {
      setSubmitting(false);
      toast.hideLoading();
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  }

  const productVariants = variants.filter(v => v.productId === formData.productId);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/adjustments')}
          className="p-2"
        />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Adjust Stock</h1>
          <p className="text-sm text-surface-500 mt-1">Record physical discrepancies in the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Branch *</label>
              <select
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.branch}
                onChange={e => setFormData({...formData, branch: e.target.value})}
                required
              >
                <option value="">Select Branch</option>
                {Object.values(BRANCHES).map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Adjustment Type *</label>
              <select
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                required
              >
                <option value="">Select Type</option>
                {ADJUSTMENT_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Product *</label>
              <select
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.productId}
                onChange={e => setFormData({...formData, productId: e.target.value, variantId: ''})}
                required
              >
                <option value="">Select Product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Variant/Size *</label>
              <select
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                value={formData.variantId}
                onChange={e => setFormData({...formData, variantId: e.target.value})}
                required
                disabled={!formData.productId}
              >
                <option value="">Select Variant</option>
                {productVariants.map(v => <option key={v.id} value={v.id}>{v.name} {v.size ? `(${v.size})` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl">
            <h3 className="text-sm font-bold text-surface-900 mb-4">Quantity Adjustment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Current System Stock</label>
                <div className="text-2xl font-bold text-surface-900">
                  {currentStock !== null ? currentStock : '-'}
                </div>
              </div>
              
              <div>
                <Input
                  label="Adjustment Qty (+ or -) *"
                  type="number"
                  placeholder="e.g. -3 or 5"
                  value={formData.adjustQty}
                  onChange={e => setFormData({...formData, adjustQty: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">New System Stock</label>
                <div className={`text-2xl font-bold ${newStock !== null && newStock < 0 ? 'text-danger-600' : 'text-primary-600'}`}>
                  {newStock !== null ? newStock : '-'}
                </div>
              </div>
            </div>
            {newStock !== null && newStock < 0 && (
              <p className="text-sm text-danger-500 mt-2">Error: Stock cannot go below zero.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Input
              label="Reason *"
              placeholder="Brief explanation for the discrepancy"
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
              required
            />
            <Input
              label="Additional Notes (Optional)"
              placeholder="Any other details..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/adjustments')} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting} icon={<Save className="w-4 h-4" />} disabled={newStock !== null && newStock < 0}>
            Submit Adjustment
          </Button>
        </div>
      </form>
    </div>
  );
}
