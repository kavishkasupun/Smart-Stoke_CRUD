import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import { Card, Table, Badge, Input, Select, Button, Spinner, DateRangePicker } from '../../components/ui';
import { getSalesReportData } from '../../services/reportService';
import { useAuth } from '../../contexts/AuthContext';
import { BRANCHES } from '../../config/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function SalesReport() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ invoices: [], returns: [] });
  const [activeTab, setActiveTab] = useState('INVOICES');
  
  // Date Range
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  // Filters
  const [branchFilter, setBranchFilter] = useState('');
  const [discountFilter, setDiscountFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (userProfile.branchId && userProfile.branchId !== BRANCHES.GLOBAL) {
      setBranchFilter(userProfile.branchId);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const salesData = await getSalesReportData(startDate, endDate);
      setData(salesData);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return data.invoices.filter(inv => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!inv.invoiceNumber?.toLowerCase().includes(q) &&
            !inv.customerName?.toLowerCase().includes(q)) {
          return false;
        }
      }
      
      // Branch
      if (branchFilter && inv.branch !== branchFilter) return false;
      
      // Discount
      if (discountFilter === 'HAS_DISCOUNT' && (!inv.totalDiscount || inv.totalDiscount <= 0)) return false;
      if (discountFilter === 'NO_DISCOUNT' && inv.totalDiscount > 0) return false;
      
      return true;
    });
  }, [data.invoices, searchQuery, branchFilter, discountFilter]);

  const filteredReturns = useMemo(() => {
    return data.returns.filter(ret => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!ret.returnNumber?.toLowerCase().includes(q) &&
            !ret.invoiceNumber?.toLowerCase().includes(q) &&
            !ret.customerName?.toLowerCase().includes(q)) {
          return false;
        }
      }
      
      // Branch
      if (branchFilter && ret.branch !== branchFilter) return false;
      
      return true;
    });
  }, [data.returns, searchQuery, branchFilter]);

  const invoiceColumns = [
    { header: 'Invoice #', accessor: 'invoiceNumber', render: (val) => <span className="font-bold text-surface-900">{val}</span> },
    { header: 'Date', accessor: 'createdAt', render: (val) => formatDate(val, { includeTime: true }) },
    { header: 'Branch', accessor: 'branch', render: (val) => <Badge variant="info">{val}</Badge> },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Items', accessor: 'items', render: (val) => val?.length || 0 },
    { header: 'Subtotal', accessor: 'subTotal', render: (val) => formatCurrency(val) },
    { header: 'Discount', accessor: 'totalDiscount', render: (val) => <span className={val > 0 ? 'text-danger-600' : ''}>{formatCurrency(val)}</span> },
    { header: 'Total', accessor: 'grandTotal', render: (val) => <span className="font-bold text-surface-900">{formatCurrency(val)}</span> },
    { header: 'Billed By', accessor: 'createdBy', render: (val) => <span className="text-sm text-surface-500">{val || 'System'}</span> } // We should ideally show names, but IDs are stored.
  ];

  const returnColumns = [
    { header: 'Return #', accessor: 'returnNumber', render: (val) => <span className="font-bold text-surface-900">{val}</span> },
    { header: 'Date', accessor: 'createdAt', render: (val) => formatDate(val, { includeTime: true }) },
    { header: 'Branch', accessor: 'branch', render: (val) => <Badge variant="info">{val}</Badge> },
    { header: 'Invoice #', accessor: 'invoiceNumber' },
    { header: 'Product', accessor: 'variantName', render: (val, row) => <span className="text-sm">{row.productName} - {val}</span> },
    { header: 'Qty', accessor: 'returnQuantity', render: (val) => <span className="font-bold text-danger-600">{val}</span> },
    { header: 'Reason', accessor: 'reason', render: (val) => <Badge variant="warning">{val}</Badge> },
  ];

  const handleExportCSV = () => {
    const isInvoice = activeTab === 'INVOICES';
    const targetData = isInvoice ? filteredInvoices : filteredReturns;
    if (targetData.length === 0) return;

    let headers = [];
    let csvData = [];

    if (isInvoice) {
      headers = ['Invoice Number', 'Date', 'Branch', 'Customer', 'Items Count', 'Subtotal', 'Discount', 'Grand Total', 'Notes'];
      csvData = targetData.map(inv => [
        `"${inv.invoiceNumber}"`,
        `"${formatDate(inv.createdAt, { includeTime: true })}"`,
        `"${inv.branch}"`,
        `"${inv.customerName || ''}"`,
        inv.items?.length || 0,
        inv.subTotal || 0,
        inv.totalDiscount || 0,
        inv.grandTotal || 0,
        `"${inv.notes || ''}"`
      ].join(','));
    } else {
      headers = ['Return Number', 'Date', 'Branch', 'Invoice Number', 'Product', 'Variant', 'Return Qty', 'Unit Price', 'Reason', 'Notes'];
      csvData = targetData.map(ret => [
        `"${ret.returnNumber}"`,
        `"${formatDate(ret.createdAt, { includeTime: true })}"`,
        `"${ret.branch}"`,
        `"${ret.invoiceNumber}"`,
        `"${ret.productName}"`,
        `"${ret.variantName}"`,
        ret.returnQuantity,
        ret.unitPrice || 0,
        `"${ret.reason || ''}"`,
        `"${ret.notes || ''}"`
      ].join(','));
    }
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab.toLowerCase()}_report_${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Sales & Returns Report</h1>
          <p className="text-sm text-surface-500 mt-1">Detailed logs of all billed invoices and customer returns.</p>
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
          <Button onClick={handleExportCSV} variant="secondary" icon={<Download className="w-4 h-4" />}>
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
            disabled={userProfile.branchId !== BRANCHES.GLOBAL}
          >
            <option value="">All Branches</option>
            <option value="Mabola">Mabola</option>
            <option value="Jaffna">Jaffna</option>
          </Select>
        </div>
        {activeTab === 'INVOICES' && (
          <div className="w-full md:w-48">
            <Select 
              value={discountFilter}
              onChange={(e) => setDiscountFilter(e.target.value)}
            >
              <option value="">All Invoices</option>
              <option value="HAS_DISCOUNT">With Discounts</option>
              <option value="NO_DISCOUNT">No Discounts</option>
            </Select>
          </div>
        )}
      </Card>

      <Card>
        <div className="border-b border-surface-200">
          <nav className="flex gap-4 px-4" aria-label="Tabs">
            {['INVOICES', 'RETURNS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
                }`}
              >
                {tab === 'INVOICES' ? `Sales / Invoices (${filteredInvoices.length})` : `Returns (${filteredReturns.length})`}
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
            {activeTab === 'INVOICES' ? (
              <Table 
                columns={invoiceColumns}
                data={filteredInvoices}
                emptyMessage="No invoices found matching your filters."
              />
            ) : (
              <Table 
                columns={returnColumns}
                data={filteredReturns}
                emptyMessage="No returns found matching your filters."
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
