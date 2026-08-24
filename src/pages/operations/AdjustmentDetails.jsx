import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { getAdjustmentDetails } from '../../services/stockAdjustmentService';
import { getProductById, getProductVariants } from '../../services/productService';
import { formatDate } from '../../utils/formatters';

export default function AdjustmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [productName, setProductName] = useState('');
  const [variantName, setVariantName] = useState('');

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await getAdjustmentDetails(id);
      
      if (res) {
        setData(res);
        try {
          const prod = await getProductById(res.productId);
          if (prod) setProductName(prod.name);
          const vars = await getProductVariants(res.productId);
          const variant = vars.find(v => v.id === res.variantId);
          if (variant) setVariantName(variant.size ? `${variant.name} (${variant.size})` : variant.name);
        } catch (e) {
          console.error('Failed to fetch product names');
        }
      }
    } catch (error) {
      console.error('Failed to load adjustment details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-surface-900">Adjustment record not found</h2>
        <Button onClick={() => navigate('/adjustments')} className="mt-4">Back to Adjustments</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/adjustments')}
          className="p-2"
        />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Adjustment Details</h1>
          <p className="text-sm text-surface-500 mt-1">Ref: {data.referenceId}</p>
        </div>
        <div className="ml-auto">
          <Badge variant="success">COMPLETED</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Adjustment Summary */}
        <Card className="p-6">
          <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-4">Adjustment Info</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-100">
              <span className="text-surface-600">Date</span>
              <span className="font-semibold text-surface-900">{formatDate(data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-surface-100">
              <span className="text-surface-600">Branch</span>
              <span className="font-semibold text-surface-900">{data.branch}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-surface-100">
              <span className="text-surface-600">Adjustment Type</span>
              <Badge variant="warning">{data.type?.replace('_', ' ')}</Badge>
            </div>
            <div>
              <span className="text-surface-600 block mb-1">Reason</span>
              <span className="font-medium text-surface-900">{data.reason}</span>
            </div>
          </div>
        </Card>

        {/* Stock Changes */}
        <Card className="p-6 bg-surface-50">
          <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-4">Stock Changes</h2>
          
          <div className="mb-6">
            <span className="block text-xs text-surface-500 mb-1">Product & Variant</span>
            <span className="block font-bold text-lg text-surface-900">{productName}</span>
            <span className="block text-surface-600">{variantName || data.variantId}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center items-center">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-surface-200">
              <div className="text-xs text-surface-500 mb-1">System Qty</div>
              <div className="text-xl font-bold text-surface-900">{data.beforeQuantity}</div>
            </div>
            <div className="text-surface-400">
              <ArrowLeft className="w-5 h-5 mx-auto rotate-180" />
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-surface-200">
              <div className="text-xs text-surface-500 mb-1">Actual Qty</div>
              <div className="text-xl font-bold text-primary-600">{data.afterQuantity}</div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <span className="text-sm text-surface-600 mr-2">Discrepancy:</span>
            <span className={`text-xl font-bold ${data.adjustQty < 0 ? 'text-danger-600' : 'text-success-600'}`}>
              {data.adjustQty > 0 ? '+' : ''}{data.adjustQty}
            </span>
          </div>
        </Card>
      </div>

      {data.notes && (
        <Card className="p-4 bg-surface-50 border-l-4 border-l-info-500 flex gap-3">
          <AlertCircle className="w-5 h-5 text-info-500 flex-shrink-0" />
          <p className="text-sm text-surface-700">{data.notes}</p>
        </Card>
      )}
    </div>
  );
}
