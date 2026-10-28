import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, PackagePlus } from 'lucide-react';
import { Card, Button, Input, Select, Spinner, SearchableSelect } from '../../components/ui';
import QuickAddProductModal from '../../components/inventory/QuickAddProductModal';
import QuickAddVariantModal from '../../components/inventory/QuickAddVariantModal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getProducts, getProductVariants } from '../../services/productService';
import { processStockReceive } from '../../services/stockReceiveService';
import { generateReferenceNumber } from '../../services/dbHelpers';
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

  // Quick Add Modal States
  const [productModalState, setProductModalState] = useState({
    isOpen: false,
    targetItemId: null,
    initialName: ''
  });

  const [variantModalState, setVariantModalState] = useState({
    isOpen: false,
    targetItemId: null,
    product: null
  });

  // Form State
  const [receiveData, setReceiveData] = useState({
    referenceId: generateReferenceNumber('IMP'),
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

  // Memoized product options for SearchableSelect
  const productOptions = useMemo(() => {
    return products.map(p => ({
      value: p.id,
      label: p.name,
      sublabel: [
        p.brand,
        p.sku ? `SKU: ${p.sku}` : null,
        p.productType === 'RAW_MATERIAL' ? 'Raw Material' : null
      ].filter(Boolean).join(' • '),
      searchKeywords: `${p.name} ${p.brand || ''} ${p.sku || ''} ${p.barcode || ''}`
    }));
  }, [products]);

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // If product changes, reset variant & auto-fill cost price if non-variant has one
        if (field === 'productId') {
          updatedItem.variantId = '';
          const prod = products.find(p => p.id === value);
          if (prod && prod.hasVariants === false && prod.costPrice && !item.costPrice) {
            updatedItem.costPrice = String(prod.costPrice);
          }
        }
        // If variant changes, auto-fill variant cost price if empty
        if (field === 'variantId') {
          const v = variants.find(v => v.id === value);
          if (v && v.costPrice && !item.costPrice) {
            updatedItem.costPrice = String(v.costPrice);
          }
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

  // Quick Add Product Handlers
  const handleOpenProductModal = (targetItemId = null, initialName = '') => {
    setProductModalState({
      isOpen: true,
      targetItemId,
      initialName
    });
  };

  const handleCloseProductModal = () => {
    setProductModalState({ isOpen: false, targetItemId: null, initialName: '' });
  };

  const handleProductCreated = ({ product, variant }) => {
    // Add product to state immediately
    setProducts(prev => {
      const exists = prev.some(p => p.id === product.id);
      return exists ? prev : [product, ...prev];
    });

    if (variant) {
      setVariants(prev => {
        const exists = prev.some(v => v.id === variant.id);
        return exists ? prev : [variant, ...prev];
      });
    }

    const targetId = productModalState.targetItemId;
    const initialCost = (variant?.costPrice || product?.costPrice);

    if (targetId) {
      setItems(prev => prev.map(item => {
        if (item.id === targetId) {
          return {
            ...item,
            productId: product.id,
            variantId: variant ? variant.id : '',
            costPrice: initialCost ? String(initialCost) : item.costPrice
          };
        }
        return item;
      }));
    } else {
      // Triggered from header "+ New Product" button
      setItems(prev => {
        const lastItem = prev[prev.length - 1];
        if (lastItem && !lastItem.productId) {
          return prev.map((item, idx) => {
            if (idx === prev.length - 1) {
              return {
                ...item,
                productId: product.id,
                variantId: variant ? variant.id : '',
                costPrice: initialCost ? String(initialCost) : item.costPrice
              };
            }
            return item;
          });
        } else {
          return [
            ...prev,
            {
              id: Date.now(),
              productId: product.id,
              variantId: variant ? variant.id : '',
              quantity: '',
              costPrice: initialCost ? String(initialCost) : '',
              batchReference: ''
            }
          ];
        }
      });
    }

    // Quiet sync with backend
    fetchInventoryData();
  };

  // Quick Add Variant Handlers
  const handleOpenVariantModal = (targetItemId, productId) => {
    const product = products.find(p => p.id === productId);
    setVariantModalState({
      isOpen: true,
      targetItemId,
      product
    });
  };

  const handleCloseVariantModal = () => {
    if (variantModalState.targetItemId) {
      setItems(prev => prev.map(item => {
        if (item.id === variantModalState.targetItemId && item.variantId === '__NEW_VARIANT__') {
          return { ...item, variantId: '' };
        }
        return item;
      }));
    }
    setVariantModalState({ isOpen: false, targetItemId: null, product: null });
  };

  const handleVariantCreated = (newVariant) => {
    setVariants(prev => {
      const exists = prev.some(v => v.id === newVariant.id);
      return exists ? prev : [newVariant, ...prev];
    });

    const targetId = variantModalState.targetItemId;
    if (targetId) {
      setItems(prev => prev.map(item => {
        if (item.id === targetId) {
          return {
            ...item,
            variantId: newVariant.id,
            costPrice: newVariant.costPrice ? String(newVariant.costPrice) : item.costPrice
          };
        }
        return item;
      }));
    }

    fetchInventoryData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic Validation
    if (!receiveData.referenceId || !receiveData.supplier || !receiveData.destinationBranch) {
      toast.error('Please fill in all required header fields.');
      return;
    }

    const invalidItems = items.filter(i => {
      const product = products.find(p => p.id === i.productId);
      if (!product) return true;
      if (product.hasVariants !== false && !i.variantId) return true;
      if (!i.quantity || Number(i.quantity) <= 0) return true;
      return false;
    });

    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have a valid product, variant (if applicable), and quantity > 0.');
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
      toast.showLoading('Receiving Stock...');
      await processStockReceive(receiveData, items, userProfile.id);
      toast.success('Stock received and inventory updated successfully!');
      navigate('/stock-receiving');
    } catch (error) {
      toast.error(error.message || 'Failed to process stock receive.');
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-surface-900">Received Items</h2>
              <p className="text-xs text-surface-500 mt-0.5">Select existing items or add new products on the fly</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => handleOpenProductModal(null)} 
                icon={<PackagePlus className="w-4 h-4 text-primary-600" />}
                className="border-primary-200 bg-primary-50/50 hover:bg-primary-100/70 text-primary-700"
              >
                New Product
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addItem} icon={<Plus className="w-4 h-4" />}>
                Add Item
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const selectedProduct = products.find(p => p.id === item.productId);
              const productVariants = variants.filter(v => v.productId === item.productId);
              const hasVariants = selectedProduct ? selectedProduct.hasVariants !== false : true;
              
              const currentVariantOptions = productVariants.map(v => ({
                value: v.id,
                label: v.name + (v.size ? ` (${v.size})` : ''),
                sublabel: [
                  v.sku ? `SKU: ${v.sku}` : null,
                  v.costPrice ? `Rs. ${v.costPrice}` : null
                ].filter(Boolean).join(' • '),
                searchKeywords: `${v.name} ${v.size || ''} ${v.sku || ''} ${v.barcode || ''}`
              }));

              return (
                <div 
                  key={item.id} 
                  className="p-4 bg-surface-50 border border-surface-200 rounded-xl relative"
                  style={{ zIndex: items.length - index + 10 }}
                >
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
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-surface-600">Product *</label>
                        <button
                          type="button"
                          onClick={() => handleOpenProductModal(item.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-0.5 hover:underline"
                          title="Create and select a new product"
                        >
                          <Plus className="w-3 h-3" /> New Product
                        </button>
                      </div>
                      <SearchableSelect
                        value={item.productId}
                        onChange={val => handleItemChange(item.id, 'productId', val)}
                        placeholder="Search or Select Product..."
                        searchPlaceholder="Type name, brand, SKU to search..."
                        options={productOptions}
                        onAddNew={(searchText) => handleOpenProductModal(item.id, searchText)}
                        addNewText="+ Add New Product..."
                        required
                      />
                    </div>

                    {hasVariants && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-surface-600">Variant/Size *</label>
                          {item.productId && (
                            <button
                              type="button"
                              onClick={() => handleOpenVariantModal(item.id, item.productId)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-0.5 hover:underline"
                              title="Create a new variant for this product"
                            >
                              <Plus className="w-3 h-3" /> New Variant
                            </button>
                          )}
                        </div>
                        <SearchableSelect
                          value={item.variantId}
                          onChange={val => handleItemChange(item.id, 'variantId', val)}
                          placeholder={item.productId ? "Search or Select Variant..." : "Select product first"}
                          searchPlaceholder="Search variant, size..."
                          options={currentVariantOptions}
                          disabled={!item.productId}
                          onAddNew={item.productId ? () => handleOpenVariantModal(item.id, item.productId) : null}
                          addNewText="+ Add New Variant..."
                          required
                        />
                      </div>
                    )}

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

      {/* Quick Add Product Modal */}
      <QuickAddProductModal
        isOpen={productModalState.isOpen}
        onClose={handleCloseProductModal}
        onSuccess={handleProductCreated}
        initialName={productModalState.initialName}
      />

      {/* Quick Add Variant Modal */}
      <QuickAddVariantModal
        isOpen={variantModalState.isOpen}
        onClose={handleCloseVariantModal}
        product={variantModalState.product}
        onSuccess={handleVariantCreated}
      />
    </div>
  );
}
