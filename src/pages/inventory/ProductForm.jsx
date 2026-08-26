import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getProductById, addProduct, updateProduct } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { useToast } from '../../contexts/ToastContext';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const toast = useToast();
  
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    brand: '',
    description: '',
    active: true
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      // Always fetch categories for the dropdown (only active ones)
      const cats = await getCategories(true);
      setCategories(cats);

      if (isEditMode) {
        setLoading(true);
        const product = await getProductById(id);
        if (product) {
          setFormData({
            name: product.name || '',
            categoryId: product.categoryId || '',
            brand: product.brand || '',
            description: product.description || '',
            active: product.active
          });
        } else {
          setError('Product not found');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.categoryId) {
      setError('Name and Category are required');
      toast.error('Name and Category are required');
      return;
    }
    
    if (!userProfile?.id) {
      setError('User not fully authenticated');
      toast.error('Authentication error. Please try again.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      toast.showLoading(isEditMode ? 'Updating Product...' : 'Creating Product...');

      if (isEditMode) {
        await updateProduct(id, formData, userProfile.id);
        toast.success('Product updated successfully!');
        navigate(`/products/${id}`);
      } else {
        const newProduct = await addProduct(formData, userProfile.id);
        toast.success('Product added successfully!');
        // After creating a product, immediately take them to details page to add variants
        navigate(`/products/${newProduct.id}`);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save product');
      toast.error('Failed to save product. Please try again.');
    } finally {
      setSubmitting(false);
      toast.hideLoading();
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-surface-500">Loading product...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/products')}
          className="p-2"
        />
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEditMode ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            {isEditMode ? 'Update product details' : 'Create a new base product to add variants to'}
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-danger-50 text-danger-700 rounded-lg border border-danger-100 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Product Name"
              placeholder="e.g. LED Bulb"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={submitting}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-700">
                Category <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  disabled={submitting}
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:bg-surface-50 disabled:text-surface-500 appearance-none"
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-surface-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                </div>
              </div>
            </div>

            <Input
              label="Brand (Optional)"
              placeholder="e.g. Philips"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-700">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={submitting}
              rows={4}
              className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:bg-surface-50 disabled:text-surface-500 resize-none"
              placeholder="Enter product description..."
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="active-toggle"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500"
              disabled={submitting}
            />
            <label htmlFor="active-toggle" className="text-sm font-medium text-surface-700">
              Product is active and visible
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditMode ? `/products/${id}` : '/products')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              icon={<Save className="w-4 h-4" />}
              isLoading={submitting}
              disabled={submitting || !formData.name.trim() || !formData.categoryId}
            >
              {isEditMode ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
