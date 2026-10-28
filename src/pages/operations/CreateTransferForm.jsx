import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Send, Layers, Package } from 'lucide-react';
import { Card, Button, Input, Spinner, Badge, Modal, SearchableSelect } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getProducts, getProductVariants } from '../../services/productService';
import { createTransfer, completeTransfer } from '../../services/stockTransferService';
import { getActiveBoms } from '../../services/bomService';
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
  const [boms, setBoms] = useState([]);

  // BOM Modal State
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [selectedBomId, setSelectedBomId] = useState('');
  const [bomQuantity, setBomQuantity] = useState('');

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
      const [prodData, varData, bomsData] = await Promise.all([
        getProducts({ activeOnly: true }),
        getProductVariants(), // Fetches all active variants
        getActiveBoms()
      ]);
      setProducts(prodData);
      setVariants(varData.filter(v => v.active));
      setBoms(bomsData);
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get detailed stock levels (Mabola, Jaffna, Overall)
  const getItemStockDetails = (productId, variantId) => {
    if (!productId) {
      return { mabola: 0, jaffna: 0, overall: 0, isProductLevel: false };
    }

    const product = products.find(p => p.id === productId);
    if (!product) return { mabola: 0, jaffna: 0, overall: 0, isProductLevel: false };

    // If specific variant is selected
    if (variantId) {
      const variant = variants.find(v => v.id === variantId);
      const mabola = variant?.stock?.mabola || 0;
      const jaffna = variant?.stock?.jaffna || 0;
      const overall = variant?.stock?.overall ?? (mabola + jaffna);
      return { mabola, jaffna, overall, isProductLevel: false };
    }

    // If product has NO variants (single product)
    if (product.hasVariants === false) {
      const mabola = product.stock?.mabola || 0;
      const jaffna = product.stock?.jaffna || 0;
      const overall = product.stock?.overall ?? (mabola + jaffna);
      return { mabola, jaffna, overall, isProductLevel: false };
    }

    // If product HAS variants but none selected yet: sum across all its variants
    const productVariants = variants.filter(v => v.productId === productId);
    const mabola = productVariants.reduce((sum, v) => sum + (v.stock?.mabola || 0), 0);
    const jaffna = productVariants.reduce((sum, v) => sum + (v.stock?.jaffna || 0), 0);
    const overall = productVariants.reduce((sum, v) => sum + (v.stock?.overall ?? ((v.stock?.mabola || 0) + (v.stock?.jaffna || 0))), 0);
    return { mabola, jaffna, overall, isProductLevel: true };
  };

  // Memoized product options with real-time stock summaries
  const productOptions = useMemo(() => {
    return products.map(p => {
      const isSingle = p.hasVariants === false;
      let mabola = 0, jaffna = 0, overall = 0;

      if (isSingle) {
        mabola = p.stock?.mabola || 0;
        jaffna = p.stock?.jaffna || 0;
        overall = p.stock?.overall ?? (mabola + jaffna);
      } else {
        const vars = variants.filter(v => v.productId === p.id);
        mabola = vars.reduce((acc, v) => acc + (v.stock?.mabola || 0), 0);
        jaffna = vars.reduce((acc, v) => acc + (v.stock?.jaffna || 0), 0);
        overall = vars.reduce((acc, v) => acc + (v.stock?.overall ?? ((v.stock?.mabola || 0) + (v.stock?.jaffna || 0))), 0);
      }

      const stockSummary = `Overall: ${overall} (Mabola: ${mabola}, Jaffna: ${jaffna})`;
      const sub = [p.brand, p.sku ? `SKU: ${p.sku}` : null, stockSummary].filter(Boolean).join(' • ');

      return {
        value: p.id,
        label: p.name,
        sublabel: sub,
        searchKeywords: `${p.name} ${p.brand || ''} ${p.sku || ''} ${p.barcode || ''} ${stockSummary}`
      };
    });
  }, [products, variants]);

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
    } else {
      setItems([{ id: Date.now(), productId: '', variantId: '', quantity: '' }]);
    }
  };

  const handleAddFromBom = () => {
    if (!selectedBomId || !bomQuantity || Number(bomQuantity) <= 0) {
      toast.error('Please select a valid BOM and enter a quantity greater than 0.');
      return;
    }

    const selectedBom = boms.find(b => b.id === selectedBomId);
    if (!selectedBom || !selectedBom.materials) return;

    const multiplier = Number(bomQuantity);
    
    // Add new items from BOM
    const newItems = selectedBom.materials.map((mat, index) => ({
      id: Date.now() + index,
      productId: mat.productId,
      variantId: mat.variantId || '',
      quantity: String(Number(mat.quantity) * multiplier)
    }));

    // Filter out empty items
    const currentItems = items.filter(item => item.productId || item.variantId || item.quantity);

    setItems([...currentItems, ...newItems]);
    
    setIsBomModalOpen(false);
    setSelectedBomId('');
    setBomQuantity('');
    toast.success(`Added raw materials for ${multiplier} BOM units.`);
  };

  const getAvailableStock = (productId, variantId) => {
    if (!transferData.sourceBranch || !productId) return 0;
    const branchKey = transferData.sourceBranch.toLowerCase();
    
    if (variantId) {
      const variant = variants.find(v => v.id === variantId);
      if (!variant || !variant.stock) return 0;
      return variant.stock[branchKey] || 0;
    } else {
      const product = products.find(p => p.id === productId);
      if (!product || product.hasVariants !== false || !product.stock) return 0;
      return product.stock[branchKey] || 0;
    }
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
      const product = products.find(p => p.id === item.productId);
      if (!item.productId || (product && product.hasVariants !== false && !item.variantId) || !item.quantity || Number(item.quantity) <= 0) {
        toast.error('Please ensure all items have a valid product, variant (if applicable), and quantity.');
        return;
      }
      const available = getAvailableStock(item.productId, item.variantId);
      if (Number(item.quantity) > available) {
        const itemName = item.variantId ? variants.find(v => v.id === item.variantId)?.name : product?.name;
        toast.error(`Insufficient stock for ${itemName || 'an item'}. Available in ${transferData.sourceBranch}: ${available}`);
        return;
      }
    }

    const isConfirmed = await confirm({
      title: 'Confirm Stock Transfer',
      message: `Are you sure you want to transfer stock from ${transferData.sourceBranch} to ${transferData.destinationBranch}? This will immediately deduct stock from the source and add it to the destination.`,
      confirmText: 'Confirm Transfer',
      type: 'info'
    });

    if (!isConfirmed) return;

    try {
      setSubmitting(true);
      toast.showLoading('Processing Transfer...');
      const refId = await createTransfer(transferData, items, userProfile.id);
      await completeTransfer(refId, userProfile.id);
      toast.success('Transfer completed successfully!');
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
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBomModalOpen(true)} icon={<Layers className="w-4 h-4" />}>
                Load from BOM
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addItem} icon={<Plus className="w-4 h-4" />}>
                Add Item
              </Button>
            </div>
          </div>

          {!transferData.sourceBranch ? (
            <div className="p-4 bg-info-50 text-info-700 rounded-lg text-sm">
              Please select a Source Branch first to view available stock.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => {
                const selectedProduct = products.find(p => p.id === item.productId);
                const productVariants = variants.filter(v => v.productId === item.productId);
                const hasVariants = selectedProduct ? selectedProduct.hasVariants !== false : true;
                const availableStock = getAvailableStock(item.productId, item.variantId);
                const stockDetails = getItemStockDetails(item.productId, item.variantId);
                
                // For a product with hasVariants false, or when variant is selected
                const isOverStock = (item.variantId || !hasVariants) && Number(item.quantity) > availableStock;

                const currentVariantOptions = productVariants.map(v => {
                  const mabola = v.stock?.mabola || 0;
                  const jaffna = v.stock?.jaffna || 0;
                  const overall = v.stock?.overall ?? (mabola + jaffna);
                  const stockSummary = `Overall: ${overall} (Mabola: ${mabola}, Jaffna: ${jaffna})`;
                  const sub = [v.size ? `Size: ${v.size}` : null, v.sku ? `SKU: ${v.sku}` : null, stockSummary].filter(Boolean).join(' • ');

                  return {
                    value: v.id,
                    label: v.name + (v.size ? ` (${v.size})` : ''),
                    sublabel: sub,
                    searchKeywords: `${v.name} ${v.size || ''} ${v.sku || ''} ${v.barcode || ''} ${stockSummary}`
                  };
                });

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

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mr-8">
                      {/* Product Selector */}
                      <div className="col-span-1 md:col-span-4 space-y-1">
                        <label className="block text-xs font-medium text-surface-600">Product *</label>
                        <SearchableSelect
                          value={item.productId}
                          onChange={val => handleItemChange(item.id, 'productId', val)}
                          placeholder="Search or Select Product..."
                          searchPlaceholder="Type name, brand, SKU to search..."
                          options={productOptions}
                          required
                        />
                      </div>

                      {/* Variant Selector */}
                      {hasVariants ? (
                        <div className="col-span-1 md:col-span-4 space-y-1">
                          <label className="block text-xs font-medium text-surface-600">Variant/Size *</label>
                          <SearchableSelect
                            value={item.variantId}
                            onChange={val => handleItemChange(item.id, 'variantId', val)}
                            placeholder={item.productId ? "Search or Select Variant..." : "Select product first"}
                            searchPlaceholder="Search variant, size..."
                            options={currentVariantOptions}
                            disabled={!item.productId}
                            required
                          />
                        </div>
                      ) : (
                        <div className="hidden md:block md:col-span-4" />
                      )}

                      {/* Quantity Input */}
                      <div className="col-span-1 md:col-span-4 space-y-1">
                        <Input
                          label={`Transfer Quantity * ${availableStock > 0 ? `(Max: ${availableStock})` : ''}`}
                          type="number"
                          min="1"
                          max={availableStock || undefined}
                          placeholder={availableStock > 0 ? `1 to ${availableStock}` : "Qty"}
                          value={item.quantity}
                          onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                          disabled={!item.productId || (hasVariants && !item.variantId)}
                          required
                        />
                        {isOverStock && (
                          <p className="text-xs text-danger-600 font-semibold mt-1">
                            ⚠️ Exceeds available stock in {transferData.sourceBranch} ({availableStock})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stock Levels Breakdown (Overall, Mabola, Jaffna) */}
                    {selectedProduct && (
                      <div className="mt-3.5 pt-3 border-t border-surface-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-surface-600 font-medium">
                          <Package className="w-4 h-4 text-primary-500" />
                          <span>
                            {stockDetails.isProductLevel ? (
                              <span className="italic">Total Product Stock (all variants combined):</span>
                            ) : (
                              <span>Current Stock for this item:</span>
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Mabola Stock */}
                          <div className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                            transferData.sourceBranch?.toLowerCase() === 'mabola'
                              ? 'bg-primary-50 border-primary-300 text-primary-900 font-semibold ring-1 ring-primary-400/20 shadow-xs'
                              : transferData.destinationBranch?.toLowerCase() === 'mabola'
                                ? 'bg-blue-50 border-blue-200 text-blue-900 font-medium'
                                : 'bg-white border-surface-200 text-surface-700'
                          }`}>
                            <span className="text-surface-500">Mabola:</span>
                            <span className={`font-bold ${stockDetails.mabola > 0 ? 'text-surface-900' : 'text-danger-600'}`}>
                              {stockDetails.mabola}
                            </span>
                            {transferData.sourceBranch?.toLowerCase() === 'mabola' && (
                              <span className="text-[10px] bg-primary-200 text-primary-800 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                                From
                              </span>
                            )}
                            {transferData.destinationBranch?.toLowerCase() === 'mabola' && (
                              <span className="text-[10px] bg-blue-200 text-blue-800 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                                To
                              </span>
                            )}
                          </div>

                          {/* Jaffna Stock */}
                          <div className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                            transferData.sourceBranch?.toLowerCase() === 'jaffna'
                              ? 'bg-primary-50 border-primary-300 text-primary-900 font-semibold ring-1 ring-primary-400/20 shadow-xs'
                              : transferData.destinationBranch?.toLowerCase() === 'jaffna'
                                ? 'bg-blue-50 border-blue-200 text-blue-900 font-medium'
                                : 'bg-white border-surface-200 text-surface-700'
                          }`}>
                            <span className="text-surface-500">Jaffna:</span>
                            <span className={`font-bold ${stockDetails.jaffna > 0 ? 'text-surface-900' : 'text-danger-600'}`}>
                              {stockDetails.jaffna}
                            </span>
                            {transferData.sourceBranch?.toLowerCase() === 'jaffna' && (
                              <span className="text-[10px] bg-primary-200 text-primary-800 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                                From
                              </span>
                            )}
                            {transferData.destinationBranch?.toLowerCase() === 'jaffna' && (
                              <span className="text-[10px] bg-blue-200 text-blue-800 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                                To
                              </span>
                            )}
                          </div>

                          {/* Overall Stock */}
                          <div className="px-2.5 py-1 rounded-lg border bg-surface-100 border-surface-200 text-surface-800 text-xs flex items-center gap-1.5 font-medium">
                            <span className="text-surface-500">Overall:</span>
                            <span className="font-bold text-primary-700">
                              {stockDetails.overall}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
            Confirm Transfer
          </Button>
        </div>
      </form>

      <Modal
        isOpen={isBomModalOpen}
        onClose={() => setIsBomModalOpen(false)}
        title="Load Items from BOM"
        description="Select a Bill of Materials and enter the target quantity to auto-populate the transfer list with required raw materials."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsBomModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFromBom}>Load Items</Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Select BOM *</label>
            <select
              className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={selectedBomId}
              onChange={e => setSelectedBomId(e.target.value)}
            >
              <option value="">Select a Bill of Materials...</option>
              {boms.map(bom => {
                const prod = products.find(p => p.id === bom.finishedProductId);
                const v = variants.find(v => v.id === bom.finishedVariantId);
                const prodName = prod ? prod.name : 'Unknown Product';
                const varName = v ? `${v.name} ${v.size ? `(${v.size})` : ''}` : '';
                return (
                  <option key={bom.id} value={bom.id}>
                    {prodName} {varName ? `- ${varName}` : ''} (v{bom.version})
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Target Quantity *</label>
            <Input
              type="number"
              min="1"
              placeholder="e.g. number of bulbs to produce"
              value={bomQuantity}
              onChange={e => setBomQuantity(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
