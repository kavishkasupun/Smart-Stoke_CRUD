import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Send } from 'lucide-react';
import { Card, Button, Input, Spinner, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getProducts, getProductVariants } from '../../services/productService';
import { createTransfer } from '../../services/stockTransferService';
import { BRANCHES } from '../../config/constants';

export default function CreateTransferForm() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  // Form State
  const [transferData, setTransferData] = useState({
    sourceBranch: '',
    destinationBranch: '',
    notes: ''
  });

  const [items, setItems] = useState([
    { id: Date.now(), productId: '', variantId: '', quantity: '' }
  ]);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [prodData, varData] = await Promise.all([
        getProducts({ activeOnly: true }),
        getProductVariants() // Fetches all active variants
      ]);
      setProducts(prodData);
      setVariants(varData.filter(v => v.active));
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Reset variant if product changes
        if (field === 'productId') {
          updatedItem.variantId = '';
          updatedItem.quantity = '';
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), productId: '', variantId: '', quantity: '' }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const getAvailableStock = (variantId) => {
    if (!transferData.sourceBranch || !variantId) return 0;
    const variant = variants.find(v => v.id === variantId);
    if (!variant || !variant.stock) return 0;
    const branchKey = transferData.sourceBranch.toLowerCase();
    return variant.stock[branchKey] || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!transferData.sourceBranch || !transferData.destinationBranch) {
      toast.error('Please select both source and destination branches.');
      return;
    }

    if (transferData.sourceBranch === transferData.destinationBranch) {
      toast.error('Source and destination branches cannot be the same.');
      return;
    }

    // Validate Items
    for (const item of items) {
      if (!item.productId || !item.variantId || !item.quantity || Number(item.quantity) <= 0) {
        toast.error('Please ensure all items have a product, variant, and valid quantity.');
        return;
      }
      const available = getAvailableStock(item.variantId);
      if (Number(item.quantity) > available) {
        const variant = variants.find(v => v.id === item.variantId);
        toast.error(`Insufficient stock for ${variant?.name || 'an item'}. Available in ${transferData.sourceBranch}: ${available}`);
        return;
      }
    }

    const isConfirmed = await confirm({
      title: 'Submit Transfer Request',
      message: `Are you sure you want to request a transfer from ${transferData.sourceBranch} to ${transferData.destinationBranch}? It will require approval to complete.`,
      confirmText: 'Submit Request',
      type: 'info'
    });

    if (!isConfirmed) return;

    try {
      setSubmitting(true);
      toast.showLoading('Submitting Transfer Request...');
      await createTransfer(transferData, items, userProfile.id);
      toast.success('Transfer request created successfully!');
      navigate('/stock-transfers');
    } catch (error) {
      toast.error(error.message || 'Failed to create transfer.');
    } finally {
      setSubmitting(false);
      toast.hideLoading();
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/stock-transfers')}
          className="p-2"
        />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Create Transfer</h1>
          <p className="text-sm text-surface-500 mt-1">Request a stock transfer between branches</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-surface-900 mb-4">Transfer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Source Branch (From) *</label>
              <select
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={transferData.sourceBranch}
                onChange={e => setTransferData({...transferData, sourceBranch: e.target.value})}
                required
              >
                <option value="">Select Origin Branch</option>
                {Object.values(BRANCHES).map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Destination Branch (To) *</label>
              <select
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={transferData.destinationBranch}
                onChange={e => setTransferData({...transferData, destinationBranch: e.target.value})}
                required
              >
                <option value="">Select Destination Branch</option>
                {Object.values(BRANCHES).map(b => (
                  <option key={b.id} value={b.name} disabled={b.name === transferData.sourceBranch}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <Input
              label="Notes (Optional)"
              placeholder="Reason for transfer, vehicle details, etc."
              value={transferData.notes}
              onChange={e => setTransferData({...transferData, notes: e.target.value})}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-surface-900">Items to Transfer</h2>
            <Button type="button" variant="outline" size="sm" onClick={addItem} icon={<Plus className="w-4 h-4" />}>
              Add Item
            </Button>
          </div>

          {!transferData.sourceBranch ? (
            <div className="p-4 bg-info-50 text-info-700 rounded-lg text-sm">
              Please select a Source Branch first to view available stock.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => {
                const productVariants = variants.filter(v => v.productId === item.productId);
                const availableStock = getAvailableStock(item.variantId);
                const isOverStock = item.variantId && Number(item.quantity) > availableStock;

                return (
                  <div key={item.id} className="p-4 bg-surface-50 border border-surface-200 rounded-xl relative">
                    <div className="absolute -top-3 -left-3 w-6 h-6 bg-surface-900 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                      {index + 1}
                    </div>
                    
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="absolute top-4 right-4 text-danger-500 hover:text-danger-700 bg-white rounded-full p-1 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mr-8">
                      <div className="col-span-1 md:col-span-4 space-y-1">
                        <label className="block text-xs font-medium text-surface-600">Product *</label>
                        <select
                          className="w-full px-3 py-2 text-sm bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          value={item.productId}
                          onChange={e => handleItemChange(item.id, 'productId', e.target.value)}
                          required
                        >
                          <option value="">Select Product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>

                      <div className="col-span-1 md:col-span-4 space-y-1">
                        <label className="block text-xs font-medium text-surface-600">Variant/Size *</label>
                        <select
                          className="w-full px-3 py-2 text-sm bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                          value={item.variantId}
                          onChange={e => handleItemChange(item.id, 'variantId', e.target.value)}
                          required
                          disabled={!item.productId}
                        >
                          <option value="">Select Variant...</option>
                          {productVariants.map(v => <option key={v.id} value={v.id}>{v.name} {v.size ? `(${v.size})` : ''}</option>)}
                        </select>
                        {item.variantId && (
                          <div className="text-xs mt-1 text-surface-500 flex justify-between">
                            <span>Available:</span>
                            <span className={availableStock > 0 ? 'text-success-600 font-bold' : 'text-danger-600 font-bold'}>
                              {availableStock}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="col-span-1 md:col-span-4">
                        <Input
                          label="Transfer Quantity *"
                          type="number"
                          min="1"
                          max={availableStock || ''}
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                          required
                        />
                        {isOverStock && (
                          <p className="text-xs text-danger-500 mt-1">Exceeds available stock!</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/stock-transfers')} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting} icon={<Send className="w-4 h-4" />}>
            Submit Transfer Request
          </Button>
        </div>
      </form>
    </div>
  );
}
