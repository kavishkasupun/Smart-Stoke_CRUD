import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Package, Building2 } from 'lucide-react';
import { Card, Button, Table, Spinner, Badge } from '../../components/ui';
import { getReceiveDetails } from '../../services/stockReceiveService';
import { getProductById, getProductVariants } from '../../services/productService';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function ReceiveDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [enrichedMovements, setEnrichedMovements] = useState([]);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await getReceiveDetails(id);
      
      if (res && res.receive) {
        setData(res.receive);
        
        // Enrich movements with product and variant names
        // Note: For a very large system, storing snapshot names in the movement doc is better.
        // For now, we fetch them to enrich the view.
        const enriched = await Promise.all(res.movements.map(async (mov) => {
          let pName = 'Unknown Product';
          let vName = 'Unknown Variant';
          try {
            const prod = await getProductById(mov.productId);
            if (prod) pName = prod.name;
            const vars = await getProductVariants(mov.productId);
            const variant = vars.find(v => v.id === mov.variantId);
            if (variant) vName = variant.size ? `${variant.name} (${variant.size})` : variant.name;
          } catch (e) {
            console.error('Failed to enrich names for movement', mov.id);
          }
          return { ...mov, productName: pName, variantName: vName };
        }));

        setEnrichedMovements(enriched);
      }
    } catch (error) {
      console.error('Failed to load receive details:', error);
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
        <h2 className="text-xl font-bold text-surface-900">Receive record not found</h2>
        <Button onClick={() => navigate('/stock-receiving')} className="mt-4">Back to Receiving</Button>
      </div>
    );
  }

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
      header: 'Qty Received', 
      accessor: 'quantity',
      render: (val) => <span className="font-bold text-success-600">+{val}</span>
    },
    { 
      header: 'Previous Stock', 
      accessor: 'beforeQuantity'
    },
    { 
      header: 'New Stock', 
      accessor: 'afterQuantity',
      render: (val) => <span className="font-bold">{val}</span>
    },
    { 
      header: 'Unit Cost', 
      accessor: 'costPrice',
      render: (val) => formatCurrency(val)
    },
    { 
      header: 'Batch/Ref', 
      accessor: 'batchReference',
      render: (val) => val || '-'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/stock-receiving')}
          className="p-2"
        />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Receive Details</h1>
          <p className="text-sm text-surface-500 mt-1">Ref: {data.referenceId}</p>
        </div>
        <div className="ml-auto">
          <Badge variant="success">COMPLETED</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Supplier</p>
            <p className="font-semibold text-surface-900">{data.supplier}</p>
          </div>
        </Card>
        
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-info-50 text-info-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Destination</p>
            <p className="font-semibold text-surface-900">{data.destinationBranch}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-success-50 text-success-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Import Date</p>
            <p className="font-semibold text-surface-900">{formatDate(data.importDate)}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-warning-50 text-warning-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Total Items</p>
            <p className="font-semibold text-surface-900">{data.totalItems}</p>
          </div>
        </Card>
      </div>

      {data.notes && (
        <Card className="p-4 bg-surface-50">
          <p className="text-sm text-surface-600"><span className="font-semibold">Notes:</span> {data.notes}</p>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-surface-200">
          <h2 className="text-lg font-bold text-surface-900">Received Items & Stock Movements</h2>
        </div>
        <Table 
          columns={columns}
          data={enrichedMovements}
          emptyMessage="No movements found for this record."
        />
      </Card>
    </div>
  );
}
