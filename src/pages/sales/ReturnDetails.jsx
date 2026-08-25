import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { getSalesReturnById } from '../../services/salesReturnService';
import { formatDate } from '../../utils/formatters';

export default function ReturnDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnRecord, setReturnRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReturn();
  }, [id]);

  const fetchReturn = async () => {
    try {
      setLoading(true);
      const data = await getSalesReturnById(id);
      setReturnRecord(data);
    } catch (error) {
      console.error('Error fetching return:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!returnRecord) return <div className="p-12 text-center text-slate-500">Return record not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/sales-returns')}
        />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Return Details</h1>
          <p className="text-sm text-slate-500">{returnRecord.returnNumber}</p>
        </div>
      </div>

      <Card>
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-slate-800">{returnRecord.returnNumber}</h2>
              <Badge variant="success">Completed</Badge>
            </div>
            <p className="text-sm text-slate-500">Processed on {formatDate(returnRecord.createdAt)}</p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-slate-500 mb-1">Branch</p>
            <p className="font-semibold text-slate-800 capitalize">{returnRecord.branch}</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Original Invoice</p>
              <p 
                className="font-bold text-primary-600 hover:underline cursor-pointer inline-block"
                onClick={() => navigate(`/bills/${returnRecord.invoiceId}`)}
              >
                {returnRecord.invoiceNumber}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Customer</p>
              <p className="font-semibold text-slate-800">{returnRecord.customerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Reason for Return</p>
              <p className="font-semibold text-slate-800">{returnRecord.reason.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Item Restocked</h3>
            
            <div className="space-y-1 mb-4">
              <p className="font-bold text-slate-800">{returnRecord.productName}</p>
              <p className="text-sm text-slate-600">Variant: {returnRecord.variantName}</p>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-200">
              <span className="text-sm text-slate-600">Quantity Returned</span>
              <span className="font-black text-lg text-slate-800">{returnRecord.returnQuantity}</span>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-success-600 font-medium bg-success-50 p-2 rounded border border-success-100">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Stock has been successfully updated in {returnRecord.branch} branch.
            </div>
          </div>
        </div>

        {returnRecord.notes && (
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Remarks / Notes</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{returnRecord.notes}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
