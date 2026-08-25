import React, { useState, useEffect } from 'react';
import { Download, Search, Filter } from 'lucide-react';
import { Card, Table, Badge, Input, Select, Button, Spinner } from '../../components/ui';
import { getInventoryReportData } from '../../services/reportService';
import { useAuth } from '../../contexts/AuthContext';
import { BRANCHES } from '../../config/constants';

export default function InventoryReport() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  
  // Filters
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // If user is a branch manager, force their branch
    if (userProfile.branchId && userProfile.branchId !== BRANCHES.GLOBAL) {
      setBranchFilter(userProfile.branchId);
    }
    fetchData();
  }, [userProfile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const inventory = await getInventoryReportData();
      setData(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Data
  const filteredData = data.filter(variant => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !variant.name?.toLowerCase().includes(q) &&
        !variant.sku?.toLowerCase().includes(q) &&
        !variant.barcode?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    // Branch / Stock Quantity
    const mabolaStock = variant.stock?.mabola || 0;
    const jaffnaStock = variant.stock?.jaffna || 0;
    const overallStock = variant.stock?.overall || 0;
    const reorder = variant.reorderLevel || 0;

    let targetStock = overallStock;
    if (branchFilter === 'Mabola') targetStock = mabolaStock;
    if (branchFilter === 'Jaffna') targetStock = jaffnaStock;

    // Status Filter
    if (statusFilter === 'LOW_STOCK') {
      if (targetStock > reorder || targetStock === 0) return false;
    }
    if (statusFilter === 'OUT_OF_STOCK') {
      if (targetStock > 0) return false;
    }
    if (statusFilter === 'IN_STOCK') {
      if (targetStock <= reorder) return false;
    }

    return true;
  });

  const getStockStatus = (stockQty, reorder) => {
    if (stockQty === 0) return <Badge variant="danger">OUT OF STOCK</Badge>;
    if (stockQty <= reorder) return <Badge variant="warning">LOW STOCK</Badge>;
    return <Badge variant="success">IN STOCK</Badge>;
  };

  const columns = [
    {
      header: 'Product / Variant',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-bold text-surface-900">{val}</div>
          <div className="text-xs text-surface-500">
            {row.sku} {row.barcode ? `| ${row.barcode}` : ''}
          </div>
        </div>
      )
    },
    { header: 'Size', accessor: 'size', render: (val) => val || '—' },
    { 
      header: 'Category', 
      accessor: 'categoryId',
      // We'd ideally join with categories, but for now we show ID or a placeholder.
      // Assuming productName already includes category sometimes, or we just show simple fields.
      render: (val) => <span className="text-sm text-surface-600">{val || '—'}</span>
    },
    {
      header: 'Mabola Stock',
      accessor: 'stock',
      key: 'mabolaStock',
      render: (s) => <span className="font-medium text-surface-700">{s?.mabola || 0}</span>
    },
    {
      header: 'Jaffna Stock',
      accessor: 'stock',
      key: 'jaffnaStock',
      render: (s) => <span className="font-medium text-surface-700">{s?.jaffna || 0}</span>
    },
    {
      header: 'Overall Stock',
      accessor: 'stock',
      key: 'overallStock',
      render: (s) => <span className="font-bold text-surface-900">{s?.overall || 0}</span>
    },
    {
      header: 'Status',
      accessor: 'stock',
      key: 'status',
      render: (s, row) => {
        let targetStock = s?.overall || 0;
        if (branchFilter === 'Mabola') targetStock = s?.mabola || 0;
        if (branchFilter === 'Jaffna') targetStock = s?.jaffna || 0;
        return getStockStatus(targetStock, row.reorderLevel || 0);
      }
    }
  ];

  // CSV Export logic
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['Product', 'SKU', 'Size', 'Mabola Stock', 'Jaffna Stock', 'Overall Stock', 'Reorder Level'];
    const csvData = filteredData.map(v => [
      `"${v.name}"`,
      `"${v.sku || ''}"`,
      `"${v.size || ''}"`,
      v.stock?.mabola || 0,
      v.stock?.jaffna || 0,
      v.stock?.overall || 0,
      v.reorderLevel || 0
    ].join(','));
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_report_${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Inventory Status Report</h1>
          <p className="text-sm text-surface-500 mt-1">Current snapshot of all products and variants.</p>
        </div>
        <Button onClick={handleExportCSV} variant="secondary" icon={<Download className="w-4 h-4" />} disabled={filteredData.length === 0}>
          Export CSV
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input 
            icon={<Search className="w-4 h-4" />}
            placeholder="Search by product name, SKU or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select 
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            disabled={userProfile.branchId !== BRANCHES.GLOBAL}
          >
            <option value="">All Branches</option>
            <option value="Mabola">Mabola</option>
            <option value="Jaffna">Jaffna</option>
          </Select>
        </div>
        <div className="w-full md:w-48">
          <Select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-64">
             <Spinner size="lg" />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={filteredData}
            emptyMessage="No variants found matching your filters."
          />
        )}
      </Card>
    </div>
  );
}
