import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2, Layers } from 'lucide-react';
import { Card, Table, Button, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageInventory } from '../../utils/permissions';
import { getActiveBoms } from '../../services/bomService';
import { getProducts, getProductVariants } from '../../services/productService';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Search } from 'lucide-react';
import { Input, Spinner } from '../../components/ui';

export default function BillOfMaterials() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const canManage = canManageInventory(userProfile?.role);
  const toast = useToast();

  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bomsData, productsData, variantsData] = await Promise.all([
        getActiveBoms(),
        getProducts(),
        getProductVariants()
      ]);

      // Enrich BOMs with product and variant names
      const enrichedBoms = bomsData.map(bom => {
        let product = null;
        let variant = null;

        if (bom.finishedVariantId) {
          variant = variantsData.find(v => v.id === bom.finishedVariantId);
          product = productsData.find(p => p.id === variant?.productId) || productsData.find(p => p.id === bom.finishedProductId);
        } else {
          product = productsData.find(p => p.id === bom.finishedProductId);
        }
        
        return {
          ...bom,
          productName: product?.name || 'Unknown Product',
          variantName: variant ? variant.name : (product?.hasVariants === false ? null : 'Unknown Variant'),
          variantSize: variant?.size || '',
          sku: variant?.sku || product?.sku || ''
        };
      });

      setBoms(enrichedBoms);
    } catch (error) {
      console.error('Failed to load BOMs:', error);
      toast.error('Failed to load Bill of Materials');
    } finally {
      setLoading(false);
    }
  };

  const filteredBoms = React.useMemo(() => {
    return boms.filter(bom => {
      return bom.productName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
             bom.variantName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
             bom.sku?.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
  }, [boms, debouncedSearch]);

  const columns = [
    { 
      header: 'Finished Product', 
      accessor: 'productName',
      render: (val, row) => (
        <div>
          <div className="font-bold text-surface-900">{val}</div>
          {row.variantName && (
            <div className="text-sm text-surface-600">{row.variantName} {row.variantSize && `(${row.variantSize})`}</div>
          )}
        </div>
      )
    },
    { 
      header: 'SKU', 
      accessor: 'sku',
      render: (val) => <span className="font-mono text-sm text-surface-600">{val || 'N/A'}</span>
    },
    { 
      header: 'Version', 
      accessor: 'version',
      render: (val) => (
        <Badge variant="primary">v{val}</Badge>
      )
    },
    { 
      header: 'Components', 
      accessor: 'materials',
      render: (val) => (
        <span className="text-sm font-medium text-surface-700">
          {val?.length || 0} items
        </span>
      )
    },
    { 
      header: 'Status', 
      accessor: 'active',
      render: (val) => (
        <Badge variant={val ? 'success' : 'surface'}>
          {val ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/boms/${id}`)}
            icon={<Eye className="w-4 h-4" />}
          >
            View
          </Button>
          {canManage && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/boms/${id}/edit`)}
              icon={<Edit2 className="w-4 h-4" />}
            >
              Edit
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-600" />
            Bill of Materials
          </h1>
          <p className="text-sm text-surface-500 mt-1">Manage manufacturing recipes for finished products</p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => navigate('/boms/new')} 
            icon={<Plus className="w-4 h-4" />}
          >
            Create BOM
          </Button>
        )}
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search product or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Spinner />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={filteredBoms}
            emptyMessage={
              <div className="text-center py-12">
                <Layers className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-900">No active BOMs</h3>
                <p className="text-surface-500 mb-4">You haven't defined any manufacturing recipes matching the criteria.</p>
                {canManage && (
                  <Button onClick={() => navigate('/boms/new')} icon={<Plus className="w-4 h-4" />}>
                    Create First BOM
                  </Button>
                )}
              </div>
            }
          />
        )}
      </Card>
    </div>
  );
}
