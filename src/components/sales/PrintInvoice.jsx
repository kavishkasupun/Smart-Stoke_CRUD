import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PrintInvoice = forwardRef(({ invoice }, ref) => {
  if (!invoice) return null;

  const isPriceIncluded = invoice.mode === 'PRICE_INCLUDED';

  return (
    <div ref={ref} className="bg-white p-10 max-w-4xl mx-auto print:p-4 text-surface-800 font-sans" id="invoice-print-container">
      {/* Header Section */}
      <div className="flex justify-between items-start border-b-4 border-danger-600 pb-6 mb-8">
        <div>
          {/* Logo & Company Info */}
          <img src="/logo.png" alt="SMART Electronics" className="h-16 object-contain mb-3" />
          <div className="text-sm text-surface-600 space-y-1">
            <p>123 Business Road, Suite 100</p>
            <p>Colombo, Sri Lanka</p>
            <p>Phone: +94 77 123 4567</p>
            <p>Email: contact@smartstoke.lk</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase tracking-widest text-surface-300">
            {isPriceIncluded ? 'INVOICE' : 'DISPATCH NOTE'}
          </h2>
          <div className="mt-6 space-y-2 text-sm text-surface-600">
            <p><span className="font-semibold w-24 inline-block text-surface-800">Invoice No:</span> <span className="font-bold text-surface-900">{invoice.invoiceNumber}</span></p>
            <p><span className="font-semibold w-24 inline-block text-surface-800">Date:</span> {formatDate(invoice.createdAt)}</p>
            <p><span className="font-semibold w-24 inline-block text-surface-800">Branch:</span> <span className="capitalize">{invoice.branch}</span></p>
          </div>
        </div>
      </div>

      {/* Customer & Info Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-surface-50 p-4 rounded-lg border border-surface-100">
          <h3 className="text-xs font-bold text-danger-600 uppercase tracking-wider mb-2">Billed To</h3>
          <p className="text-lg font-bold text-surface-800">{invoice.customerName}</p>
          {invoice.customerId ? (
            <p className="text-sm text-surface-500 mt-1">Registered Customer</p>
          ) : (
            <p className="text-sm text-surface-500 mt-1">Walk-in Customer</p>
          )}
        </div>
        
        {!isPriceIncluded && (
          <div className="bg-warning-50 p-4 rounded-lg border border-warning-200 flex items-center">
            <p className="text-warning-800 text-sm font-medium">
              <span className="font-bold text-warning-900 block mb-1">Notice:</span>
              This document is a dispatch note. Financial values (prices, discounts, and totals) were not specified at the time of creation.
            </p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="mb-8 overflow-hidden rounded-lg border border-surface-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-100 text-surface-700 text-sm uppercase tracking-wider">
              <th className="py-3 px-4 font-bold border-b border-surface-200">Item Details</th>
              <th className="py-3 px-4 font-bold text-center border-b border-surface-200">Qty</th>
              {isPriceIncluded && (
                <>
                  <th className="py-3 px-4 font-bold text-right border-b border-surface-200">Unit Price</th>
                  <th className="py-3 px-4 font-bold text-right border-b border-surface-200">Discount</th>
                  <th className="py-3 px-4 font-bold text-right border-b border-surface-200">Line Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-surface-100">
            {invoice.items?.map((item, idx) => {
              const lineSub = item.quantity * item.unitPrice;
              const lineDisc = item.discountType === 'PERCENTAGE' 
                ? lineSub * (item.discountValue / 100) 
                : item.discountValue;
              const lineTotal = lineSub - lineDisc;

              return (
                <tr key={idx} className="hover:bg-surface-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-surface-800">{item.productName}</p>
                    <p className="text-xs text-surface-500 mt-0.5">Size/Variant: {item.variantName}</p>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-surface-800">{item.quantity}</td>
                  {isPriceIncluded && (
                    <>
                      <td className="py-3 px-4 text-right text-surface-600">Rs. {item.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-surface-600">
                        {item.discountValue > 0 
                          ? (item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `Rs. ${item.discountValue}`)
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-surface-800">Rs. {lineTotal.toFixed(2)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      {isPriceIncluded && (
        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-3">
            <div className="flex justify-between text-sm text-surface-600">
              <span className="font-medium">Subtotal</span>
              <span>Rs. {invoice.subTotal?.toFixed(2)}</span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-danger-600">
                <span className="font-medium">Total Discount</span>
                <span>- Rs. {invoice.totalDiscount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t-2 border-surface-200 pt-3 mt-3">
              <span className="font-black text-lg text-surface-800">Grand Total</span>
              <span className="font-black text-xl text-danger-700">Rs. {invoice.grandTotal?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {invoice.notes && (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">Remarks / Notes</h3>
          <p className="text-sm text-surface-600 bg-surface-50 p-4 rounded-lg border border-surface-100 whitespace-pre-wrap">
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-surface-200 text-center">
        <p className="font-bold text-surface-800 text-lg">Thank you for your business!</p>
        <p className="text-xs text-surface-500 mt-2">
          This is a computer-generated document. No signature is required.
        </p>
      </div>
    </div>
  );
});

export default PrintInvoice;
