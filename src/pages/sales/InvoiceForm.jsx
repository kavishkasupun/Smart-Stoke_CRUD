import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Calculator } from 'lucide-react';
import { Card, Button, Input, Spinner } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { BRANCH_LIST } from '../../config/constants';
import { getCustomers } from '../../services/customerService';
import { getProducts, getProductVariants } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { createInvoice } from '../../services/invoiceService';

/**
 * Check if a product belongs to the Bulb category or has bulb in its name
 */
export const isBulbProduct = (product) => {
  if (!product) return false;
  const name = (product.name || '').toLowerCase();
  const category = (product.categoryName || '').toLowerCase();
  return name.includes('bulb') || category.includes('bulb');
};

/**
 * General gross amount tier discount for bulbs:
 * 50,000-100,000: 4.50%
 * 101,000-150,000: 5.00%
 * 151,000-500,000: 5.50%
 * 501,000+ (500,000 ABOVE): 6.00%
 */
export const getBulbTierDiscount = (grossAmount) => {
  const amount = parseFloat(grossAmount) || 0;
  if (amount > 500000) return 6.00;
  if (amount > 150000) return 5.50;
  if (amount > 100000) return 5.00;
  if (amount >= 50000) return 4.50;
  return 0;
};

/**
 * Identify specific W/P product model group
 */
export const getWPModelGroup = (product, variant) => {
  if (!product) return null;
  const targetStr = `${product.name || ''} ${variant?.size || ''} ${variant?.name || ''} ${product.sku || ''}`.toUpperCase();
  const cleanStr = targetStr.replace(/[\/\.\s\-_]/g, '');

  const hasWPMarker = /(W\/P|WP|W\.P)/i.test(targetStr) || cleanStr.includes('WP');
  if (!hasWPMarker) return null;

  // Group 1: 5W
  if (
    /(^|[^0-9])5W([^0-9]|$)/i.test(targetStr) ||
    cleanStr.includes('5WP') ||
    cleanStr.includes('WP5W') ||
    cleanStr.includes('WP5')
  ) {
    return 'GROUP_5W';
  }

  // Group 2: 9W, 13W, 18W
  if (
    /(^|[^0-9])9W([^0-9]|$)/i.test(targetStr) ||
    cleanStr.includes('9WP') ||
    cleanStr.includes('WP9W') ||
    cleanStr.includes('WP9')
  ) {
    return 'GROUP_9W';
  }
  if (
    /(^|[^0-9])13W([^0-9]|$)/i.test(targetStr) ||
    cleanStr.includes('13WP') ||
    cleanStr.includes('WP13W') ||
    cleanStr.includes('WP13')
  ) {
    return 'GROUP_13W';
  }
  if (
    /(^|[^0-9])18W([^0-9]|$)/i.test(targetStr) ||
    cleanStr.includes('18WP') ||
    cleanStr.includes('WP18W') ||
    cleanStr.includes('WP18')
  ) {
    return 'GROUP_18W';
  }

  // Group 3: 28W, 38W, 48W
  if (
    /(^|[^0-9])28W([^0-9]|$)/i.test(targetStr) ||
    cleanStr.includes('28WP') ||
    cleanStr.includes('WP28W') ||
    cleanStr.includes('WP28')
  ) {
    return 'GROUP_28W';
  }
  if (
    /(^|[^0-9])38W([^0-9]|$)/i.test(targetStr) ||
    cleanStr.includes('38WP') ||
    cleanStr.includes('WP38W') ||
    cleanStr.includes('WP38')
  ) {
    return 'GROUP_38W';
  }
  if (
    /(^|[^0-9])48W([^0-9]|$)/i.test(targetStr) ||
    cleanStr.includes('48WP') ||
    cleanStr.includes('WP48W') ||
    cleanStr.includes('WP48')
  ) {
    return 'GROUP_48W';
  }

  return null;
};

/**
 * Specific W/P Product Tier Discounts
 */
