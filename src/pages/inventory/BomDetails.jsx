import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Layers, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, Button, Badge, Table } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageInventory } from '../../utils/permissions';
import { getBomById, getBomHistory } from '../../services/bomService';
import { getProducts, getProductVariants } from '../../services/productService';
import { useToast } from '../../contexts/ToastContext';

export default function BomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const canManage = canManageInventory(userProfile?.role);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  
  const [bom, setBom] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [finishedProduct, setFinishedProduct] = useState(null);
  const [finishedVariant, setFinishedVariant] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [allVariants, setAllVariants] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const currentBom = await getBomById(id);
      if (!currentBom) {
        toast.error('BOM not found');
        navigate('/boms');
        return;
      }
      setBom(currentBom);

      const [allProductsData, allVariantsData, bomHistory] = await Promise.all([
        getProducts(),
        getProductVariants(),
        getBomHistory(currentBom.finishedProductId, currentBom.finishedVariantId)
      ]);
      
      setHistory(bomHistory);

      const variant = allVariantsData.find(v => v.id === currentBom.finishedVariantId);
      const product = allProductsData.find(p => p.id === currentBom.finishedProductId);
      
      setFinishedVariant(variant);
      setFinishedProduct(product);
      setAllProducts(allProductsData);
      setAllVariants(allVariantsData);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load BOM details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-surface-500">Loading BOM details...</div>;
  if (!bom) return null;

  const getMaterialLabel = (row) => {
    if (row.variantId) {
      const v = allVariants.find(v => v.id === row.variantId);
      const p = allProducts.find(p => p.id === (v?.productId || row.productId));
      if (v && p) return `${p.name} ${v.name} ${v.size ? `(${v.size})` : ''}`;
    }
    if (row.productId) {
      const p = allProducts.find(p => p.id === row.productId);
      if (p) return p.name;
    }
    return 'Unknown Material';
  };

  const getMaterialSku = (row) => {
    if (row.variantId) {
      const v = allVariants.find(v => v.id === row.variantId);
      return v?.sku || 'N/A';
    }
    if (row.productId) {
      const p = allProducts.find(p => p.id === row.productId);
      return p?.sku || 'N/A';
    }
    return 'N/A';
  };

  const materialsColumns = [
    {
      header: 'Component',
      accessor: 'id',
      render: (_, row) => <span className="font-medium text-surface-900">{getMaterialLabel(row)}</span>
    },
    {
      header: 'SKU',
      accessor: 'id',
      render: (_, row) => <span className="font-mono text-sm text-surface-500">{getMaterialSku(row)}</span>
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (val, row) => <span className="font-medium">{val} {row.unit}</span>
    }
  ];

  const historyColumns = [
    {
      header: 'Version',
      accessor: 'version',
      render: (val, row) => (
        <Link to={`/boms/${row.id}`} className="font-medium text-primary-600 hover:underline">
          Version {val}
        </Link>
      )
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (val) => (
        val 
          ? <span className="flex items-center gap-1 text-success-600 text-sm font-medium"><CheckCircle2 className="w-4 h-4"/> Active</span>
          : <span className="flex items-center gap-1 text-surface-500 text-sm font-medium"><AlertCircle className="w-4 h-4"/> Inactive</span>
      )
    },
    {
      header: 'Components',
      accessor: 'materials',
      render: (val) => <span className="text-sm">{val?.length || 0} items</span>
    },
    {
      header: 'Created At',
      accessor: 'createdAt',
      render: (val) => <span className="text-sm text-surface-500">{val ? new Date(val).toLocaleString() : 'N/A'}</span>
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            icon={<ArrowLeft className="w-5 h-5" />} 
            onClick={() => navigate('/boms')}
            className="p-2"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">BOM: {finishedProduct?.name}</h1>
              <Badge variant="primary">v{bom.version}</Badge>
              {bom.active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="surface">Historical</Badge>
              )}
            </div>
            <p className="text-sm text-surface-500 mt-1">
              Variant: {finishedVariant?.name} {finishedVariant?.size ? `(${finishedVariant.size})` : ''} | SKU: {finishedVariant?.sku || 'N/A'}
            </p>
          </div>
        </div>

        {canManage && bom.active && (
          <Button 
            onClick={() => navigate(`/boms/${id}/edit`)} 
            icon={<Edit2 className="w-4 h-4" />}
          >
            Edit Recipe (New Version)
          </Button>
        )}
      </div>

      {!bom.active && (
        <div className="bg-warning-50 border border-warning-200 text-warning-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Viewing Historical Version</h4>
            <p className="text-sm mt-1">This BOM is no longer active. Editing the active BOM creates new versions, ensuring that past production records remain tied to their exact historical recipe.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2 border-b border-surface-200 pb-2">
              <Layers className="w-5 h-5 text-primary-600" />
              Components (Recipe)
            </h3>
            <Table 
              columns={materialsColumns}
              data={bom.materials || []}
              emptyMessage="No components found."
            />
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2 border-b border-surface-200 pb-2">
              <Clock className="w-5 h-5 text-primary-600" />
              Version History
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="py-2 text-xs font-semibold text-surface-500 uppercase">Version</th>
                    <th className="py-2 text-xs font-semibold text-surface-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={h.id} className={`border-b border-surface-100 ${h.id === id ? 'bg-primary-50/50' : ''}`}>
                      <td className="py-3">
                        <Link to={`/boms/${h.id}`} className={`font-medium ${h.id === id ? 'text-primary-700' : 'text-primary-600 hover:underline'}`}>
                          v{h.version} {h.id === id && '(Current)'}
                        </Link>
                      </td>
                      <td className="py-3">
                        {h.active ? (
                          <span className="text-xs font-medium text-success-600 bg-success-50 px-2 py-1 rounded-full">Active</span>
                        ) : (
                          <span className="text-xs font-medium text-surface-500 bg-surface-100 px-2 py-1 rounded-full">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
