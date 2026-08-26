import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, Button, Input, Select, Spinner, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getInvoices } from '../../services/invoiceService';
import { processSalesReturn } from '../../services/salesReturnService';

const RETURN_REASONS = [
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in Transit' },
  { value: 'DEFECTIVE', label: 'Defective / Not Working' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Delivered' },
  { value: 'CUSTOMER_CHANGED_MIND', label: 'Customer Changed Mind' },
  { value: 'OTHER', label: 'Other' }
];

export default function CreateReturnForm() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Return form state
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [returnQty, setReturnQty] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      // Only keep invoices that have returnable items (optional optimization)
      setInvoices(data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setSelectedItemIndex(null);
    setReturnQty('');
    setReason('');
    setNotes('');
  };

  const handleSelectItem = (index) => {
    const item = selectedInvoice.items[index];
    const previouslyReturned = item.returnedQuantity || 0;
    const maxReturnable = item.quantity - previouslyReturned;

    if (maxReturnable <= 0) {
      toast.error('This item has already been fully returned.');
      return;
    }

    setSelectedItemIndex(index);
    setReturnQty(1);
    setReason('');
    setNotes('');
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (selectedItemIndex === null) return;

    const item = selectedInvoice.items[selectedItemIndex];
    const previouslyReturned = item.returnedQuantity || 0;
    const maxReturnable = item.quantity - previouslyReturned;
    const qty = parseInt(returnQty, 10);

    if (isNaN(qty) || qty <= 0) {
      return toast.error('Please enter a valid quantity to return.');
    }
    if (qty > maxReturnable) {
      return toast.error(`Cannot return more than ${maxReturnable} items.`);
    }
    if (!reason) {
      return toast.error('Please select a reason for the return.');
    }

    const isConfirmed = await confirm({
      title: 'Confirm Sales Return',
      message: `Are you sure you want to return ${qty}x ${item.variantName} to ${selectedInvoice.branch} branch? This will increase branch stock.`,
      confirmText: 'Process Return',
      type: 'warning'
    });

    if (!isConfirmed) return;

    try {
      setIsSubmitting(true);
      toast.showLoading('Processing Return...');
      
      const returnData = {
        itemIndex: selectedItemIndex,
        returnQuantity: qty,
        reason,
        notes
      };

      const returnId = await processSalesReturn(selectedInvoice.id, returnData, userProfile);
      
      toast.success('Sales return processed successfully!');
      navigate(`/sales-returns/${returnId}`);
    } catch (error) {
      toast.error(error.message || 'Failed to process return.');
    } finally {
      setIsSubmitting(false);
      toast.hideLoading();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/sales-returns')}
        />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Process Sales Return</h1>
          <p className="text-sm text-slate-500">Return items to stock from an existing invoice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Invoice Selection */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-800">1. Select Invoice</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Search by Invoice No or Customer..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="h-[400px] overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                {loading ? (
                  <div className="flex justify-center p-4"><Spinner /></div>
                ) : filteredInvoices.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center p-4">No invoices found</p>
                ) : (
                  filteredInvoices.map(inv => (
                    <div 
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedInvoice?.id === inv.id 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800">{inv.invoiceNumber}</span>
                        <Badge variant="outline">{inv.branch}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{inv.customerName}</p>
                      <p className="text-xs text-slate-500">
                        {inv.items?.length || 0} items • {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Items & Return Form */}
        <div className="lg:col-span-7 space-y-6">
          {!selectedInvoice ? (
            <Card className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 border-dashed border-2">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Invoice Selected</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Search and select an invoice from the list to view its items and process a return.
              </p>
            </Card>
          ) : (
            <>
              {/* Items List */}
              <Card>
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h2 className="font-semibold text-slate-800">2. Select Item to Return</h2>
                  <span className="text-sm font-medium text-slate-500">Invoice: {selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {selectedInvoice.items.map((item, index) => {
                      const previouslyReturned = item.returnedQuantity || 0;
                      const maxReturnable = item.quantity - previouslyReturned;
                      const isFullyReturned = maxReturnable <= 0;
                      const isSelected = selectedItemIndex === index;

                      return (
                        <div 
                          key={index}
                          onClick={() => !isFullyReturned && handleSelectItem(index)}
                          className={`p-3 rounded-lg border transition-colors ${
                            isFullyReturned 
                              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'border-primary-500 bg-primary-50 cursor-pointer shadow-sm'
                                : 'border-slate-200 hover:border-primary-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-800">{item.productName}</p>
                              <p className="text-sm text-slate-600">Size/Variant: {item.variantName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-800">Sold: {item.quantity}</p>
                              {previouslyReturned > 0 && (
                                <p className="text-xs text-danger-600 font-semibold mt-0.5">
                                  Already Returned: {previouslyReturned}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {isFullyReturned && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-200/50 w-fit px-2 py-1 rounded">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Returned
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Return Form */}
              {selectedItemIndex !== null && (
                <Card className="border-primary-200 shadow-md">
                  <div className="p-4 border-b border-slate-100 bg-primary-50">
                    <h2 className="font-semibold text-primary-800">3. Return Details</h2>
                  </div>
                  <form onSubmit={handleSubmitReturn} className="p-4 space-y-4">
                    
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        You are returning <span className="font-bold">{selectedInvoice.items[selectedItemIndex].variantName}</span>. 
                        Max returnable quantity is <span className="font-bold">
                          {selectedInvoice.items[selectedItemIndex].quantity - (selectedInvoice.items[selectedItemIndex].returnedQuantity || 0)}
                        </span>.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Return Quantity"
                        type="number"
                        min="1"
                        max={selectedInvoice.items[selectedItemIndex].quantity - (selectedInvoice.items[selectedItemIndex].returnedQuantity || 0)}
                        required
                        value={returnQty}
                        onChange={(e) => setReturnQty(e.target.value)}
                      />
                      
                      <Select
                        label="Reason for Return"
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        options={[
                          { value: '', label: 'Select reason...' },
                          ...RETURN_REASONS
                        ]}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">Remarks / Notes</label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm placeholder-slate-400
                                 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        placeholder="Add any additional details..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button 
                        type="submit" 
                        variant="primary" 
                        loading={isSubmitting}
                      >
                        Confirm Return & Restock
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
