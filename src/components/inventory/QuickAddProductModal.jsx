import { useState, useEffect } from 'react';
import { PackagePlus, Plus, Check, FolderPlus, Layers, Tag } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { addProduct, addVariant } from '../../services/productService';
import { getCategories, addCategory } from '../../services/categoryService';

export default function QuickAddProductModal({ isOpen, onClose, onSuccess, initialName = '' }) {
  const { userProfile } = useAuth();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inline new category state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: initialName || '',
    categoryId: '',
    brand: '',
    productType: 'FINISHED_PRODUCT',
    hasVariants: false,
    // Non-variant fields
    sku: '',
    barcode: '',
    costPrice: '',
    sellingPrice: '',
    reorderLevel: '',
    // Initial variant fields (if hasVariants = true)
    variantName: 'Default',
    variantSize: '',
    variantSku: '',
    variantBarcode: '',
    variantCostPrice: '',
    variantSellingPrice: '',
    variantReorderLevel: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      // Reset form
      setFormData({
        name: initialName || '',
        categoryId: '',
        brand: '',
        productType: 'FINISHED_PRODUCT',
        hasVariants: false,
        sku: '',
        barcode: '',
        costPrice: '',
        sellingPrice: '',
        reorderLevel: '',
        variantName: 'Default',
        variantSize: '',
        variantSku: '',
        variantBarcode: '',
        variantCostPrice: '',
        variantSellingPrice: '',
        variantReorderLevel: ''
      });
      setShowNewCategory(false);
      setNewCategoryName('');
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const cats = await getCategories(true);
      setCategories(cats);
      if (cats.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: cats[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      setAddingCategory(true);
      const newCat = await addCategory({ name: newCategoryName.trim() }, userProfile?.id || 'system');
      setCategories(prev => [...prev, newCat]);
      setFormData(prev => ({ ...prev, categoryId: newCat.id }));
      setShowNewCategory(false);
      setNewCategoryName('');
      toast.success(`Category "${newCat.name}" added successfully!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create category');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.categoryId) {
      toast.error('Please select or create a category');
      return;
    }

    if (!userProfile?.id) {
      toast.error('User authentication error. Please refresh and try again.');
      return;
    }

    try {
      setSubmitting(true);
      let newProduct;
      let newVariant = null;

      if (!formData.hasVariants) {
        // Single Product (No Variants)
        newProduct = await addProduct({
          name: formData.name.trim(),
          categoryId: formData.categoryId,
          brand: formData.brand.trim(),
          productType: formData.productType,
          hasVariants: false,
          sku: formData.sku.trim(),
          barcode: formData.barcode.trim(),
          costPrice: Number(formData.costPrice) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0,
          reorderLevel: Number(formData.reorderLevel) || 0,
          active: true
        }, userProfile.id);
      } else {
        // Product with Variants
        if (!formData.variantName.trim()) {
          toast.error('Initial variant name is required');
          setSubmitting(false);
          return;
        }

        newProduct = await addProduct({
          name: formData.name.trim(),
          categoryId: formData.categoryId,
          brand: formData.brand.trim(),
          productType: formData.productType,
          hasVariants: true,
          active: true
        }, userProfile.id);

        newVariant = await addVariant(newProduct.id, {
          name: formData.variantName.trim(),
          size: formData.variantSize.trim(),
          sku: formData.variantSku.trim(),
          barcode: formData.variantBarcode.trim(),
          costPrice: Number(formData.variantCostPrice) || 0,
          sellingPrice: Number(formData.variantSellingPrice) || 0,
          reorderLevel: Number(formData.variantReorderLevel) || 0,
          active: true
        }, userProfile.id);
      }

      toast.success(`Product "${newProduct.name}" created and selected!`);
      if (onSuccess) {
        onSuccess({ product: newProduct, variant: newVariant });
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Add Product"
      description="Create a new product to immediately receive stock"
      size="lg"
      showCloseButton={!submitting}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
        {/* Basic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name *"
            placeholder="e.g. LED Bulb 12W / Cotton Fabric"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
            disabled={submitting}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-surface-700">
                Category <span className="text-danger-500">*</span>
              </label>
              {!showNewCategory && (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> New Category
                </button>
              )}
            </div>

            {showNewCategory ? (
              <div className="p-2.5 bg-primary-50/60 border border-primary-200 rounded-lg space-y-2">
                <input
                  type="text"
                  placeholder="New Category Name..."
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-surface-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName('');
                    }}
                    disabled={addingCategory}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={handleCreateCategory}
                    isLoading={addingCategory}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <select
                className="w-full px-3.5 py-2.5 bg-white border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all disabled:bg-surface-50"
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                required
                disabled={submitting || loadingCategories}
              >
                <option value="" disabled>Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-700">
              Product Type <span className="text-danger-500">*</span>
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-white border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all disabled:bg-surface-50"
              value={formData.productType}
              onChange={e => setFormData({ ...formData, productType: e.target.value })}
              required
              disabled={submitting}
            >
              <option value="FINISHED_PRODUCT">Finished Product</option>
              <option value="RAW_MATERIAL">Raw Material</option>
            </select>
          </div>

          <Input
            label="Brand (Optional)"
            placeholder="e.g. Philips / Samsung"
            value={formData.brand}
            onChange={e => setFormData({ ...formData, brand: e.target.value })}
            disabled={submitting}
          />
        </div>

        {/* Product Architecture Selector */}
        <div className="space-y-2 pt-2 border-t border-surface-200">
          <label className="block text-sm font-medium text-surface-700">
            Product Architecture <span className="text-danger-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                !formData.hasVariants
                  ? 'bg-primary-50/40 border-primary-500 ring-1 ring-primary-500'
                  : 'bg-white border-surface-200 hover:border-surface-300'
              }`}
            >
              <input
                type="radio"
                name="hasVariants"
                checked={!formData.hasVariants}
                onChange={() => setFormData({ ...formData, hasVariants: false })}
                className="mt-1 text-primary-600 focus:ring-primary-500"
                disabled={submitting}
              />
              <div>
                <span className="block text-sm font-semibold text-surface-900">
                  Single Product (No Variants)
                </span>
                <span className="block text-xs text-surface-500 mt-0.5">
                  Standard item with unified stock & price (e.g. Tape, USB Cable)
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                formData.hasVariants
                  ? 'bg-primary-50/40 border-primary-500 ring-1 ring-primary-500'
                  : 'bg-white border-surface-200 hover:border-surface-300'
              }`}
            >
              <input
                type="radio"
                name="hasVariants"
                checked={formData.hasVariants}
                onChange={() => setFormData({ ...formData, hasVariants: true })}
                className="mt-1 text-primary-600 focus:ring-primary-500"
                disabled={submitting}
              />
              <div>
                <span className="block text-sm font-semibold text-surface-900">
                  Has Variants / Sizes
                </span>
                <span className="block text-xs text-surface-500 mt-0.5">
                  Multiple variations (e.g. S / M / L, Colors, Wattage)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Non-Variant Product Details */}
        {!formData.hasVariants ? (
          <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary-600" /> Single Product Pricing & Barcode
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Unit Cost Price (Rs.)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 500"
                value={formData.costPrice}
                onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                disabled={submitting}
              />
              <Input
                label="Selling Price (Rs.)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 750"
                value={formData.sellingPrice}
                onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                disabled={submitting}
              />
              <Input
                label="SKU (Optional)"
                placeholder="Auto-generated if empty"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                disabled={submitting}
              />
              <Input
                label="Barcode (Optional)"
                placeholder="Scan or type barcode"
                value={formData.barcode}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                disabled={submitting}
              />
            </div>
          </div>
        ) : (
          /* Initial Variant Details */
          <div className="p-4 bg-primary-50/30 border border-primary-200 rounded-xl space-y-4">
            <div>
              <h4 className="text-xs font-bold text-primary-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary-600" /> Initial Variant for this Product
              </h4>
              <p className="text-xs text-surface-500 mt-0.5">
                Since this product has variants, specify the first variant to receive into stock.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Variant Name *"
                placeholder="e.g. Standard / Large / Red"
                value={formData.variantName}
                onChange={e => setFormData({ ...formData, variantName: e.target.value })}
                required
                disabled={submitting}
              />
              <Input
                label="Size / Specification (Optional)"
                placeholder="e.g. L / 12W / 500ml"
                value={formData.variantSize}
                onChange={e => setFormData({ ...formData, variantSize: e.target.value })}
                disabled={submitting}
              />
              <Input
                label="Unit Cost Price (Rs.)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 500"
                value={formData.variantCostPrice}
                onChange={e => setFormData({ ...formData, variantCostPrice: e.target.value })}
                disabled={submitting}
              />
              <Input
                label="Selling Price (Rs.)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 750"
                value={formData.variantSellingPrice}
                onChange={e => setFormData({ ...formData, variantSellingPrice: e.target.value })}
                disabled={submitting}
              />
              <Input
                label="SKU (Optional)"
                placeholder="Auto-generated if empty"
                value={formData.variantSku}
                onChange={e => setFormData({ ...formData, variantSku: e.target.value })}
                disabled={submitting}
              />
              <Input
                label="Barcode (Optional)"
                placeholder="Scan or type barcode"
                value={formData.variantBarcode}
                onChange={e => setFormData({ ...formData, variantBarcode: e.target.value })}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            icon={<Check className="w-4 h-4" />}
          >
            Save & Select Product
          </Button>
        </div>
      </form>
    </Modal>
  );
}
