import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { Card, Button, Input, Select, Spinner } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getProducts, getProductVariants } from '../../services/productService';
import { processStockReceive } from '../../services/stockReceiveService';
import { BRANCHES } from '../../config/constants';

export default function ReceiveStockForm() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  // Form State
  const [receiveData, setReceiveData] = useState({
    referenceId: '',
    supplier: '',
    importDate: new Date().toISOString().split('T')[0],
    destinationBranch: '',
    notes: ''
  });

  const [items, setItems] = useState([
    { id: Date.now(), productId: '', variantId: '', quantity: '', costPrice: '', batchReference: '' }
  ]);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [prodData, varData] = await Promise.all([
        getProducts({ activeOnly: true }),
        getProductVariants() // Fetches all variants
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
        // If product changes, reset variant
        if (field === 'productId') {
          updatedItem.variantId = '';
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), productId: '', variantId: '', quantity: '', costPrice: '', batchReference: '' }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic Validation
    if (!receiveData.referenceId || !receiveData.supplier || !receiveData.destinationBranch) {
      toast.error('Please fill in all required header fields.');
      return;
    }

    const invalidItems = items.filter(i => !i.productId || !i.variantId || !i.quantity || Number(i.quantity) <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have a product, variant, and quantity > 0.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Confirm Stock Receive',
      message: `Are you sure you want to receive ${items.length} items to ${receiveData.destinationBranch}? This will permanently update inventory levels.`,
      confirmText: 'Confirm Receive',
      type: 'info'
    });

    if (!isConfirmed) return;

    try {
      setSubmitting(true);
      await processStockReceive(receiveData, items, userProfile.id);
      toast.success('Stock received and inventory updated successfully!');
      navigate('/stock-receiving');
    } catch (error) {
      toast.error(error.message || 'Failed to process stock receive.');
    } finally {
      setSubmitting(false);
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
          onClick={() => navigate('/stock-receiving')}
          className="p-2"
        />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Receive Stock</h1>
          <p className="text-sm text-surface-500 mt-1">Record imported or newly received inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Details */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-surface-900 mb-4">Import Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Reference Number *"
              placeholder="e.g. IMP-00001"
              value={receiveData.referenceId}
              onChange={e => setReceiveData({...receiveData, referenceId: e.target.value})}
              required
            />
            <Input
              label="Supplier *"
              placeholder="Supplier Name"
              value={receiveData.supplier}
              onChange={e => setReceiveData({...receiveData, supplier: e.target.value})}
              required
            />
            <Input
              label="Import Date *"
              type="date"
              value={receiveData.importDate}
              onChange={e => setReceiveData({...receiveData, importDate: e.target.value})}
              required
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Destination Branch *</label>
              <select
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={receiveData.destinationBranch}
                onChange={e => setReceiveData({...receiveData, destinationBranch: e.target.value})}
                required
              >
                <option value="">Select Branch</option>
                {Object.values(BRANCHES).map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Input
              label="Notes"
              placeholder="Any additional information..."
              value={receiveData.notes}
              onChange={e => setReceiveData({...receiveData, notes: e.target.value})}
            />
          </div>
        </Card>

        {/* Items List */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-surface-900">Received Items</h2>
            <Button type="button" variant="outline" size="sm" onClick={addItem} icon={<Plus className="w-4 h-4" />}>
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const productVariants = variants.filter(v => v.productId === item.productId);
              
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mr-8">
                    <div className="space-y-1">
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

                    <div className="space-y-1">
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
                    </div>

                    <Input
                      label="Quantity *"
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                      required
                    />
                    
                    <Input
                      label="Unit Cost Price (Rs.)"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Cost per item"
                      value={item.costPrice}
                      onChange={e => handleItemChange(item.id, 'costPrice', e.target.value)}
                    />
                    
                    <Input
                      label="Batch/Ref (Optional)"
                      placeholder="e.g. BATCH-A1"
                      value={item.batchReference}
                      onChange={e => handleItemChange(item.id, 'batchReference', e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/stock-receiving')} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting} icon={<Save className="w-4 h-4" />}>
            Confirm Receiving
          </Button>
        </div>
      </form>
    </div>
  );
}
