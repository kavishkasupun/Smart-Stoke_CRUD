import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Factory, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getProductionOrderById, confirmProductionOrder } from '../../services/productionService';
import { getProducts, getProductVariants } from '../../services/productService';
import { useToast } from '../../contexts/ToastContext';

export default function ProductionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [order, setOrder] = useState(null);
  
  const [finishedProduct, setFinishedProduct] = useState(null);
  const [finishedVariant, setFinishedVariant] = useState(null);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const productionOrder = await getProductionOrderById(id);
      
      if (!productionOrder) {
        toast.error('Production order not found');
        navigate('/manufacturing');
        return;
      }
      
      setOrder(productionOrder);

      const [allProducts, allVariants] = await Promise.all([
        getProducts(),
        getProductVariants()
      ]);

      const product = allProducts.find(p => p.id === productionOrder.finishedProductId);
      const variant = allVariants.find(v => v.id === productionOrder.finishedVariantId);
      
      setFinishedProduct(product);
      setFinishedVariant(variant);

      // Map raw material names
      const enrichedMaterials = (productionOrder.materialsRequired || []).map(m => {
        const mv = allVariants.find(v => v.id === m.variantId);
        const mp = allProducts.find(p => p.id === mv?.productId);
        return {
          ...m,
          name: mp?.name || 'Unknown',
          size: mv?.size || '',
          sku: mv?.sku || ''
        };
      });
      
      setMaterials(enrichedMaterials);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm("Are you sure you want to confirm this production run? This will permanently deduct raw materials and add finished stock.")) {
      return;
    }
    
    setConfirming(true);
    try {
      await confirmProductionOrder(id, userProfile.id);
      toast.success('Production confirmed successfully! Stock has been updated.');
      fetchData(); // Reload details to show COMPLETED status
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to confirm production.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-surface-500">Loading order details...</div>;
  if (!order) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            icon={<ArrowLeft className="w-5 h-5" />} 
            onClick={() => navigate('/manufacturing')}
            className="p-2"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">Order: {order.referenceId}</h1>
              <Badge variant={order.status === 'DRAFT' ? 'warning' : 'success'}>
                {order.status === 'DRAFT' ? 'Draft' : 'Completed'}
              </Badge>
            </div>
            <p className="text-sm text-surface-500 mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" /> 
              Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {order.status === 'DRAFT' && (
          <Button 
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={handleConfirm}
            isLoading={confirming}
          >
            Confirm & Deduct Stock
          </Button>
        )}
      </div>

      {order.status === 'DRAFT' && (
        <div className="bg-primary-50 border border-primary-200 text-primary-800 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Note:</strong> This order is currently a Draft. Stock has <strong>not</strong> been deducted yet. Final confirmation logic is pending implementation.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2 border-b border-surface-200 pb-2">
              <Factory className="w-5 h-5 text-primary-600" />
              Production Details
            </h3>
            
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-surface-500">Branch</dt>
                <dd className="mt-1 text-sm font-bold text-surface-900 capitalize">{order.branch}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-surface-500">Finished Product</dt>
                <dd className="mt-1 text-sm font-bold text-surface-900">{finishedProduct?.name}</dd>
                <dd className="text-xs text-surface-500 mt-0.5">{finishedVariant?.name} {finishedVariant?.size ? `(${finishedVariant.size})` : ''}</dd>
                <dd className="text-xs font-mono text-surface-400 mt-0.5">{finishedVariant?.sku}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-surface-500">Quantity to Produce</dt>
                <dd className="mt-1 text-2xl font-bold text-primary-700">{order.quantityProduced} units</dd>
              </div>

              {order.notes && (
                <div>
                  <dt className="text-sm font-medium text-surface-500">Notes</dt>
                  <dd className="mt-1 text-sm text-surface-800 p-3 bg-surface-50 rounded border border-surface-100">{order.notes}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2 border-b border-surface-200 pb-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Required Components
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="py-2 text-xs font-semibold text-surface-500 uppercase">Material</th>
                    <th className="py-2 text-xs font-semibold text-surface-500 uppercase text-right">Qty Per Unit</th>
                    <th className="py-2 text-xs font-semibold text-surface-500 uppercase text-right">Total Required</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((mat, i) => (
                    <tr key={i} className="border-b border-surface-100">
                      <td className="py-3">
                        <div className="font-medium text-surface-900">{mat.name} {mat.size ? `(${mat.size})` : ''}</div>
                        <div className="text-xs text-surface-500">{mat.sku}</div>
                      </td>
                      <td className="py-3 text-sm text-surface-600 text-right">{mat.quantityPerUnit}</td>
                      <td className="py-3 text-sm font-bold text-surface-900 text-right">{mat.totalRequired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <p className="mt-6 text-xs text-surface-500 text-center">
              Generated using BOM ID: {order.bomId}
            </p>
          </Card>
        </div>

      </div>
    </div>
  );
}
