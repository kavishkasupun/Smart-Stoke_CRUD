import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, FileText, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Activity } from 'lucide-react';
import { Card, Table, Badge, Select, Button, Spinner, DateRangePicker } from '../../components/ui';
import { getProductStockHistory } from '../../services/stockHistoryService';
import { getProducts, getProductVariants } from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';
import { BRANCHES } from '../../config/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '../../utils/formatters';
import { TransactionDetailsModal } from '../../components/transactions/TransactionDetailsModal';
import html2pdf from 'html2pdf.js';

export default function ProductStockHistory() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const contentRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  
  // Filters
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(userProfile?.branchId !== 'all' ? userProfile.branchId : 'all');
  
  // Dates
  const [dateRangePreset, setDateRangePreset] = useState('this-month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  
  // Data
  const [reportData, setReportData] = useState(null);
  const [modalTx, setModalTx] = useState({ isOpen: false, id: null, type: null });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [p, v] = await Promise.all([getProducts(), getProductVariants()]);
      setProducts(p.filter(prod => prod.active !== false)); // Only active products
      setVariants(v);
    } catch (error) {
      console.error('Failed to load products/variants:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      fetchReport();
    } else {
      setReportData(null);
    }
  }, [selectedProductId, selectedVariantId, selectedBranch, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getProductStockHistory(
        selectedProductId,
        selectedVariantId || null,
        selectedBranch,
        startDate,
        endDate
      );
      setReportData(data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePresetChange = (preset) => {
    setDateRangePreset(preset);
    const now = new Date();
    switch (preset) {
      case 'today':
        setStartDate(now);
        setEndDate(now);
        break;
      case 'yesterday':
        setStartDate(subDays(now, 1));
        setEndDate(subDays(now, 1));
        break;
      case 'this-week':
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'last-week':
        setStartDate(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
        setEndDate(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
        break;
      case 'this-month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'last-month':
        setStartDate(startOfMonth(subMonths(now, 1)));
        setEndDate(endOfMonth(subMonths(now, 1)));
        break;
      case 'custom':
        break;
      default:
        break;
    }
  };

  const handleProductChange = (e) => {
    const pid = e.target.value;
    setSelectedProductId(pid);
    setSelectedVariantId(''); // reset variant
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const availableVariants = variants.filter(v => v.productId === selectedProductId);
  
  const handleExportCSV = () => {
    if (!reportData || reportData.movements.length === 0) return;
    
    const headers = ['Date', 'Time', 'Type', 'Branch', 'Ref ID', 'Before Qty', 'Movement', 'After Qty'];
    const csvData = reportData.movements.map(m => [
      new Date(m.timestamp).toLocaleDateString(),
      new Date(m.timestamp).toLocaleTimeString(),
      m.type || m.movementType,
      m.branch,
      m.referenceId || '',
      m.computedBefore,
      m.quantity,
      m.computedAfter
    ].join(','));
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock_history_${selectedProduct?.name || 'export'}_${new Date().getTime()}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const element = contentRef.current;
    if (!element) return;
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `stock_history_${selectedProduct?.name || 'export'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        windowWidth: 1200,
        width: 1200
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const getReferenceLink = (refId) => {
    if (!refId) return '#';
    if (refId.startsWith('REC-')) return `/stock-receiving/${refId}`;
    if (refId.startsWith('BILL-') || refId.startsWith('INV-')) return `/bills/${refId}`;
    if (refId.startsWith('TRF-')) return `/stock-transfers/${refId}`;
    if (refId.startsWith('MFG-')) return `/manufacturing/${refId}`;
    if (refId.startsWith('ADJ-')) return `/adjustments/${refId}`;
    return '#';
  };

  const columns = [
    { 
      header: 'Date & Time', 
      accessor: 'timestamp',
      render: (val) => (
        <div>
          <div className="font-medium text-surface-900">{new Date(val).toLocaleDateString()}</div>
          <div className="text-xs text-surface-500">{new Date(val).toLocaleTimeString()}</div>
        </div>
      )
    },
    { 
      header: 'Type', 
      accessor: 'type',
      render: (val, row) => {
        const t = val || row.movementType;
        let color = 'default';
        let icon = <Activity className="w-3 h-3 mr-1 inline" />;
        
        if (t?.includes('RECEIVE') || t?.includes('IN') || t?.includes('FINISHED_RECEIPT') || t?.includes('RETURN')) {
          color = 'success';
          icon = <ArrowDownToLine className="w-3 h-3 mr-1 inline" />;
        }
        else if (t?.includes('SALE') || t?.includes('OUT') || t?.includes('CONSUMPTION')) {
          color = 'primary';
          icon = <ArrowUpFromLine className="w-3 h-3 mr-1 inline" />;
        }
        else if (t?.includes('ADJUSTMENT')) {
          color = 'warning';
          icon = <ArrowLeftRight className="w-3 h-3 mr-1 inline" />;
        }
        else if (t?.includes('DAMAGE') || t?.includes('WASTAGE')) {
          color = 'danger';
          icon = <ArrowUpFromLine className="w-3 h-3 mr-1 inline" />;
        }
        
        return (
          <Badge variant={color} className="whitespace-nowrap">
            {icon}
            {t?.replace(/_/g, ' ')}
          </Badge>
        );
      }
    },
    { header: 'Branch', accessor: 'branch', render: (val) => <span className="capitalize">{val}</span> },
    { 
      header: 'Reference', 
      accessor: 'referenceId',
      render: (val, row) => {
        if (!val) return '—';
        
        const type = row.type || row.movementType;
        const isSaleRelated = type === 'SALE' || type === 'BILLING' || type === 'SALE_RETURN';
        
        if (isSaleRelated) {
          return (
            <button 
              onClick={() => setModalTx({ isOpen: true, id: val, type: type === 'SALE_RETURN' ? 'SALE_RETURN' : 'SALE' })}
              className="text-primary-600 hover:underline font-medium text-left"
            >
              {row.referenceNumber || val}
            </button>
          );
        }

        const link = getReferenceLink(val);
        return link !== '#' ? (
          <a href={link} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline font-medium">
            {val}
          </a>
        ) : (
          <span className="font-medium text-surface-700">{val}</span>
        );
      }
    },
    { header: 'Before', accessor: 'computedBefore', render: (val) => <span className="text-surface-600">{val}</span> },
    { 
      header: 'Qty', 
      accessor: 'quantity',
      render: (val) => (
        <span className={`font-bold ${val > 0 ? 'text-success-600' : val < 0 ? 'text-danger-600' : 'text-surface-600'}`}>
          {val > 0 ? `+${val}` : val}
        </span>
      )
    },
    { header: 'After', accessor: 'computedAfter', render: (val) => <span className="font-bold text-surface-900">{val}</span> },
  ];

  if (initialLoading) return <div className="p-12 text-center"><Spinner size="lg" /></div>;

  const chartData = reportData ? [
    { name: 'Opening', amount: reportData.openingStock, fill: '#94a3b8' },
    { name: 'Received', amount: reportData.summary.received, fill: '#10b981' },
    { name: 'Produced', amount: reportData.summary.produced, fill: '#3b82f6' },
    { name: 'Transfers In', amount: reportData.summary.transferredIn, fill: '#6366f1' },
    { name: 'Sales', amount: -reportData.summary.sold, fill: '#f59e0b' },
    { name: 'Consumed', amount: -reportData.summary.consumed, fill: '#ef4444' },
    { name: 'Transfers Out', amount: -reportData.summary.transferredOut, fill: '#d946ef' },
    { name: 'Adjustments', amount: reportData.summary.adjusted, fill: '#8b5cf6' },
    { name: 'Closing', amount: reportData.closingStock, fill: '#0f172a' }
  ].filter(item => item.amount !== 0 || item.name === 'Opening' || item.name === 'Closing') : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Product Stock History</h1>
          <p className="text-sm text-surface-500 mt-1">Trace stock movements chronologically.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" icon={<FileText className="w-4 h-4" />} disabled={!reportData}>
            CSV
          </Button>
          <Button onClick={handleExportPDF} variant="secondary" icon={<Download className="w-4 h-4" />} disabled={!reportData}>
            PDF
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-surface-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-surface-600 uppercase">Product</label>
            <Select value={selectedProductId} onChange={handleProductChange}>
              <option value="">Select a Product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
              ))}
            </Select>
          </div>
          
          {selectedProduct?.hasVariants && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-surface-600 uppercase">Variant</label>
              <Select value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}>
                <option value="">All Variants</option>
                {availableVariants.map(v => (
                  <option key={v.id} value={v.id}>{v.name} {v.size ? `(${v.size})` : ''}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-surface-600 uppercase">Branch</label>
            <Select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={userProfile?.branchId !== 'all'}
            >
              <option value="all">All Branches</option>
              <option value="mabola">Mabola</option>
              <option value="jaffna">Jaffna</option>
            </Select>
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-semibold text-surface-600 uppercase">Date Filter</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={dateRangePreset} onChange={(e) => handleDatePresetChange(e.target.value)} className="w-40">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This Week</option>
                <option value="last-week">Last Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="custom">Custom Range</option>
              </Select>
              {dateRangePreset === 'custom' && (
                <DateRangePicker 
                  startDate={startDate}
                  endDate={endDate}
                  onStartChange={setStartDate}
                  onEndChange={setEndDate}
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      {!selectedProductId ? (
        <Card className="p-12 text-center text-surface-500">
          <Filter className="w-12 h-12 mx-auto mb-4 text-surface-300" />
          Select a product to view its stock history.
        </Card>
      ) : loading ? (
        <Card className="p-12 flex justify-center"><Spinner size="lg" /></Card>
      ) : reportData ? (
        <div ref={contentRef} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card className="p-4 bg-surface-100 text-center">
              <div className="text-xs text-surface-500 uppercase font-semibold">Opening</div>
              <div className="text-xl font-bold text-surface-900 mt-1">{reportData.openingStock}</div>
            </Card>
            <Card className="p-4 bg-success-50 text-center border border-success-100">
              <div className="text-xs text-success-600 uppercase font-semibold">In (Recv/Prod)</div>
              <div className="text-xl font-bold text-success-700 mt-1">+{reportData.summary.received + reportData.summary.produced}</div>
            </Card>
            <Card className="p-4 bg-danger-50 text-center border border-danger-100">
              <div className="text-xs text-danger-600 uppercase font-semibold">Out (Sold/Cons)</div>
              <div className="text-xl font-bold text-danger-700 mt-1">-{reportData.summary.sold + reportData.summary.consumed}</div>
            </Card>
            <Card className="p-4 bg-primary-50 text-center border border-primary-100">
              <div className="text-xs text-primary-600 uppercase font-semibold">Transferred</div>
              <div className="text-xl font-bold text-primary-700 mt-1">{reportData.summary.transferredIn - reportData.summary.transferredOut > 0 ? '+' : ''}{reportData.summary.transferredIn - reportData.summary.transferredOut}</div>
            </Card>
            <Card className="p-4 bg-warning-50 text-center border border-warning-100 lg:col-span-2">
              <div className="text-xs text-warning-600 uppercase font-semibold">Adjusted</div>
              <div className="text-xl font-bold text-warning-700 mt-1">{reportData.summary.adjusted > 0 ? '+' : ''}{reportData.summary.adjusted}</div>
            </Card>
            <Card className="p-4 bg-surface-900 text-center lg:col-span-2 text-white shadow-md">
              <div className="text-xs text-surface-300 uppercase font-semibold">Closing Balance</div>
              <div className="text-2xl font-bold mt-1">{reportData.closingStock}</div>
            </Card>
          </div>

          {reportData.salesSummary && (
            <Card className="p-4 bg-primary-50 border border-primary-100 mb-6">
              <h3 className="text-sm font-bold text-primary-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Sales Summary for Period
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                  <div className="text-xs text-surface-500 uppercase font-semibold">Units Sold</div>
                  <div className="text-lg font-bold text-surface-900 mt-1">{reportData.salesSummary.totalUnitsSold}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                  <div className="text-xs text-surface-500 uppercase font-semibold">Total Bills</div>
                  <div className="text-lg font-bold text-surface-900 mt-1">{reportData.salesSummary.numberOfBills}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                  <div className="text-xs text-surface-500 uppercase font-semibold">Sales Value</div>
                  <div className="text-lg font-bold text-primary-700 mt-1">{formatCurrency(reportData.salesSummary.totalSalesValue)}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                  <div className="text-xs text-surface-500 uppercase font-semibold">Discounts</div>
                  <div className="text-lg font-bold text-danger-600 mt-1">{formatCurrency(reportData.salesSummary.totalDiscounts)}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-primary-100 shadow-sm text-center">
                  <div className="text-xs text-surface-500 uppercase font-semibold">Avg Selling Price</div>
                  <div className="text-lg font-bold text-success-700 mt-1">{formatCurrency(reportData.salesSummary.averageSellingPrice)}</div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-4 lg:col-span-1">
              <h3 className="text-sm font-bold text-surface-900 mb-4">Stock Flow</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <div className="p-4 border-b border-surface-200">
                <h3 className="text-lg font-bold text-surface-900">Transaction History</h3>
                <p className="text-xs text-surface-500">Chronological list of movements for the selected period.</p>
              </div>
              <Table 
                columns={columns}
                data={reportData.movements}
                emptyMessage="No transactions found for the selected period."
              />
            </Card>
          </div>
        </div>
      ) : null}

      <TransactionDetailsModal
        isOpen={modalTx.isOpen}
        onClose={() => setModalTx({ isOpen: false, id: null, type: null })}
        transactionId={modalTx.id}
        transactionType={modalTx.type}
        highlightProductId={selectedProductId}
        highlightVariantId={selectedVariantId || null}
      />
    </div>
  );
}
