import React, { useState, useEffect } from 'react';
import { getProducts, getProductVariants } from '../../services/productService';
import { getBomByFinishedVariantId } from '../../services/bomService';
import { createProduction, getProductionsHistory } from '../../services/productionService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Loader2, Play, Package, FileText, CheckCircle2 } from 'lucide-react';

const Manufacturing = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const branch = currentUser?.branchId; // Either 'mabola', 'jaffna', or 'all' (if admin)
  
  const [loading, setLoading] = useState(true);
  const [producing, setProducing] = useState(false);
  
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(branch === 'all' ? 'mabola' : branch);
  const [quantity, setQuantity] = useState(1);
  
  const [currentBom, setCurrentBom] = useState(null);
  const [bomMaterials, setBomMaterials] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const allProducts = await getProducts({ activeOnly: true });
      const finishedGoods = allProducts.filter(p => p.productType !== 'RAW_MATERIAL');
      setFinishedProducts(finishedGoods);
      
      const hist = await getProductionsHistory();
      // Filter history for branch if not super admin
      if (branch !== 'all') {
        setHistory(hist.filter(h => h.branch === branch));
      } else {
        setHistory(hist);
      }
    } catch (error) {
      showToast('error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      getProductVariants(selectedProduct).then(variants => {
        setAvailableVariants(variants);
        setSelectedVariant('');
        setCurrentBom(null);
        setBomMaterials([]);
      });
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedVariant) {
      loadBom(selectedVariant);
    }
  }, [selectedVariant]);

  const loadBom = async (variantId) => {
    try {
      const bom = await getBomByFinishedVariantId(variantId);
      if (bom) {
        setCurrentBom(bom);
        // Also fetch names and stock for these materials
        const enrichedMaterials = await Promise.all(bom.materials.map(async (m) => {
          // This could be optimized, but ok for simple UI
          const allVariants = await getProductVariants(); 
          const matVariant = allVariants.find(v => v.id === m.variantId);
          return {
            ...m,
            name: matVariant?.name || 'Unknown Part',
            sku: matVariant?.sku || '',
            stock: matVariant?.stock || { mabola: 0, jaffna: 0, overall: 0 }
          };
        }));
        setBomMaterials(enrichedMaterials);
      } else {
        setCurrentBom(null);
        setBomMaterials([]);
      }
    } catch (error) {
      showToast('error', 'Failed to load BOM');
    }
  };

  const handleProduce = async () => {
    if (!selectedVariant || !quantity || quantity <= 0) return;
    if (!currentBom) return showToast('error', 'No recipe (BOM) found for this product.');
    
    // Check if sufficient stock
    for (let mat of bomMaterials) {
      const required = mat.quantity * quantity;
      const available = mat.stock[selectedBranch.toLowerCase()] || 0;
      if (available < required) {
        return showToast('error', `Insufficient stock for ${mat.name}. Need ${required}, have ${available}.`);
      }
    }

    setProducing(true);
    try {
      await createProduction({
        branch: selectedBranch,
        finishedVariantId: selectedVariant,
        quantityProduced: quantity,
        materials: currentBom.materials
      }, currentUser.uid);
      
      showToast('success', 'Production run completed successfully!');
      
      // Refresh
      fetchInitialData();
      if (selectedVariant) {
        loadBom(selectedVariant);
      }
      setQuantity(1);
    } catch (error) {
      showToast('error', error.message || 'Failed to complete production run.');
    } finally {
      setProducing(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Manufacturing</h1>
          <p className="text-sm text-surface-500 mt-1">Record production runs and assemble finished goods</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <Package className="w-5 h-5 mr-2 text-primary" />
              New Production
            </h3>

            <div className="space-y-4">
              {branch === 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="mabola">Mabola</option>
                    <option value="jaffna">Jaffna</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Finished Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select Product...</option>
                  {finishedProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specific Variant</label>
                <select
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                >
                  <option value="">Select Variant...</option>
                  {availableVariants.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Produce</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <button
                onClick={handleProduce}
                disabled={producing || !selectedVariant || !currentBom}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 mt-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
              >
                {producing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                <span className="font-medium">Execute Production</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[300px]">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary" />
              Bill of Materials Check
            </h3>

            {!selectedVariant ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Package className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a product to view its recipe.</p>
              </div>
            ) : !currentBom ? (
              <div className="flex flex-col items-center justify-center h-48 text-orange-400 bg-orange-50 rounded-xl border border-orange-100 p-6 text-center">
                <p className="font-medium">No Recipe Found</p>
                <p className="text-sm mt-2">This product does not have a Bill of Materials configured. Please configure it in the Inventory section first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex items-start">
                  <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
                  <p>Producing <strong>{quantity}</strong> units will require the following raw materials from the <strong>{selectedBranch}</strong> branch.</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Part</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Per Unit</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Needed</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Available</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bomMaterials.map((mat, i) => {
                        const required = mat.quantity * quantity;
                        const available = mat.stock[selectedBranch.toLowerCase()] || 0;
                        const hasEnough = available >= required;
                        
                        return (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="py-3 px-4 text-sm text-gray-800">
                              <div className="font-medium">{mat.name}</div>
                              <div className="text-xs text-gray-500">{mat.sku}</div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 text-right">{mat.quantity}</td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-800 text-right">{required}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 text-right">{available}</td>
                            <td className="py-3 px-4 text-sm text-center">
                              {hasEnough ? (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  Sufficient
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                  Shortage
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Recent Production Runs</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No production history found.</p>
              ) : (
                history.slice(0, 5).map(run => (
                  <div key={run.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-medium text-gray-800">{run.referenceId}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(run.createdAt?.seconds * 1000).toLocaleString()} • {run.branch.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        + {run.quantityProduced} Units
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Manufacturing;