export const getWPProductDiscount = (product, variant, quantity) => {
  const model = getWPModelGroup(product, variant);
  if (!model) return 0;

  const qty = parseFloat(quantity) || 0;

  // Group 1: W/P 5W (99-499 = 1.00%, 500-5000 = 2.00%)
  if (model === 'GROUP_5W') {
    if (qty >= 500) return 2.00;
    if (qty >= 99) return 1.00;
    return 0;
  }

  // Group 2: W/P 9W, W/P 13W, W/P 18W (99-299 = 2.00%, 300-599 = 2.50%, 600-1999 = 3.00%, 2000-5000 = 3.50%)
  if (model === 'GROUP_9W' || model === 'GROUP_13W' || model === 'GROUP_18W') {
    if (qty >= 2000) return 3.50;
    if (qty >= 600) return 3.00;
    if (qty >= 300) return 2.50;
    if (qty >= 99) return 2.00;
    return 0;
  }

  // Group 3: W/P 28W, W/P 38W, W/P 48W (49-99 = 2.00%, 100-499 = 2.50%, 500-999 = 3.00%, 1000-5000 = 3.50%)
  if (model === 'GROUP_28W' || model === 'GROUP_38W' || model === 'GROUP_48W') {
    if (qty >= 1000) return 3.50;
    if (qty >= 500) return 3.00;
    if (qty >= 100) return 2.50;
    if (qty >= 49) return 2.00;
    return 0;
  }

  return 0;
};

/**
 * Get descriptive label for the W/P group
 */
export const getWPGroupDescription = (product, variant) => {
  const model = getWPModelGroup(product, variant);
  if (!model) return null;

  if (model === 'GROUP_5W') {
    return 'W/P 5W extra: 99-499 (+1%), 500-5000 (+2%)';
  }

  if (model === 'GROUP_9W' || model === 'GROUP_13W' || model === 'GROUP_18W') {
    return 'W/P (9W/13W/18W) extra: 99-299 (+2%), 300-599 (+2.5%), 600-1999 (+3%), 2000+ (+3.5%)';
  }

  if (model === 'GROUP_28W' || model === 'GROUP_38W' || model === 'GROUP_48W') {
    return 'W/P (28W/38W/48W) extra: 49-99 (+2%), 100-499 (+2.5%), 500-999 (+3%), 1000+ (+3.5%)';
  }

  return null;
};

/**
 * Calculate combined auto discount: General Bulb Tier (by Gross Amount) + W/P Product Tier (by Quantity)
 */
