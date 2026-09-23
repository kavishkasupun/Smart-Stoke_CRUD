import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Factory, Clock } from 'lucide-react';
import { Card, Table, Button, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getProductionOrders } from '../../services/productionService';
import { getProducts, getProductVariants } from '../../services/productService';
import { useToast } from '../../contexts/ToastContext';

export default function ProductionList() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const branch = userProfile?.branchId; // 'mabola', 'jaffna', or 'all'
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [branch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersData, productsData, variantsData] = await Promise.all([
        getProductionOrders(branch),
        getProducts(),
        getProductVariants()
      ]);

      const enrichedOrders = ordersData.map(order => {
        const variant = variantsData.find(v => v.id === order.finishedVariantId);
        const product = productsData.find(p => p.id === order.finishedProductId);
        
        return {
          ...order,
          productName: product?.name || 'Unknown Product',
          variantName: variant?.name || 'Unknown Variant',
          variantSize: variant?.size || '',
          sku: variant?.sku || ''
        };
      });

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Failed to load production orders:', error);
      toast.error('Failed to load production orders');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Order Number',
      accessor: 'referenceId',
      render: (val) => <span className="font-mono font-medium text-surface-900">{val}</span>
    },
    { 
      header: 'Date', 
      accessor: 'createdAt',
      render: (val) => <span className="text-sm text-surface-600">{val ? new Date(val).toLocaleString() : 'N/A'}</span>
    },
    { 
      header: 'Branch', 
      accessor: 'branch',
      render: (val) => <span className="capitalize font-medium text-surface-700">{val}</span>
    },
    { 
      header: 'Finished Product', 
      accessor: 'productName',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{val}</div>
          <div className="text-xs text-surface-500">{row.variantName} {row.variantSize && `(${row.variantSize})`} • {row.sku}</div>
        </div>
      )
    },
    { 
      header: 'Quantity', 
      accessor: 'quantityProduced',
      render: (val) => <span className="font-bold text-surface-900">{val}</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (val) => (
        <Badge variant={val === 'DRAFT' ? 'warning' : 'success'}>
          {val === 'DRAFT' ? 'Draft' : 'Completed'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/manufacturing/${id}`)}
          icon={<Eye className="w-4 h-4" />}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Factory className="w-6 h-6 text-primary-600" />
            Production Orders
          </h1>
          <p className="text-sm text-surface-500 mt-1">Manage manufacturing runs and track material usage.</p>
        </div>
        
        <Button 
          onClick={() => navigate('/manufacturing/new')} 
          icon={<Plus className="w-4 h-4" />}
        >
          New Production Order
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns}
          data={orders}
          isLoading={loading}
          emptyMessage={
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-surface-900">No production orders found</h3>
              <p className="text-surface-500 mb-4">You haven't recorded any manufacturing runs yet.</p>
              <Button onClick={() => navigate('/manufacturing/new')} icon={<Plus className="w-4 h-4" />}>
                Create First Order
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}
