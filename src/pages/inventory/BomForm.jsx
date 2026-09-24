import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Loader2, Layers, Eye } from 'lucide-react';
import { Card, Button, Input, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getBomById, saveBomVersion, getActiveBomByFinishedProduct } from '../../services/bomService';
import { getProducts, getProductVariants } from '../../services/productService';
import { useToast } from '../../contexts/ToastContext';

export default function BomForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();

  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [materialsList, setMaterialsList] = useState([]);
  
  const [currentVersion, setCurrentVersion] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [allProducts, allVariants] = await Promise.all([
        getProducts(),
        getProductVariants()
      ]);
      
      const finishedGoods = allProducts.filter(p => p.productType !== 'RAW_MATERIAL');
      const rawGoods = allProducts.filter(p => p.productType === 'RAW_MATERIAL');
      
      setFinishedProducts(finishedGoods);
      
      // Build a flat list of raw material options for the dropdown
      const enrichedRawMaterials = [];
      rawGoods.forEach(product => {
        if (product.hasVariants === false) {
           enrichedRawMaterials.push({
              id: `prod_${product.id}`,
              productId: product.id,
              variantId: null,
              productName: product.name,
              name: product.name,
              size: ''
           });
        } else {
           const variants = allVariants.filter(v => v.productId === product.id);
           variants.forEach(v => {
              enrichedRawMaterials.push({
                 id: `var_${v.id}`,
                 productId: product.id,
                 variantId: v.id,
                 productName: product.name,
                 name: v.name,
                 size: v.size
              });
           });
        }
      });
      setRawMaterials(enrichedRawMaterials);

      if (isEditMode) {
        const bom = await getBomById(id);
        if (bom) {
          const v = allVariants.find(vari => vari.id === bom.finishedVariantId);
          if (v) {
            setSelectedProduct(v.productId);
            
            // Populate available variants for that product immediately
            const varsForProd = allVariants.filter(vari => vari.productId === v.productId);
            setAvailableVariants(varsForProd);
            
            setSelectedVariant(v.id);
          } else {
            // It could be a product without variants
            const p = allProducts.find(prod => prod.id === bom.finishedProductId);
            if (p) {
               setSelectedProduct(p.id);
               setAvailableVariants([]);
               setSelectedVariant('');
            }
          }
          
          const mappedMaterials = (bom.materials || []).map(m => {
            return {
              ...m,
              selectionId: m.variantId ? `var_${m.variantId}` : `prod_${m.productId}`
            };
          });
          setMaterialsList(mappedMaterials);
          setCurrentVersion(bom.version || 0);
        } else {
          toast.error('BOM not found');
          navigate('/boms');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // When a finished product is selected (in Create mode), find its variants
  useEffect(() => {
    if (selectedProduct && !isEditMode) {
      const p = finishedProducts.find(prod => prod.id === selectedProduct);
      if (p && p.hasVariants !== false) {
        getProductVariants(selectedProduct).then(variants => {
          setAvailableVariants(variants);
          setSelectedVariant('');
          setMaterialsList([]);
        });
      } else {
        setAvailableVariants([]);
        setSelectedVariant('');
        setMaterialsList([]);
        // Trigger the check for active BOM immediately for non-variant product
        getActiveBomByFinishedProduct(selectedProduct, null).then(existing => {
          if (existing) {
            toast.warning('An active BOM already exists for this product. You will create a new version.');
            setMaterialsList(existing.materials?.map(m => ({
              ...m,
              selectionId: m.variantId ? `var_${m.variantId}` : `prod_${m.productId}`
            })) || []);
            setCurrentVersion(existing.version || 0);
          } else {
            setMaterialsList([]);
            setCurrentVersion(0);
          }
        });
      }
    }
  }, [selectedProduct, isEditMode]);

  // When a variant is selected in create mode, check if there's already an active BOM
  useEffect(() => {
    if (selectedVariant && !isEditMode) {
      getActiveBomByFinishedProduct(selectedProduct, selectedVariant).then(existing => {
        if (existing) {
          toast.warning('An active BOM already exists for this variant. You will create a new version.');
          setMaterialsList(existing.materials || []);
          setCurrentVersion(existing.version || 0);
        } else {
          setMaterialsList([]);
          setCurrentVersion(0);
        }
      });
    }
  }, [selectedVariant, isEditMode]);

  const addMaterialRow = () => {
    setMaterialsList([...materialsList, { selectionId: '', quantity: 1, unit: 'pcs' }]);
  };

  const updateMaterial = (index, field, value) => {
    const updated = [...materialsList];
    updated[index][field] = value;
    setMaterialsList(updated);
  };

  const removeMaterial = (index) => {
    const updated = [...materialsList];
    updated.splice(index, 1);
    setMaterialsList(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const p = finishedProducts.find(prod => prod.id === selectedProduct);
    const hasVariants = p ? p.hasVariants !== false : true;
    
    if (hasVariants && !selectedVariant) return toast.error('Select a finished product variant first');
    if (!selectedProduct) return toast.error('Select a finished product first');
    if (materialsList.length === 0) return toast.error('Add at least one raw material component');
    
    // Validate rows
    for (let m of materialsList) {
      if (!m.selectionId || !m.quantity || m.quantity <= 0) {
        return toast.error('All components must have a selected item and valid positive quantity');
      }
    }

    setSaving(true);
    try {
      const payload = {
        finishedProductId: selectedProduct,
        finishedVariantId: selectedVariant || null,
        materials: materialsList.map(m => {
          const rawOption = rawMaterials.find(r => r.id === m.selectionId);
          return {
            productId: rawOption?.productId,
            variantId: rawOption?.variantId || null,
            quantity: Number(m.quantity),
            unit: m.unit || 'pcs'
          };
        })
      };

      const result = await saveBomVersion(payload, userProfile.id);
      toast.success(`BOM Version ${result.version} saved successfully!`);
      navigate(`/boms/${result.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save BOM');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  const getMaterialLabel = (selectionId) => {
    const rm = rawMaterials.find(r => r.id === selectionId);
    if (!rm) return 'Unknown Material';
    return `${rm.productName} ${rm.size ? `- ${rm.size}` : ''}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/boms')}
          className="p-2"
        />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">
              {isEditMode ? 'Edit Bill of Materials' : 'Create Bill of Materials'}
            </h1>
            {isEditMode && <Badge variant="warning">Drafting v{currentVersion + 1}</Badge>}
          </div>
          <p className="text-sm text-surface-500 mt-1">
            {isEditMode 
              ? 'Saving will create a new version and preserve the previous one.' 
              : 'Define the components required to manufacture this product.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4 border-b border-surface-200 pb-2">Target Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Finished Product Base</label>
                <div className="relative">
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    disabled={isEditMode || saving}
                    className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 appearance-none disabled:bg-surface-50 disabled:text-surface-500"
                  >
                    <option value="">Select Product...</option>
                    {finishedProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {finishedProducts.find(p => p.id === selectedProduct)?.hasVariants !== false && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">Specific Variant / Size</label>
                  <div className="relative">
                    <select
                      value={selectedVariant}
                      onChange={(e) => setSelectedVariant(e.target.value)}
                      disabled={!selectedProduct || isEditMode || saving}
                      className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 appearance-none disabled:bg-surface-50 disabled:text-surface-500"
                    >
                      <option value="">Select Variant...</option>
                      {availableVariants.map(v => (
                        <option key={v.id} value={v.id}>{v.name} {v.size ? `(${v.size})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {(selectedVariant || (selectedProduct && finishedProducts.find(p => p.id === selectedProduct)?.hasVariants === false)) && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4 border-b border-surface-200 pb-2">
                <h3 className="text-lg font-bold text-surface-900">Components (Recipe)</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  icon={<Plus className="w-4 h-4" />} 
                  onClick={addMaterialRow}
                  disabled={saving}
                >
                  Add Component
                </Button>
              </div>

              {materialsList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-surface-300 rounded-lg bg-surface-50">
                  <Layers className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                  <p className="text-surface-500">No components added. Click "Add Component" to build the recipe.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materialsList.map((mat, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-surface-50 p-3 rounded-lg border border-surface-200">
                      <div className="flex-1 w-full relative">
                        <select
                          value={mat.selectionId}
                          onChange={(e) => updateMaterial(idx, 'selectionId', e.target.value)}
                          disabled={saving}
                          className="w-full px-3 py-2 bg-white border border-surface-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-primary-500 disabled:bg-surface-50"
                        >
                          <option value="">Select Raw Material...</option>
                          {rawMaterials.map(rm => (
                            <option key={rm.id} value={rm.id}>{rm.productName} {rm.name && rm.name !== rm.productName ? `- ${rm.name}` : ''} {rm.size ? `(${rm.size})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={mat.quantity}
                          onChange={(e) => updateMaterial(idx, 'quantity', e.target.value)}
                          placeholder="Qty"
                          disabled={saving}
                          className="w-24 text-center"
                        />
                        
                        <select
                          value={mat.unit}
                          onChange={(e) => updateMaterial(idx, 'unit', e.target.value)}
                          disabled={saving}
                          className="w-20 px-2 py-2 bg-white border border-surface-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-primary-500 disabled:bg-surface-50"
                        >
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="m">m</option>
                          <option value="cm">cm</option>
                          <option value="l">l</option>
                          <option value="ml">ml</option>
                        </select>
                        
                        <Button
                          variant="ghost"
                          className="text-danger-500 hover:text-danger-700 hover:bg-danger-50 p-2"
                          onClick={() => removeMaterial(idx)}
                          disabled={saving}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-surface-200 flex justify-end">
                <Button
                  onClick={handleSave}
                  isLoading={saving}
                  icon={<Save className="w-4 h-4" />}
                  disabled={(!selectedVariant && finishedProducts.find(p => p.id === selectedProduct)?.hasVariants !== false) || materialsList.length === 0}
                >
                  Save BOM Version {currentVersion + 1}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-1">
          {(selectedVariant || finishedProducts.find(p => p.id === selectedProduct)?.hasVariants === false) && (
            <Card className="p-6 sticky top-6">
              <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2 border-b border-surface-200 pb-2">
                <Eye className="w-5 h-5 text-primary-600" />
                Recipe Preview
              </h3>
              
              <div className="bg-primary-50 p-4 rounded-lg mb-6 border border-primary-100">
                <p className="text-sm text-primary-900 font-medium leading-relaxed">
                  To manufacture <strong className="font-bold">1 unit</strong> of <br/>
                  <span className="text-lg text-primary-700">
                    {finishedProducts.find(p => p.id === selectedProduct)?.hasVariants !== false 
                      ? `${availableVariants.find(v => v.id === selectedVariant)?.name} ${availableVariants.find(v => v.id === selectedVariant)?.size ? `(${availableVariants.find(v => v.id === selectedVariant)?.size})` : ''}`
                      : finishedProducts.find(p => p.id === selectedProduct)?.name
                    }
                  </span>
                  <br/>you require:
                </p>
              </div>

              {materialsList.length === 0 ? (
                <p className="text-sm text-surface-500 italic">No components added yet.</p>
              ) : (
                <ul className="space-y-3">
                  {materialsList.map((m, idx) => m.selectionId && (
                    <li key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-surface-700">{getMaterialLabel(m.selectionId)}</span>
                      <span className="font-mono font-medium text-surface-900">
                        {m.quantity} {m.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
