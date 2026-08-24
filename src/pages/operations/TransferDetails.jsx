import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, User, Package, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Table, Spinner, Badge } from '../../components/ui';
import { getTransferDetails, completeTransfer, cancelTransfer } from '../../services/stockTransferService';
import { getProductById, getProductVariants } from '../../services/productService';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { canManageInventory } from '../../utils/permissions';

export default function TransferDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [data, setData] = useState(null);
  const [enrichedItems, setEnrichedItems] = useState([]);

  const canManage = canManageInventory(userProfile?.role);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await getTransferDetails(id);
      
      if (res) {
        setData(res);
        
        // Enrich items with product and variant names
        const enriched = await Promise.all(res.items.map(async (item) => {
          let pName = 'Unknown Product';
          let vName = 'Unknown Variant';
          try {
            const prod = await getProductById(item.productId);
            if (prod) pName = prod.name;
            const vars = await getProductVariants(item.productId);
            const variant = vars.find(v => v.id === item.variantId);
            if (variant) vName = variant.size ? `${variant.name} (${variant.size})` : variant.name;
          } catch (e) {
            console.error('Failed to enrich names for item', item.productId);
          }
          return { ...item, productName: pName, variantName: vName };
        }));

        setEnrichedItems(enriched);
      }
    } catch (error) {
      console.error('Failed to load transfer details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    const isConfirmed = await confirm({
      title: 'Approve & Complete Transfer',
      message: `This will instantly deduct stock from ${data.sourceBranch} and add it to ${data.destinationBranch}. Are you sure you want to proceed?`,
      confirmText: 'Approve',
      type: 'success'
    });

    if (isConfirmed) {
      try {
        setActionLoading(true);
        await completeTransfer(id, userProfile.id);
        toast.success('Transfer completed successfully!');
        fetchDetails(); // refresh
      } catch (error) {
        toast.error(error.message || 'Failed to complete transfer.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleCancel = async () => {
    const isConfirmed = await confirm({
      title: 'Cancel Transfer',
      message: 'Are you sure you want to cancel this transfer request? No stock will be moved.',
      confirmText: 'Cancel Transfer',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        setActionLoading(true);
        await cancelTransfer(id, userProfile.id);
        toast.success('Transfer cancelled.');
        fetchDetails(); // refresh
      } catch (error) {
        toast.error('Failed to cancel transfer.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-surface-900">Transfer record not found</h2>
        <Button onClick={() => navigate('/stock-transfers')} className="mt-4">Back to Transfers</Button>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED': return <Badge variant="success">COMPLETED</Badge>;
      case 'PENDING': return <Badge variant="warning">PENDING</Badge>;
      case 'CANCELLED': return <Badge variant="danger">CANCELLED</Badge>;
      default: return <Badge variant="surface">{status}</Badge>;
    }
  };

  const columns = [
    { 
      header: 'Product', 
      accessor: 'productName',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{val}</div>
          <div className="text-xs text-surface-500">{row.variantName}</div>
        </div>
      )
    },
    { 
      header: 'Transfer Qty', 
      accessor: 'quantity',
      render: (val) => <span className="font-bold text-info-600">{val}</span>
    }
  ];

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
          <h1 className="text-2xl font-bold text-surface-900">Transfer Details</h1>
          <p className="text-sm text-surface-500 mt-1">Ref: {data.referenceId}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {getStatusBadge(data.status)}
          
          {data.status === 'PENDING' && canManage && (
            <div className="flex gap-2 ml-4 border-l border-surface-200 pl-4">
              <Button 
                variant="outline" 
                className="text-danger-600 border-danger-200 hover:bg-danger-50"
                onClick={handleCancel}
                isLoading={actionLoading}
                icon={<XCircle className="w-4 h-4" />}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApprove}
                isLoading={actionLoading}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 md:col-span-2">
          <div className="flex-1 flex flex-col items-center">
            <span className="text-xs text-surface-500 font-medium uppercase tracking-wider mb-1">From</span>
            <span className="font-bold text-lg text-surface-900">{data.sourceBranch}</span>
          </div>
          <div className="px-4 text-surface-300">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-xs text-surface-500 font-medium uppercase tracking-wider mb-1">To</span>
            <span className="font-bold text-lg text-surface-900">{data.destinationBranch}</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-surface-100 text-surface-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Date Requested</p>
            <p className="font-semibold text-surface-900">{formatDate(data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt)}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-surface-100 text-surface-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Total Items</p>
            <p className="font-semibold text-surface-900">{data.totalItems}</p>
          </div>
        </Card>
      </div>

      {data.notes && (
        <Card className="p-4 bg-surface-50 border-l-4 border-l-primary-500">
          <p className="text-sm text-surface-700"><span className="font-semibold">Notes:</span> {data.notes}</p>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-surface-200">
          <h2 className="text-lg font-bold text-surface-900">Requested Items</h2>
        </div>
        <Table 
          columns={columns}
          data={enrichedItems}
          emptyMessage="No items found."
        />
      </Card>
    </div>
  );
}