export const calculateAutoDiscount = (product, variant, quantity, unitPrice = null) => {
  const qty = parseFloat(quantity) || 0;
  const price = (unitPrice !== null && unitPrice !== undefined && unitPrice !== '') 
    ? parseFloat(unitPrice) || 0 
    : (variant?.sellingPrice || product?.sellingPrice || 0);
  const grossAmount = qty * price;
  const generalDisc = isBulbProduct(product) ? getBulbTierDiscount(grossAmount) : 0;
  const wpDisc = getWPProductDiscount(product, variant, qty);
  const total = generalDisc + wpDisc;
  return {
    generalDisc,
    wpDisc,
    total: parseFloat(total.toFixed(2))
  };
};

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Master Data
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Form State
  const [mode, setMode] = useState('PRICE_INCLUDED'); // 'PRICE_INCLUDED' or 'QUANTITY_ONLY'
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [notes, setNotes] = useState('');

  // Line Items
  const [items, setItems] = useState([
    { id: Date.now().toString(), productId: '', variantId: '', quantity: 1, unitPrice: 0, discountType: 'PERCENTAGE', discountValue: 0 }
  ]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    // Auto-select branch if user is restricted to a specific branch
    const uBranch = userProfile?.branchId || userProfile?.branch;
    if (uBranch && uBranch !== 'all' && uBranch !== 'GLOBAL') {
      setSelectedBranch(uBranch);
    }
  }, [userProfile]);

  const fetchMasterData = async () => {
    try {
      const [customersData, productsData, variantsData, categoriesData] = await Promise.all([
        getCustomers({ activeOnly: true }),
        getProducts(),
        getProductVariants(),
        getCategories()
      ]);
      
      const categoryMap = (categoriesData || []).reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});

      const mappedProducts = productsData
        .filter(p => p.active !== false && p.productType === 'FINISHED_PRODUCT')
        .map(p => ({
          ...p,
          categoryName: categoryMap[p.categoryId] || '',
          variants: variantsData.filter(v => v.productId === p.id && v.active !== false)
        }));

      setBranches(BRANCH_LIST);
      setCustomers(customersData);
      setProducts(mappedProducts);
    } catch (error) {
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: Date.now().toString(), productId: '', variantId: '', quantity: 1, unitPrice: 0, discountType: 'PERCENTAGE', discountValue: 0 }
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        if (field === 'productId') {
          updated.variantId = ''; 
          updated.unitPrice = 0;
          const product = products.find(p => p.id === value);
          if (product && product.hasVariants === false) {
             updated.unitPrice = product.sellingPrice || 0;
          }
          if (product) {
            const { total } = calculateAutoDiscount(product, null, updated.quantity, updated.unitPrice);
            if (total > 0) {
              updated.discountType = 'PERCENTAGE';
              updated.discountValue = total;
            } else {
              updated.discountValue = 0;
            }
          } else {
            updated.discountValue = 0;
          }
        }
        
        if (field === 'variantId' && value) {
          const product = products.find(p => p.id === updated.productId);
          const variant = product?.variants?.find(v => v.id === value);
          if (variant && variant.sellingPrice) {
            updated.unitPrice = variant.sellingPrice;
          }
          if (product) {
            const { total } = calculateAutoDiscount(product, variant, updated.quantity, updated.unitPrice);
            if (total > 0) {
              updated.discountType = 'PERCENTAGE';
              updated.discountValue = total;
            } else {
              updated.discountValue = 0;
            }
          }
        }

        if (field === 'quantity') {
          const product = products.find(p => p.id === updated.productId);
          const variant = product?.variants?.find(v => v.id === updated.variantId);
          if (product) {
            const { total } = calculateAutoDiscount(product, variant, value, updated.unitPrice);
            if (total > 0) {
              updated.discountType = 'PERCENTAGE';
              updated.discountValue = total;
            } else {
              updated.discountValue = 0;
            }
          }
        }

        if (field === 'unitPrice') {
          const product = products.find(p => p.id === updated.productId);
          const variant = product?.variants?.find(v => v.id === updated.variantId);
          if (product) {
            const { total } = calculateAutoDiscount(product, variant, updated.quantity, value);
            if (total > 0) {
              updated.discountType = 'PERCENTAGE';
              updated.discountValue = total;
            } else {
              updated.discountValue = 0;
            }
          }
        }

        return updated;
      }
      return item;
    }));
  };

  // Calculations
  const getAvailableStock = (productId, variantId) => {
    if (!selectedBranch || !productId) return null;
    const product = products.find(p => p.id === productId);
    if (!product) return null;
    if (product.hasVariants === false) {
      return product.stock?.[selectedBranch] || 0;
    }
    if (variantId) {
      const variant = product.variants?.find(v => v.id === variantId);
      return variant?.stock?.[selectedBranch] || 0;
    }
    return null;
  };

  const calculateTotals = () => {
    let subTotal = 0;
    let totalDiscount = 0;

    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const discountVal = parseFloat(item.discountValue) || 0;

      const lineSub = qty * price;
      
      const unitDisc = item.discountType === 'PERCENTAGE' ? price * (discountVal / 100) : discountVal;
      const lineDisc = qty * unitDisc;

      subTotal += lineSub;
      totalDiscount += lineDisc;
    });

    return {
      subTotal,
      totalDiscount,
      grandTotal: subTotal - totalDiscount
    };
  };

  const totals = mode === 'PRICE_INCLUDED' ? calculateTotals() : { subTotal: 0, totalDiscount: 0, grandTotal: 0 };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBranch) return toast.error('Please select a branch.');
    if (!isWalkIn && !selectedCustomerId) return toast.error('Please select a customer.');
    if (isWalkIn && !walkInName.trim()) return toast.error('Please enter walk-in customer name.');

    // Validate Items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const product = products.find(p => p.id === item.productId);
      const hasVariants = product ? product.hasVariants !== false : true;

      if (!item.productId || (hasVariants && !item.variantId)) return toast.error(`Item #${i + 1} is missing product/variant selection.`);
      if (item.quantity <= 0) return toast.error(`Item #${i + 1} must have quantity > 0.`);
      
      const availableStock = getAvailableStock(item.productId, item.variantId);
      if (availableStock !== null && parseFloat(item.quantity) > availableStock) {
        return toast.error(`Item #${i + 1} quantity (${item.quantity}) exceeds available stock (${availableStock}).`);
      }
    }

    const isConfirmed = await confirm({
      title: 'Confirm Invoice',
      message: `Are you sure you want to generate this ${mode === 'PRICE_INCLUDED' ? 'Bill' : 'Dispatch Note'}? Stock will be deducted permanently.`,
      confirmText: 'Confirm & Deduct Stock'
    });

    if (!isConfirmed) return;

    try {
      setSubmitting(true);
      toast.showLoading('Creating Invoice...');
      
      // Clean up item payload
      const payloadItems = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const variant = product?.variants?.find(v => v.id === item.variantId);
        
        const qty = parseFloat(item.quantity) || 0;
        const price = mode === 'PRICE_INCLUDED' ? parseFloat(item.unitPrice) : 0;
        const discountVal = mode === 'PRICE_INCLUDED' ? parseFloat(item.discountValue) : 0;
        
        let lineDisc = 0;
        if (mode === 'PRICE_INCLUDED') {
          const unitDisc = item.discountType === 'PERCENTAGE' ? price * (discountVal / 100) : discountVal;
          lineDisc = qty * unitDisc;
        }

        return {
          productId: item.productId,
          productName: product?.name,
          variantId: item.variantId || null,
          variantName: variant ? (variant.name || variant.size) : null,
          quantity: qty,
          unitPrice: price,
          discountType: mode === 'PRICE_INCLUDED' ? item.discountType : 'NONE',
          discountValue: discountVal,
          discount: lineDisc,
        };
      });

      const customerName = isWalkIn 
        ? walkInName 
        : customers.find(c => c.id === selectedCustomerId)?.name || 'Unknown';

      const invoiceId = await createInvoice({
        mode,
        branch: selectedBranch,
        customerId: isWalkIn ? null : selectedCustomerId,
        customerName,
        items: payloadItems,
        notes,
        ...totals
      }, userProfile);

      toast.success('Invoice created successfully!');
      navigate(`/bills/${invoiceId}`);
    } catch (error) {
      toast.error(error.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
      toast.hideLoading();
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={<ArrowLeft className="w-5 h-5" />} onClick={() => navigate('/bills')} className="p-2"/>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">New Bill / Invoice</h1>
          <p className="text-sm text-surface-500 mt-1">Generate a sales invoice or dispatch note</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Configuration */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-surface-900 mb-4 border-b border-surface-100 pb-2">Document Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Billing Mode *</label>
              <select
                className="w-full px-4 py-2 bg-surface-50 border border-surface-300 rounded-lg text-sm font-semibold text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="PRICE_INCLUDED">Standard Bill (Price & Discounts)</option>
                <option value="QUANTITY_ONLY">Dispatch Note (Quantity Only)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Branch *</label>
              <select
                required
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-surface-100 disabled:text-surface-500"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={(() => {
                  const uBranch = userProfile?.branchId || userProfile?.branch;
                  return !!uBranch && uBranch !== 'all' && uBranch !== 'GLOBAL';
                })()}
              >
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-surface-700">Customer *</label>
                <button 
                  type="button" 
                  onClick={() => setIsWalkIn(!isWalkIn)}
                  className="text-xs text-primary-600 font-semibold"
                >
                  {isWalkIn ? 'Select Existing' : 'Use Walk-in'}
                </button>
              </div>
              {isWalkIn ? (
                <Input
                  placeholder="Enter walk-in customer name"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  required
                />
              ) : (
                <select
                  required
                  className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Select a registered customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4 border-b border-surface-100 pb-2">
            <h2 className="text-lg font-bold text-surface-900">Line Items</h2>
            <Button type="button" size="sm" variant="outline" onClick={handleAddItem} icon={<Plus className="w-4 h-4" />}>
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              const variants = product?.variants || [];
              const variant = variants.find(v => v.id === item.variantId);
              const availableStock = getAvailableStock(item.productId, item.variantId);
              const isBulb = isBulbProduct(product);
              const { generalDisc, wpDisc, total: autoTierTotal } = calculateAutoDiscount(product, variant, item.quantity, item.unitPrice);
              const wpDesc = getWPGroupDescription(product, variant);
              
              return (
                <div key={item.id} className="p-4 bg-surface-50 border border-surface-200 rounded-xl relative">
                  {items.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-surface-200 text-danger-500 rounded-full flex items-center justify-center hover:bg-danger-50 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-[3] min-w-[200px] space-y-1">
                      <label className="block text-xs font-medium text-surface-500">Product *</label>
                      <select
                        required
                        className="w-full px-3 py-2 bg-white border border-surface-300 rounded-md text-sm"
                        value={item.productId}
                        onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                      >
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {product?.hasVariants !== false ? (
                      <div className="flex-[2] min-w-[150px] space-y-1">
                        <label className="block text-xs font-medium text-surface-500">Variant/Size *</label>
                        <select
                          required
                          className="w-full px-3 py-2 bg-white border border-surface-300 rounded-md text-sm"
                          value={item.variantId}
                          onChange={(e) => handleItemChange(item.id, 'variantId', e.target.value)}
                          disabled={!item.productId}
                        >
                          <option value="">Select variant</option>
                          {variants.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.size || v.name} {selectedBranch ? `(Stock: ${v.stock?.[selectedBranch] || 0})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex-[2] min-w-[150px] space-y-1 flex flex-col justify-end pb-2 text-sm text-surface-500 font-medium">
                         {selectedBranch ? `(Stock: ${product.stock?.[selectedBranch] || 0})` : ''}
                      </div>
                    )}

                    <div className="w-24 space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-medium text-surface-500">Qty *</label>
                        {!selectedBranch ? (
                          <span className="text-[10px] text-warning-600 font-bold">Select Branch for Max Stock</span>
                        ) : availableStock !== null ? (
                          <span className="text-[10px] text-surface-400 font-bold" title="Available Stock">Max: {availableStock}</span>
                        ) : null}
                      </div>
                      <Input
                        type="number"
                        min="1"
                        max={availableStock !== null ? availableStock : undefined}
                        required
                        value={item.quantity}
                        onChange={(e) => {
                           const maxVal = availableStock !== null ? availableStock : Infinity;
                           let val = e.target.value;
                           if (Number(val) > maxVal) val = maxVal;
                           handleItemChange(item.id, 'quantity', val);
                        }}
                      />
                    </div>

                    {mode === 'PRICE_INCLUDED' && (() => {
                      const qty = parseFloat(item.quantity) || 0;
                      const price = parseFloat(item.unitPrice) || 0;
                      const disc = parseFloat(item.discountValue) || 0;
                      const unitDisc = item.discountType === 'PERCENTAGE' ? price * (disc / 100) : disc;
                      const finalUnitPrice = Math.max(0, price - unitDisc);
                      const beforeDiscTotal = qty * price;
                      const afterDiscTotal = qty * finalUnitPrice;

                      return (
                        <>
                          <div className="flex-[2] min-w-[120px] space-y-1">
                            <label className="block text-xs font-medium text-surface-500">Unit Price</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                            />
                          </div>

                          <div className="flex-[3] min-w-[200px] space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="block text-xs font-medium text-surface-500">Discount</label>
                              {autoTierTotal > 0 && item.discountType === 'PERCENTAGE' && Number(item.discountValue) === autoTierTotal && (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {generalDisc > 0 && wpDisc > 0 
                                    ? `Tier ${autoTierTotal}% (${generalDisc}% + W/P ${wpDisc}%)` 
                                    : wpDisc > 0 
                                      ? `W/P Tier ${wpDisc}%` 
                                      : `Bulb Tier ${generalDisc}%`}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <div className="w-16">
                                <select
                                  className="w-full px-2 py-2 bg-white border border-surface-300 rounded-md text-sm"
                                  value={item.discountType}
                                  onChange={(e) => handleItemChange(item.id, 'discountType', e.target.value)}
                                >
                                  <option value="PERCENTAGE">%</option>
                                  <option value="FIXED">Rs</option>
                                </select>
                              </div>
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.discountValue}
                                  onChange={(e) => handleItemChange(item.id, 'discountValue', e.target.value)}
                                />
                              </div>
                            </div>
                            {isBulb && (
                              <p className="text-[10px] text-primary-600 font-medium">
                                Bulb tiers: 50,000-100,000 (4.5%) | 101,000-150,000 (5%) | 151,000-500,000 (5.5%) | 501,000+ (6%)
                              </p>
                            )}
                            {wpDesc && (
                              <p className="text-[10px] text-emerald-700 font-semibold">
                                {wpDesc}
                              </p>
                            )}
                          </div>

                          <div className="flex-[4] min-w-[300px] flex gap-3 text-right">
                            <div className="flex-1 space-y-1">
                              <label className="block text-xs font-medium text-surface-500">Final Price</label>
                              <div className="h-10 flex items-center justify-end font-semibold text-surface-700 bg-surface-100 border border-surface-200 px-2 rounded-md text-sm">
                                Rs. {finalUnitPrice.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="block text-xs font-medium text-surface-500">Gross Total</label>
                              <div className="h-10 flex items-center justify-end font-semibold text-surface-700 bg-surface-100 border border-surface-200 px-2 rounded-md text-sm line-through">
                                {beforeDiscTotal.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="block text-xs font-medium text-surface-900 font-bold">Net Total</label>
                              <div className="h-10 flex items-center justify-end font-bold text-primary-700 bg-primary-50 border border-primary-200 px-2 rounded-md text-sm">
                                Rs. {afterDiscTotal.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Footer Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card className="p-6 h-full">
            <h2 className="text-lg font-bold text-surface-900 mb-4 border-b border-surface-100 pb-2">Additional Notes</h2>
            <textarea
              rows="4"
              className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Internal notes or customer remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Card>

          {mode === 'PRICE_INCLUDED' && (
            <Card className="p-6 bg-surface-50 border-2 border-primary-100 h-full">
              <h2 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary-600" /> Order Summary
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-surface-600">
                  <span>Subtotal</span>
                  <span className="font-medium">Rs. {totals.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-danger-600">
                  <span>Total Discount</span>
                  <span className="font-medium">- Rs. {totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="pt-3 mt-3 border-t-2 border-surface-200 flex justify-between items-center">
                  <span className="text-xl font-bold text-surface-900">Grand Total</span>
                  <span className="text-2xl font-black text-primary-600">Rs. {totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-4 sticky bottom-6 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-surface-200 shadow-xl">
          <Button type="button" variant="outline" onClick={() => navigate('/bills')} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting} icon={<Save className="w-4 h-4" />}>
            Generate {mode === 'PRICE_INCLUDED' ? 'Invoice' : 'Dispatch Note'}
          </Button>
        </div>
      </form>
    </div>
  );
}
