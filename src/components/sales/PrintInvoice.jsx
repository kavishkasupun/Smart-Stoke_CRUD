import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PrintInvoice = forwardRef(({ invoice, showLogo = true }, ref) => {
  if (!invoice) return null;

  const isPriceIncluded = invoice.mode === 'PRICE_INCLUDED';

  return (
    <div ref={ref} className="bg-white p-6 max-w-[148mm] mx-auto print:p-0 print:max-w-none text-surface-800 font-sans" id="invoice-print-container">
      <style>
        {`
          @media print {
            @page { size: A5 portrait; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}
      </style>
      {/* Header Section */}
      <div className="flex justify-between items-start border-b-2 border-danger-600 pb-4 mb-4">
        <div>
          {/* Logo & Company Info */}
          {showLogo && (
            <>
              <div className="mb-2">
                <img
                  src="/logo.png"
                  alt="SMART Electronics"
                  className="h-10 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden h-10 items-center">
                  <span className="text-lg font-black text-primary-700 tracking-tight">SMART</span>
                  <span className="text-lg font-bold text-surface-600 tracking-tight ml-1">Electronics</span>
                </div>
              </div>
              <div className="text-[10px] text-surface-600 space-y-0.5">
                <p>No.729, Negombo Road, Mabola, Wattala.</p>
                <p>Colombo, Sri Lanka</p>
                <p>Phone: +94 70 344 8445</p>
                <p>Email: smartmabola7@gmail.com</p>
              </div>
            </>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase tracking-widest text-surface-300">
            {isPriceIncluded ? 'INVOICE' : 'DISPATCH NOTE'}
          </h2>
          <div className="mt-3 space-y-1 text-[10px] text-surface-600">
            <p><span className="font-semibold w-16 inline-block text-surface-800">Invoice No:</span> <span className="font-bold text-surface-900">{invoice.invoiceNumber}</span></p>
            <p><span className="font-semibold w-16 inline-block text-surface-800">Date:</span> {formatDate(invoice.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Customer & Info Section */}
      <div className="mb-4">
        <div className="bg-surface-50 p-3 rounded-lg border border-surface-100 max-w-sm">
          <h3 className="text-[9px] font-bold text-danger-600 uppercase tracking-wider mb-1">Billed To</h3>
          <p className="text-sm font-bold text-surface-800">{invoice.customerName}</p>
          {invoice.customerId ? (
            <p className="text-[10px] text-surface-500 mt-0.5">Registered Customer</p>
          ) : (
            <p className="text-[10px] text-surface-500 mt-0.5">Walk-in Customer</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-4 overflow-hidden rounded-lg border border-surface-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-100 text-surface-700 text-[10px] uppercase tracking-wider">
              <th className="py-2 px-2 font-bold border-b border-surface-200">Item Details</th>
              <th className="py-2 px-2 font-bold text-center border-b border-surface-200">Qty</th>
              {isPriceIncluded && (
                <>
                  <th className="py-2 px-2 font-bold text-right border-b border-surface-200">Unit Price</th>
                  <th className="py-2 px-2 font-bold text-right border-b border-surface-200">Discount</th>
                  <th className="py-2 px-2 font-bold text-right border-b border-surface-200">Line Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-[10px] divide-y divide-surface-100">
            {invoice.items?.map((item, idx) => {
              const lineSub = item.quantity * item.unitPrice;
              const lineDisc = item.discountType === 'PERCENTAGE'
                ? lineSub * (item.discountValue / 100)
                : item.discountValue;
              const lineTotal = lineSub - lineDisc;

              return (
                <tr key={idx} className="hover:bg-surface-50 transition-colors">
                  <td className="py-2 px-2">
                    <p className="font-bold text-surface-800">{item.productName}</p>
                    {item.variantName && <p className="text-[9px] text-surface-500 mt-0.5">Size/Variant: {item.variantName}</p>}
                  </td>
                  <td className="py-2 px-2 text-center font-semibold text-surface-800">{item.quantity}</td>
                  {isPriceIncluded && (
                    <>
                      <td className="py-2 px-2 text-right text-surface-600">Rs. {item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-surface-600">
                        {item.discountValue > 0
                          ? (item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `Rs. ${item.discountValue}`)
                          : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-surface-800">Rs. {lineTotal.toFixed(2)}</td>
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
        <div className="flex justify-end mb-6">
          <div className="w-56 space-y-2">
            <div className="flex justify-between text-[10px] text-surface-600">
              <span className="font-medium">Subtotal</span>
              <span>Rs. {invoice.subTotal?.toFixed(2)}</span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between text-[10px] text-danger-600">
                <span className="font-medium">Total Discount</span>
                <span>- Rs. {invoice.totalDiscount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t-2 border-surface-200 pt-2 mt-2">
              <span className="font-black text-base text-surface-800">Grand Total</span>
              <span className="font-black text-lg text-danger-700">Rs. {invoice.grandTotal?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {invoice.notes && (
        <div className="mb-4">
          <h3 className="text-[9px] font-bold text-surface-400 uppercase tracking-wider mb-1">Remarks / Notes</h3>
          <p className="text-[10px] text-surface-600 bg-surface-50 p-3 rounded-lg border border-surface-100 whitespace-pre-wrap">
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-surface-200 text-center">
        <p className="font-bold text-surface-800 text-sm">Thank you for your business!</p>
        <p className="text-[9px] text-surface-500 mt-1">
          This is a computer-generated document. No signature is required.
        </p>
      </div>
    </div>
  );
});

export default PrintInvoice;
