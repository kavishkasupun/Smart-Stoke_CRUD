import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Factory, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, Button, Input, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getProducts, getProductVariants } from '../../services/productService';
import { getActiveBomByFinishedProduct } from '../../services/bomService';
import { createDraftProductionOrder } from '../../services/productionService';
import { useToast } from '../../contexts/ToastContext';

export default function ProductionForm() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const branch = userProfile?.branchId; 
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  
  const [selectedBranch, setSelectedBranch] = useState(branch === 'all' ? 'mabola' : branch);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  
  const [activeBom, setActiveBom] = useState(null);
  const [bomMaterials, setBomMaterials] = useState([]); // With stock data
  const [maxPossible, setMaxPossible] = useState(null);
  const [hasShortage, setHasShortage] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const allProducts = await getProducts({ activeOnly: true });
      const finishedGoods = allProducts.filter(p => p.productType !== 'RAW_MATERIAL');
      setFinishedProducts(finishedGoods);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      const p = finishedProducts.find(prod => prod.id === selectedProduct);
      if (p && p.hasVariants !== false) {
        getProductVariants(selectedProduct).then(variants => {
          setAvailableVariants(variants);
          setSelectedVariant('');
        });
      } else {
        setAvailableVariants([]);
        setSelectedVariant('');
      }
    }
  }, [selectedProduct, finishedProducts]);

  useEffect(() => {
    if (selectedProduct) {
      const p = finishedProducts.find(prod => prod.id === selectedProduct);
      const hasVariants = p ? p.hasVariants !== false : true;
      
      if (hasVariants && selectedVariant) {
        loadBomAndStock(selectedProduct, selectedVariant);
      } else if (!hasVariants) {
        loadBomAndStock(selectedProduct, null);
      } else {
        setActiveBom(null);
        setBomMaterials([]);
      }
    } else {
      setActiveBom(null);
      setBomMaterials([]);
    }
  }, [selectedProduct, selectedVariant, selectedBranch, finishedProducts]);

  const loadBomAndStock = async (productId, variantId) => {
    try {
      const bom = await getActiveBomByFinishedProduct(productId, variantId);
      if (bom) {
        setActiveBom(bom);
        
        // Fetch raw material variant stock
        const allVariants = await getProductVariants();
        const allProducts = await getProducts();

        const enrichedMaterials = bom.materials.map(m => {
          if (m.variantId) {
             const v = allVariants.find(vari => vari.id === m.variantId);
             const p = allProducts.find(prod => prod.id === v?.productId);
             return {
               ...m,
               name: p?.name || 'Unknown',
               size: v?.size || '',
               sku: v?.sku || '',
               stock: v?.stock || { mabola: 0, jaffna: 0, overall: 0 }
             };
          } else {
             const p = allProducts.find(prod => prod.id === m.productId);
             return {
               ...m,
               name: p?.name || 'Unknown',
               size: '',
               sku: p?.sku || '',
               stock: p?.stock || { mabola: 0, jaffna: 0, overall: 0 }
             };
          }
        });

        setBomMaterials(enrichedMaterials);
      } else {
        setActiveBom(null);
        setBomMaterials([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load BOM requirements');
    }
  };

  // Recalculate max possible and shortages whenever quantity or materials change
  useEffect(() => {
    if (!activeBom || bomMaterials.length === 0) {
      setMaxPossible(null);
      setHasShortage(false);
      return;
    }

    let minPossible = Infinity;
    let shortageFound = false;

    for (const mat of bomMaterials) {
      const required = mat.quantity * quantity;
      const available = mat.stock[selectedBranch.toLowerCase()] || 0;
      
      if (available < required) {
        shortageFound = true;
      }
      
      const possibleForThisMat = Math.floor(available / mat.quantity);
      if (possibleForThisMat < minPossible) {
        minPossible = possibleForThisMat;
      }
    }

    setMaxPossible(minPossible === Infinity ? 0 : minPossible);
    setHasShortage(shortageFound);

  }, [quantity, bomMaterials, selectedBranch]);

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    const p = finishedProducts.find(prod => prod.id === selectedProduct);
    const hasVariants = p ? p.hasVariants !== false : true;

    if (hasVariants && !selectedVariant) return toast.error('Select a finished product variant');
    if (!selectedProduct) return toast.error('Select a finished product');
    if (quantity <= 0) return toast.error('Invalid quantity');
    if (!activeBom) return toast.error('No BOM found for this product');
    if (hasShortage) return toast.error('Cannot create order with raw material shortages');

    setSaving(true);
    try {
      const payload = {
        branch: selectedBranch,
        finishedProductId: selectedProduct,
        finishedVariantId: selectedVariant || null,
        bomId: activeBom.id,
        quantityProduced: quantity,
        notes,
        materials: bomMaterials.map(m => ({
          productId: m.productId,
          variantId: m.variantId || null,
          quantityPerUnit: m.quantity,
          totalRequired: m.quantity * quantity,
          availableAtCreation: m.stock[selectedBranch.toLowerCase()] || 0
        }))
      };

      const result = await createDraftProductionOrder(payload, userProfile.id);
      toast.success(`Production Order ${result.referenceId} saved as DRAFT.`);
      navigate(`/manufacturing/${result.id}`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save production order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/manufacturing')}
          className="p-2"
        />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">New Production Order</h1>
            <Badge variant="warning">Draft Mode</Badge>
          </div>
          <p className="text-sm text-surface-500 mt-1">Plan a manufacturing run and check material availability.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4 border-b border-surface-200 pb-2">Order Details</h3>
            
            <div className="space-y-4">
              {branch === 'all' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">Production Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="mabola">Mabola</option>
                    <option value="jaffna">Jaffna</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Finished Product Base</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Product...</option>
                  {finishedProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {finishedProducts.find(p => p.id === selectedProduct)?.hasVariants !== false && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">Specific Variant / Size</label>
                  <select
                    value={selectedVariant}
                    onChange={(e) => setSelectedVariant(e.target.value)}
                    disabled={!selectedProduct || saving}
                    className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <option value="">Select Variant...</option>
                    {availableVariants.map(v => (
                      <option key={v.id} value={v.id}>{v.name} {v.size ? `(${v.size})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Quantity to Produce</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  disabled={saving || !activeBom}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Notes (Optional)</label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="E.g., Rush order for customer..."
                />
              </div>

              <Button
                onClick={handleSaveDraft}
                isLoading={saving}
                icon={<Save className="w-4 h-4" />}
                disabled={(!selectedVariant && finishedProducts.find(p => p.id === selectedProduct)?.hasVariants !== false) || !activeBom || hasShortage || quantity <= 0}
                className="w-full"
              >
                Save Draft Order
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 min-h-[400px]">
            <h3 className="text-lg font-bold text-surface-900 mb-6 flex items-center gap-2 border-b border-surface-200 pb-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Material Requirements Preview
            </h3>
            
            {(!selectedVariant && finishedProducts.find(p => p.id === selectedProduct)?.hasVariants !== false) ? (
              <div className="flex flex-col items-center justify-center h-48 text-surface-400">
                <Factory className="w-12 h-12 mb-4 opacity-50 text-surface-300" />
                <p>Select a product to preview material requirements.</p>
              </div>
            ) : !activeBom ? (
              <div className="flex flex-col items-center justify-center h-48 bg-warning-50 rounded-xl border border-warning-200 p-6 text-center text-warning-800">
                <AlertCircle className="w-8 h-8 mb-2 opacity-80" />
                <p className="font-semibold text-lg">No Active BOM Found</p>
                <p className="text-sm mt-1">This product does not have an active Bill of Materials configured. Please create one in the Inventory module first.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-surface-50 border border-surface-200 p-4 rounded-lg flex flex-col justify-center">
                    <span className="text-sm text-surface-500 font-medium">Target Production</span>
                    <span className="text-2xl font-bold text-surface-900">{quantity} units</span>
                  </div>
                  
                  <div className={`p-4 rounded-lg flex flex-col justify-center border ${hasShortage ? 'bg-danger-50 border-danger-200' : 'bg-success-50 border-success-200'}`}>
                    <span className={`text-sm font-medium ${hasShortage ? 'text-danger-700' : 'text-success-700'}`}>
                      Max Possible Production (Based on Stock)
                    </span>
                    <span className={`text-2xl font-bold ${hasShortage ? 'text-danger-700' : 'text-success-700'}`}>
                      {maxPossible} units
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="py-2 text-xs font-semibold text-surface-500 uppercase">Material</th>
                        <th className="py-2 text-xs font-semibold text-surface-500 uppercase text-right">Per Unit</th>
                        <th className="py-2 text-xs font-semibold text-surface-500 uppercase text-right">Total Req.</th>
                        <th className="py-2 text-xs font-semibold text-surface-500 uppercase text-right">Available</th>
                        <th className="py-2 text-xs font-semibold text-surface-500 uppercase text-right">Shortage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomMaterials.map((mat, i) => {
                        const required = mat.quantity * quantity;
                        const available = mat.stock[selectedBranch.toLowerCase()] || 0;
                        const shortage = Math.max(0, required - available);
                        const hasEnough = available >= required;
                        
                        return (
                          <tr key={i} className={`border-b border-surface-100 ${!hasEnough ? 'bg-danger-50/30' : ''}`}>
                            <td className="py-3">
                              <div className="font-medium text-surface-900">{mat.name} {mat.size ? `(${mat.size})` : ''}</div>
                              <div className="text-xs text-surface-500">{mat.sku}</div>
                            </td>
                            <td className="py-3 text-sm text-surface-600 text-right">{mat.quantity} {mat.unit}</td>
                            <td className="py-3 text-sm font-bold text-surface-900 text-right">{required} {mat.unit}</td>
                            <td className="py-3 text-sm font-medium text-surface-700 text-right">{available}</td>
                            <td className="py-3 text-right">
                              {shortage > 0 ? (
                                <span className="inline-flex items-center gap-1 text-sm font-bold text-danger-600">
                                  <AlertCircle className="w-4 h-4" /> {shortage}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-sm font-bold text-success-600">
                                  <CheckCircle2 className="w-4 h-4" /> 0
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {hasShortage && (
                  <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-800 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>Cannot save production order due to material shortages. You must either reduce the production quantity or receive more stock for the highlighted materials.</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
