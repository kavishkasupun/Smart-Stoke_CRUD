import { useState, useEffect } from 'react';
import { Layers, Check } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { addVariant } from '../../services/productService';

export default function QuickAddVariantModal({ isOpen, onClose, product, onSuccess }) {
  const { userProfile } = useAuth();
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    size: '',
    sku: '',
    barcode: '',
    costPrice: '',
    sellingPrice: '',
    reorderLevel: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        size: '',
        sku: '',
        barcode: '',
        costPrice: '',
        sellingPrice: '',
        reorderLevel: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Variant name is required');
      return;
    }

    if (!product?.id) {
      toast.error('Product not selected');
      return;
    }

    if (!userProfile?.id) {
      toast.error('User authentication error');
      return;
    }

    try {
      setSubmitting(true);
      const newVariant = await addVariant(product.id, {
        name: formData.name.trim(),
        size: formData.size.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        reorderLevel: Number(formData.reorderLevel) || 0,
        active: true
      }, userProfile.id);

      toast.success(`Variant "${newVariant.name}" added and selected!`);
      if (onSuccess) {
        onSuccess(newVariant);
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to add variant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Variant"
      description={`Add a new variant/size for ${product?.name || 'Product'}`}
      size="md"
      showCloseButton={!submitting}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="p-3 bg-surface-50 border border-surface-200 rounded-lg flex items-center gap-2 text-sm text-surface-700">
          <Layers className="w-4 h-4 text-primary-600" />
          <span>Product: <strong className="text-surface-900">{product?.name}</strong></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Variant Name *"
            placeholder="e.g. Large / Red / 1kg"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
            disabled={submitting}
          />
          <Input
            label="Size / Specification"
            placeholder="e.g. XL / 240V"
            value={formData.size}
            onChange={e => setFormData({ ...formData, size: e.target.value })}
            disabled={submitting}
          />
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
            Save & Select Variant
          </Button>
        </div>
      </form>
    </Modal>
  );
}
