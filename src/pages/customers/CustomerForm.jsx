import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User } from 'lucide-react';
import { Card, Button, Input, Spinner } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getCustomerById, addCustomer, updateCustomer } from '../../services/customerService';

export default function CustomerForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    companyName: '',
    notes: '',
    active: true
  });

  useEffect(() => {
    if (isEditMode) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const data = await getCustomerById(id);
      if (data) {
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          companyName: data.companyName || '',
          notes: data.notes || '',
          active: data.active !== undefined ? data.active : true
        });
      } else {
        toast.error('Customer not found');
        navigate('/customers');
      }
    } catch (error) {
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Customer name is required');
      return;
    }

    const actionText = isEditMode ? 'update' : 'add';
    const isConfirmed = await confirm({
      title: `${isEditMode ? 'Update' : 'Add'} Customer`,
      message: `Are you sure you want to ${actionText} this customer?`,
      confirmText: isEditMode ? 'Save Changes' : 'Add Customer'
    });

    if (!isConfirmed) return;

    try {
      setSubmitting(true);
      if (isEditMode) {
        await updateCustomer(id, formData, userProfile.id);
        toast.success('Customer updated successfully');
      } else {
        await addCustomer(formData, userProfile.id);
        toast.success('Customer added successfully');
      }
      navigate('/customers');
    } catch (error) {
      toast.error(`Failed to ${actionText} customer`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/customers')}
          className="p-2"
        />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              {isEditMode ? 'Edit Customer' : 'Add New Customer'}
            </h1>
            <p className="text-sm text-surface-500 mt-1">
              {isEditMode ? 'Update customer details' : 'Register a new customer profile'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name *"
              name="name"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={handleChange}
              required
            />
            
            <Input
              label="Company Name"
              name="companyName"
              placeholder="e.g. ABC Holdings"
              value={formData.companyName}
              onChange={handleChange}
            />

            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="e.g. +94 77 123 4567"
              value={formData.phone}
              onChange={handleChange}
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="e.g. john@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <Input
            label="Physical Address"
            name="address"
            placeholder="Full mailing or shipping address"
            value={formData.address}
            onChange={handleChange}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Internal Notes</label>
            <textarea
              name="notes"
              rows="3"
              className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Any special requirements, preferences, etc."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-lg border border-surface-200 mt-4">
            <input
              type="checkbox"
              id="active"
              name="active"
              className="w-5 h-5 text-primary-600 rounded border-surface-300 focus:ring-primary-500"
              checked={formData.active}
              onChange={handleChange}
            />
            <div>
              <label htmlFor="active" className="font-semibold text-surface-900 cursor-pointer">Active Customer</label>
              <p className="text-sm text-surface-500">Uncheck to disable this customer profile.</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/customers')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={submitting} 
            icon={<Save className="w-4 h-4" />}
          >
            {isEditMode ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
