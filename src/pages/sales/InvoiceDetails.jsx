import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileText, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { getInvoiceById } from '../../services/invoiceService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import PrintInvoice from '../../components/sales/PrintInvoice';

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await getInvoiceById(id);
      if (data) {
        setInvoice(data);
      } else {
        navigate('/bills');
      }
    } catch (error) {
      console.error('Failed to load invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;
    
    // We clone the element so we can make it visible for the PDF generation, 
    // because html2pdf sometimes struggles with hidden elements or responsive classes.
    const opt = {
      margin:       10,
      filename:     `Invoice_${invoice.invoiceNumber}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (loading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!invoice) return null;

  const isPriceIncluded = invoice.mode === 'PRICE_INCLUDED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hide controls when printing */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" icon={<ArrowLeft className="w-5 h-5" />} onClick={() => navigate('/bills')} className="p-2"/>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">{invoice.invoiceNumber}</h1>
              <Badge variant={isPriceIncluded ? 'primary' : 'warning'}>
                {isPriceIncluded ? 'Standard Bill' : 'Quantity Only'}
              </Badge>
            </div>
            <p className="text-sm text-surface-500 mt-1">Generated on {formatDate(invoice.createdAt)}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Document
          </Button>
        </div>
      </div>

      {/* Screen View (Card wrapping the Print layout) */}
      <div className="print:hidden">
        <Card className="overflow-hidden border border-surface-200 shadow-sm">
          <div className="bg-surface-50 border-b border-surface-100 p-4 flex justify-between items-center text-sm font-medium text-surface-500">
            <span>Document Preview</span>
            <FileText className="w-4 h-4" />
          </div>
          {/* We render the print layout here as well, but inside a container */}
          <div className="p-4 bg-surface-200">
            <div className="bg-white shadow-lg mx-auto max-w-3xl overflow-x-auto">
              <PrintInvoice ref={printRef} invoice={invoice} />
            </div>
          </div>
        </Card>
      </div>

      {/* Actual Print View (Hidden on screen, visible on print) */}
      <div className="hidden print:block">
        <PrintInvoice invoice={invoice} />
      </div>
    </div>
  );
}
