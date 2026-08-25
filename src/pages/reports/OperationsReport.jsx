import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import { Card, Table, Badge, Input, Select, Button, Spinner, DateRangePicker } from '../../components/ui';
import { getOperationsReportData } from '../../services/reportService';
import { useAuth } from '../../contexts/AuthContext';
import { BRANCHES } from '../../config/constants';
import { formatDate } from '../../utils/formatters';

export default function OperationsReport() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ movements: [], transfers: [], adjustments: [] });
  const [activeTab, setActiveTab] = useState('MOVEMENTS'); // MOVEMENTS, TRANSFERS, ADJUSTMENTS
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (userProfile.branch && userProfile.branch !== BRANCHES.GLOBAL) {
      setBranchFilter(userProfile.branch);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const opsData = await getOperationsReportData(startDate, endDate);
      setData(opsData);
    } catch (error) {
      console.error('Error fetching operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = useMemo(() => {
    return data.movements.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.referenceNumber?.toLowerCase().includes(q) &&
            !item.productName?.toLowerCase().includes(q) &&
            !item.variantName?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (branchFilter && item.branch !== branchFilter) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      return true;
    });
  }, [data.movements, searchQuery, branchFilter, typeFilter]);

  const filteredTransfers = useMemo(() => {
    return data.transfers.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.referenceId?.toLowerCase().includes(q)) return false;
      }
      // If branch manager, show transfers involving their branch (source or destination)
      if (branchFilter && item.sourceBranch !== branchFilter && item.destinationBranch !== branchFilter) return false;
      if (typeFilter && item.status !== typeFilter) return false; // repurposing typeFilter for Status here
      return true;
    });
  }, [data.transfers, searchQuery, branchFilter, typeFilter]);

  const filteredAdjustments = useMemo(() => {
    return data.adjustments.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.referenceId?.toLowerCase().includes(q)) return false;
      }
      if (branchFilter && item.branch !== branchFilter) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      return true;
    });
  }, [data.adjustments, searchQuery, branchFilter, typeFilter]);

  const movementColumns = [
    { header: 'Ref #', accessor: 'referenceNumber', render: (val) => <span className="font-bold text-surface-900">{val || '—'}</span> },
    { header: 'Date', accessor: 'createdAt', render: (val) => formatDate(val, { includeTime: true }) },
    { header: 'Branch', accessor: 'branch', render: (val) => <Badge variant="info">{val}</Badge> },
    { header: 'Type', accessor: 'type', render: (val) => <Badge variant="secondary">{val}</Badge> },
    { header: 'Product', accessor: 'variantName', render: (val, row) => <span className="text-sm">{row.productName} - {val}</span> },
    { header: 'Qty', accessor: 'quantity', render: (val) => <span className={`font-bold ${val < 0 ? 'text-danger-600' : 'text-success-600'}`}>{val > 0 ? `+${val}` : val}</span> },
    { header: 'Before', accessor: 'beforeQuantity' },
    { header: 'After', accessor: 'afterQuantity' },
    { header: 'Notes', accessor: 'notes', render: (val) => <span className="text-xs text-surface-500 truncate max-w-xs block">{val || '—'}</span> }
  ];

  const transferColumns = [
    { header: 'Transfer #', accessor: 'referenceId', render: (val) => <span className="font-bold text-surface-900">{val}</span> },
    { header: 'Date', accessor: 'createdAt', render: (val) => formatDate(val, { includeTime: true }) },
    { header: 'Source', accessor: 'sourceBranch', render: (val) => <Badge variant="warning">{val}</Badge> },
    { header: 'Destination', accessor: 'destinationBranch', render: (val) => <Badge variant="info">{val}</Badge> },
    { header: 'Items', accessor: 'totalItems' },
    { header: 'Status', accessor: 'status', render: (val) => {
      if (val === 'COMPLETED') return <Badge variant="success">{val}</Badge>;
      if (val === 'CANCELLED') return <Badge variant="danger">{val}</Badge>;
      return <Badge variant="warning">{val}</Badge>;
    }},
    { header: 'Notes', accessor: 'notes', render: (val) => <span className="text-xs text-surface-500 truncate max-w-[150px] block">{val || '—'}</span> }
  ];

  const adjustmentColumns = [
    { header: 'Adjustment #', accessor: 'referenceId', render: (val) => <span className="font-bold text-surface-900">{val}</span> },
    { header: 'Date', accessor: 'createdAt', render: (val) => formatDate(val, { includeTime: true }) },
    { header: 'Branch', accessor: 'branch', render: (val) => <Badge variant="info">{val}</Badge> },
    { header: 'Type', accessor: 'type', render: (val) => <Badge variant={val === 'ADDITION' ? 'success' : 'danger'}>{val}</Badge> },
    { header: 'Reason', accessor: 'reason' },
    { header: 'Qty', accessor: 'adjustQty', render: (val) => <span className="font-bold">{val}</span> },
    { header: 'Notes', accessor: 'notes', render: (val) => <span className="text-xs text-surface-500 truncate max-w-[150px] block">{val || '—'}</span> }
  ];

  const handleExportCSV = () => {
    let targetData = [];
    let headers = [];
    let csvData = [];
    let filename = '';

    if (activeTab === 'MOVEMENTS') {
      targetData = filteredMovements;
      if (targetData.length === 0) return;
      headers = ['Reference Number', 'Date', 'Branch', 'Type', 'Product', 'Variant', 'Quantity', 'Before', 'After', 'Notes'];
      csvData = targetData.map(m => [
        `"${m.referenceNumber || ''}"`,
        `"${formatDate(m.createdAt, { includeTime: true })}"`,
        `"${m.branch}"`,
        `"${m.type}"`,
        `"${m.productName}"`,
        `"${m.variantName}"`,
        m.quantity,
        m.beforeQuantity,
        m.afterQuantity,
        `"${m.notes || ''}"`
      ].join(','));
      filename = 'movements_report';
    } else if (activeTab === 'TRANSFERS') {
      targetData = filteredTransfers;
      if (targetData.length === 0) return;
      headers = ['Transfer ID', 'Date', 'Source', 'Destination', 'Items Count', 'Status', 'Notes'];
      csvData = targetData.map(t => [
        `"${t.referenceId}"`,
        `"${formatDate(t.createdAt, { includeTime: true })}"`,
        `"${t.sourceBranch}"`,
        `"${t.destinationBranch}"`,
        t.totalItems || 0,
        `"${t.status}"`,
        `"${t.notes || ''}"`
      ].join(','));
      filename = 'transfers_report';
    } else {
      targetData = filteredAdjustments;
      if (targetData.length === 0) return;
      headers = ['Adjustment ID', 'Date', 'Branch', 'Type', 'Reason', 'Qty', 'Before', 'After', 'Notes'];
      csvData = targetData.map(a => [
        `"${a.referenceId}"`,
        `"${formatDate(a.createdAt, { includeTime: true })}"`,
        `"${a.branch}"`,
        `"${a.type}"`,
        `"${a.reason}"`,
        a.adjustQty,
        a.beforeQuantity,
        a.afterQuantity,
        `"${a.notes || ''}"`
      ].join(','));
      filename = 'adjustments_report';
    }
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Operations & Logistics</h1>
          <p className="text-sm text-surface-500 mt-1">Logs of internal stock movements, transfers, and adjustments.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl border border-surface-200 shadow-sm">
            <DateRangePicker 
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />
          </div>
          <Button onClick={handleExportCSV} variant="secondary" icon={Download}>
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input 
            icon={<Search className="w-4 h-4" />}
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select 
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            disabled={userProfile.branch !== BRANCHES.GLOBAL}
          >
            <option value="">All Branches</option>
            <option value="Mabola">Mabola</option>
            <option value="Jaffna">Jaffna</option>
          </Select>
        </div>
        
        {/* Dynamic Type Filter depending on Tab */}
        <div className="w-full md:w-48">
          <Select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types/Statuses</option>
            {activeTab === 'MOVEMENTS' && (
              <>
                <option value="SALE">Sale</option>
                <option value="SALE_RETURN">Sale Return</option>
                <option value="RECEIVE_STOCK">Receive Stock</option>
                <option value="TRANSFER_IN">Transfer In</option>
                <option value="TRANSFER_OUT">Transfer Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </>
            )}
            {activeTab === 'TRANSFERS' && (
              <>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </>
            )}
            {activeTab === 'ADJUSTMENTS' && (
              <>
                <option value="ADDITION">Addition</option>
                <option value="DEDUCTION">Deduction</option>
              </>
            )}
          </Select>
        </div>
      </Card>

      <Card>
        <div className="border-b border-surface-200">
          <nav className="flex gap-4 px-4 overflow-x-auto" aria-label="Tabs">
            {['MOVEMENTS', 'TRANSFERS', 'ADJUSTMENTS'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setTypeFilter(''); }}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
                }`}
              >
                {tab === 'MOVEMENTS' && `All Movements (${filteredMovements.length})`}
                {tab === 'TRANSFERS' && `Transfers (${filteredTransfers.length})`}
                {tab === 'ADJUSTMENTS' && `Adjustments (${filteredAdjustments.length})`}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
             <Spinner size="lg" />
          </div>
        ) : (
          <div className="p-0">
            {activeTab === 'MOVEMENTS' && (
              <Table columns={movementColumns} data={filteredMovements} emptyMessage="No stock movements found." />
            )}
            {activeTab === 'TRANSFERS' && (
              <Table columns={transferColumns} data={filteredTransfers} emptyMessage="No transfers found." />
            )}
            {activeTab === 'ADJUSTMENTS' && (
              <Table columns={adjustmentColumns} data={filteredAdjustments} emptyMessage="No adjustments found." />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
