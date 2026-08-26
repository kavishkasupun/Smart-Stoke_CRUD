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
import { createInvoice } from '../../services/invoiceService';

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
    { id: Date.now().toString(), productId: '', variantId: '', quantity: 1, unitPrice: 0, discountType: 'FIXED', discountValue: 0 }
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
      const [customersData, productsData, variantsData] = await Promise.all([
        getCustomers({ activeOnly: true }),
        getProducts(),
        getProductVariants()
      ]);
      
      const mappedProducts = productsData
        .filter(p => p.active !== false)
        .map(p => ({
          ...p,
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
      { id: Date.now().toString(), productId: '', variantId: '', quantity: 1, unitPrice: 0, discountType: 'FIXED', discountValue: 0 }
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
        // Auto-select first variant if product changes
        if (field === 'productId') {
          updated.variantId = ''; 
          updated.unitPrice = 0;
        }
        // Auto-populate price if variant selected
        if (field === 'variantId') {
          const product = products.find(p => p.id === updated.productId);
          const variant = product?.variants?.find(v => v.id === value);
          if (variant && variant.price) {
            updated.unitPrice = variant.price;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  // Calculations
  const calculateTotals = () => {
    let subTotal = 0;
    let totalDiscount = 0;

    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const discountVal = parseFloat(item.discountValue) || 0;

      const lineSub = qty * price;
      let lineDisc = 0;

      if (item.discountType === 'PERCENTAGE') {
        lineDisc = lineSub * (discountVal / 100);
      } else {
        lineDisc = discountVal; // Fixed discount is per line total, not per unit
      }

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
      if (!item.productId || !item.variantId) return toast.error(`Item #${i + 1} is missing product selection.`);
      if (item.quantity <= 0) return toast.error(`Item #${i + 1} must have quantity > 0.`);
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
        
        return {
          productId: item.productId,
          productName: product?.name,
          variantId: item.variantId,
          variantName: variant?.name || variant?.size,
          quantity: parseFloat(item.quantity),
          unitPrice: mode === 'PRICE_INCLUDED' ? parseFloat(item.unitPrice) : 0,
          discountType: mode === 'PRICE_INCLUDED' ? item.discountType : 'NONE',
          discountValue: mode === 'PRICE_INCLUDED' ? parseFloat(item.discountValue) : 0,
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3 space-y-1">
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

                    <div className="md:col-span-2 space-y-1">
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

                    <div className="md:col-span-1 space-y-1">
                      <label className="block text-xs font-medium text-surface-500">Qty *</label>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                      />
                    </div>

                    {mode === 'PRICE_INCLUDED' && (
                      <>
                        <div className="md:col-span-2 space-y-1">
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

                        <div className="md:col-span-2 flex gap-2">
                          <div className="space-y-1 w-1/3">
                            <label className="block text-xs font-medium text-surface-500">Type</label>
                            <select
                              className="w-full px-2 py-2 bg-white border border-surface-300 rounded-md text-sm"
                              value={item.discountType}
                              onChange={(e) => handleItemChange(item.id, 'discountType', e.target.value)}
                            >
                              <option value="FIXED">Rs</option>
                              <option value="PERCENTAGE">%</option>
                            </select>
                          </div>
                          <div className="space-y-1 w-2/3">
                            <label className="block text-xs font-medium text-surface-500">Discount</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discountValue}
                              onChange={(e) => handleItemChange(item.id, 'discountValue', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 space-y-1 text-right">
                          <label className="block text-xs font-medium text-surface-500">Line Total</label>
                          <div className="h-10 flex items-center justify-end font-bold text-surface-900 bg-white border border-surface-200 px-3 rounded-md">
                            Rs. {((item.quantity * item.unitPrice) - (item.discountType === 'PERCENTAGE' ? (item.quantity * item.unitPrice * (item.discountValue / 100)) : item.discountValue)).toFixed(2)}
                          </div>
                        </div>
                      </>
                    )}
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
