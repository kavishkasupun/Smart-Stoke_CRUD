import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Box, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Card, Table, Badge, Input, Spinner } from '../../components/ui';
import { getProductVariants, getProducts } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getActiveBoms } from '../../services/bomService';

export default function StockOverview() {
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [variantsData, productsData, categoriesData, bomsData] = await Promise.all([
        getProductVariants(), 
        getProducts(),
        getCategories(),
        getActiveBoms()
      ]);
      
      setCategories(categoriesData);
      setBoms(bomsData);

      const nonVariantProducts = productsData.filter(p => p.hasVariants === false).map(p => ({
        id: p.id,
        productId: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        reorderLevel: p.reorderLevel,
        active: p.active,
        size: '',
        categoryId: p.categoryId,
        productType: p.productType
      }));

      const enrichedVariants = variantsData.map(v => {
        const product = productsData.find(p => p.id === v.productId);
        return {
          ...v,
          categoryId: product?.categoryId,
          productType: product?.productType
        };
      });

      setVariants([...enrichedVariants, ...nonVariantProducts]);
    } catch (error) {
      console.error('Failed to load stock overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (variant) => {
    const qty = variant.stock?.overall || 0;
    if (qty === 0) return 'out_of_stock';
    if (qty <= (variant.reorderLevel || 0)) return 'low_stock';
    return 'normal';
  };

  const getStatusBadge = (variant) => {
    const status = getStatus(variant);
    if (status === 'out_of_stock') return <Badge variant="danger">OUT OF STOCK</Badge>;
    if (status === 'low_stock') return <Badge variant="warning">LOW STOCK</Badge>;
    return <Badge variant="success">Normal</Badge>;
  };

  const categoryMap = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {});
  }, [categories]);

  const filteredVariants = variants.filter(variant => {
    const matchesSearch = variant?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
                          variant?.sku?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false;
    const status = getStatus(variant);
    const matchesStatus = selectedStatus ? status === selectedStatus : true;
    const matchesCategory = selectedCategory ? variant.categoryId === selectedCategory : true;
    const matchesType = selectedProductType ? variant.productType === selectedProductType : true;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesType;
  });

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getVariantStock = (productId, variantId) => {
    if (variantId) {
      const v = variants.find(v => v.id === variantId);
      return v?.stock || { mabola: 0, jaffna: 0, overall: 0 };
    }
    const p = variants.find(v => v.id === productId);
    return p?.stock || { mabola: 0, jaffna: 0, overall: 0 };
  };

  const renderRow = (row, index) => {
    const bom = boms.find(b => b.finishedProductId === row.productId && (b.finishedVariantId === row.id || !b.finishedVariantId));
    const isExpanded = !!expandedRows[row.id];
    const hasBom = !!bom;

    return (
      <React.Fragment key={row.id}>
        <tr className="hover:bg-surface-50/50 transition-colors border-b border-surface-100">
          {columns.map((col, idx) => (
            <td key={idx} className="px-4 py-3 text-surface-700 whitespace-nowrap">
              {col.render ? col.render(row[col.accessor], row, { hasBom, isExpanded, toggleRow }) : (row[col.accessor] ?? '—')}
            </td>
          ))}
        </tr>
        {isExpanded && hasBom && (
          <tr className="bg-surface-50/80 border-b border-surface-200">
            <td colSpan={columns.length} className="px-0 py-0">
              <div className="px-12 py-4 shadow-inner">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-primary-600" />
                  <h4 className="font-semibold text-surface-900 text-sm">Bill of Materials (Raw Materials Required)</h4>
                  <Badge variant="surface" className="ml-2 text-xs">v{bom.version}</Badge>
                </div>
                
                <div className="bg-white rounded border border-surface-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-100 text-surface-600">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Material</th>
                        <th className="px-4 py-2 text-right font-medium">Qty per Unit</th>
                        <th className="px-4 py-2 text-right font-medium">Available (Mabola)</th>
                        <th className="px-4 py-2 text-right font-medium">Available (Jaffna)</th>
                        <th className="px-4 py-2 text-right font-medium">Total Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {bom.materials?.map((mat, i) => {
                        const matStock = getVariantStock(mat.productId, mat.variantId);
                        const matName = variants.find(v => (mat.variantId ? v.id === mat.variantId : v.productId === mat.productId))?.name || 'Unknown Material';
                        
                        return (
                          <tr key={i} className="hover:bg-surface-50">
                            <td className="px-4 py-2 text-surface-800">{matName}</td>
                            <td className="px-4 py-2 text-right font-mono text-surface-600">{mat.quantity}</td>
                            <td className="px-4 py-2 text-right text-surface-600">{matStock.mabola || 0}</td>
                            <td className="px-4 py-2 text-right text-surface-600">{matStock.jaffna || 0}</td>
                            <td className="px-4 py-2 text-right font-medium text-surface-800">{matStock.overall || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const columns = [
    { 
      header: 'Product/Variant Name', 
      accessor: 'name',
      render: (val, row, context) => (
        <div className="flex items-center gap-2">
          {context?.hasBom ? (
            <button 
              onClick={() => context.toggleRow(row.id)}
              className="p-1 hover:bg-surface-200 rounded text-surface-500 transition-colors"
            >
              {context.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" /> // spacer
          )}
          <div>
            <div className="font-medium text-surface-900">{val}</div>
            {row.size && <div className="text-xs text-surface-500">Size: {row.size}</div>}
            <div className="text-xs text-surface-400 font-mono mt-0.5">SKU: {row.sku || 'N/A'}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Category', 
      accessor: 'categoryId',
      render: (val) => (
        <Badge variant="surface">
          {categoryMap[val] || 'Unknown'}
        </Badge>
      )
    },
    {
      header: 'Type',
      accessor: 'productType',
      render: (val) => (
        <Badge variant={val === 'RAW_MATERIAL' ? 'warning' : 'primary'}>
          {val === 'RAW_MATERIAL' ? 'Raw Material' : 'Finished Product'}
        </Badge>
      )
    },
    { 
      header: 'Mabola', 
      accessor: 'stock',
      render: (s) => <span className="text-surface-700">{s?.mabola || 0}</span>
    },
    { 
      header: 'Jaffna', 
      accessor: 'stock',
      render: (s) => <span className="text-surface-700">{s?.jaffna || 0}</span>
    },
    { 
      header: 'Overall', 
      accessor: 'stock',
      render: (s) => <span className="font-bold">{s?.overall || 0}</span>
    },
    { 
      header: 'Minimum', 
      accessor: 'reorderLevel',
      render: (val) => <span className="text-surface-500">{val || 0}</span>
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (_, row) => getStatusBadge(row)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Stock Overview</h1>
          <p className="text-sm text-surface-500 mt-1">Monitor inventory levels across all branches</p>
        </div>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search by variant name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="w-full md:w-48 relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="normal">Normal</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
          
          <div className="w-full md:w-48 relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-48 relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Types</option>
              <option value="FINISHED_PRODUCT">Finished Products</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Spinner />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={filteredVariants}
            renderRow={renderRow}
            emptyMessage="No variants found matching your filters."
          />
        )}
      </Card>
    </div>
  );
}
