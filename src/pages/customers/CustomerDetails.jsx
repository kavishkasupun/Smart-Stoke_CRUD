import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, User, Building2, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { Card, Button, Badge, Spinner } from '../../components/ui';
import { getCustomerById } from '../../services/customerService';

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const data = await getCustomerById(id);
      if (data) {
        setCustomer(data);
      } else {
        navigate('/customers');
      }
    } catch (error) {
      console.error('Failed to load customer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  }

  if (!customer) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            icon={<ArrowLeft className="w-5 h-5" />} 
            onClick={() => navigate('/customers')}
            className="p-2"
          />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
                {customer.name}
                {customer.active 
                  ? <Badge variant="success">Active</Badge> 
                  : <Badge variant="surface">Inactive</Badge>
                }
              </h1>
              <p className="text-sm font-mono text-surface-500 mt-1">{customer.customerCode}</p>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate(`/customers/${customer.id}/edit`)} 
          icon={<Edit2 className="w-4 h-4" />}
        >
          Edit Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-4">Contact Information</h2>
            
            <div className="space-y-4">
              {customer.companyName && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-surface-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-surface-500">Company</p>
                    <p className="font-medium text-surface-900">{customer.companyName}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500">Phone</p>
                  <p className="font-medium text-surface-900">{customer.phone || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500">Email</p>
                  <p className="font-medium text-surface-900">{customer.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500">Address</p>
                  <p className="font-medium text-surface-900 whitespace-pre-wrap">{customer.address || '-'}</p>
                </div>
              </div>
            </div>
          </Card>

          {customer.notes && (
            <Card className="p-6 bg-surface-50 border-l-4 border-l-primary-500">
              <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-2">Internal Notes</h2>
              <p className="text-sm text-surface-700 whitespace-pre-wrap">{customer.notes}</p>
            </Card>
          )}
        </div>

        {/* Right Column: Invoice History (Placeholder) */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <div className="p-6 border-b border-surface-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-surface-900">Invoice History</h2>
              <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>
                Create Invoice
              </Button>
            </div>
            
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Billing integration pending</h3>
              <p className="text-surface-500 max-w-sm mx-auto">
                Once the billing and POS module is completed, you will be able to see all invoices, pending payments, and payment history for this customer right here.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
