import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { Badge, Button, Spinner } from '../ui';
import { getInvoiceById, uploadInvoicePDF } from '../../services/invoiceService';
import { getSalesReturnById } from '../../services/salesReturnService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import html2pdf from 'html2pdf.js';

export const TransactionDetailsModal = ({ 
  isOpen, 
  onClose, 
  transactionId, 
  transactionType, // 'SALE', 'SALE_RETURN'
  highlightProductId, 
  highlightVariantId 
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransactionDetails();
    } else {
      setData(null);
    }
  }, [isOpen, transactionId, transactionType]);

  const fetchTransactionDetails = async () => {
    setLoading(true);
    try {
      if (transactionType === 'SALE') {
        const invoice = await getInvoiceById(transactionId);
        setData(invoice);
      } else if (transactionType === 'SALE_RETURN') {
        const salesReturn = await getSalesReturnById(transactionId);
        setData(salesReturn);
      }
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPdf = async () => {
    if (!data) return;
    
    // If PDF already exists, just open it
    if (data.pdfUrl) {
      window.open(data.pdfUrl, '_blank');
      return;
    }

    // Otherwise, generate it
    if (!contentRef.current) return;
    
    setPdfGenerating(true);
    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${transactionType.toLowerCase()}_${transactionId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate blob instead of saving directly
      const pdfBlob = await html2pdf().set(opt).from(contentRef.current).output('blob');
      
      // Upload to Firebase
      if (transactionType === 'SALE') {
        const url = await uploadInvoicePDF(transactionId, pdfBlob);
        // Open the uploaded PDF
        window.open(url, '_blank');
        // Update local state so it doesn't regenerate if clicked again
        setData(prev => ({ ...prev, pdfUrl: url }));
      } else {
        // If it's a return and doesn't have an upload function yet, just save it locally
        html2pdf().set(opt).from(contentRef.current).save();
      }
      
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. See console for details.');
    } finally {
      setPdfGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50">
          <div>
            <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              {transactionType === 'SALE' ? 'Sale Details' : 'Sale Return Details'}
            </h2>
            {data && (
              <p className="text-sm text-surface-500 mt-1">
                Ref: {transactionType === 'SALE' ? data.invoiceNumber : data.returnNumber}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <Button 
                onClick={handleViewPdf} 
                variant="secondary" 
                size="sm"
                icon={<Download className="w-4 h-4" />}
                loading={pdfGenerating}
              >
                {data.pdfUrl ? 'View Bill PDF' : 'Generate & View PDF'}
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-64 text-surface-500">
              Transaction not found or could not be loaded.
            </div>
          ) : (
            <div ref={contentRef} className="space-y-8 bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-surface-100">
                <div>
                  <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1 block">Date</label>
                  <p className="font-medium text-surface-900">{formatDate(data.createdAt, { includeTime: true })}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1 block">Branch</label>
                  <p className="font-medium text-surface-900 capitalize">{data.branch}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1 block">Customer</label>
                  <p className="font-medium text-surface-900">{data.customerName || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1 block">Status</label>
                  <Badge variant={data.status === 'COMPLETED' ? 'success' : 'warning'}>{data.status}</Badge>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-bold text-surface-900 mb-4 uppercase tracking-wider">
                  {transactionType === 'SALE' ? 'Billed Items' : 'Returned Item'}
                </h3>
                <div className="border border-surface-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-50 border-b border-surface-200 text-surface-600 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        {transactionType === 'SALE' && <th className="px-4 py-3 text-right">Discount</th>}
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 bg-white">
                      {transactionType === 'SALE' ? (
                        (data.items || []).map((item, idx) => {
                          const isHighlighted = item.productId === highlightProductId && (!highlightVariantId || item.variantId === highlightVariantId);
                          return (
                            <tr key={idx} className={isHighlighted ? 'bg-warning-50' : 'hover:bg-surface-50/50'}>
                              <td className="px-4 py-3">
                                <div className="font-medium text-surface-900">{item.productName}</div>
                                {item.variantName && <div className="text-xs text-surface-500">{item.variantName}</div>}
                                {isHighlighted && <Badge variant="warning" className="mt-1">Selected in Report</Badge>}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{item.quantity}</td>
                              <td className="px-4 py-3 text-right text-surface-600">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-3 text-right text-surface-600">{formatCurrency(item.discount || 0)}</td>
                              <td className="px-4 py-3 text-right font-bold text-surface-900">
                                {formatCurrency((item.quantity * item.unitPrice) - (item.discount || 0))}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr className="bg-warning-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-surface-900">{data.productName}</div>
                            {data.variantName && <div className="text-xs text-surface-500">{data.variantName}</div>}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-danger-600">{data.returnQuantity}</td>
                          <td className="px-4 py-3 text-right text-surface-600">{formatCurrency(data.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-bold text-surface-900">
                            {formatCurrency(data.returnQuantity * data.unitPrice)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              {transactionType === 'SALE' && (
                <div className="flex justify-end pt-6 border-t border-surface-200">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-600">Subtotal:</span>
                      <span className="font-medium text-surface-900">{formatCurrency(data.subTotal)}</span>
                    </div>
                    {data.totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-danger-600">
                        <span>Total Discount:</span>
                        <span className="font-medium">-{formatCurrency(data.totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-surface-900 pt-3 border-t border-surface-200">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(data.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Audit Info */}
              <div className="pt-6 mt-6 border-t border-surface-100 flex gap-6 text-xs text-surface-400">
                <div>
                  <span className="font-semibold block mb-0.5">Created By</span>
                  {data.createdBy || 'System'}
                </div>
                {data.notes && (
                  <div>
                    <span className="font-semibold block mb-0.5">Notes</span>
                    {data.notes}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
