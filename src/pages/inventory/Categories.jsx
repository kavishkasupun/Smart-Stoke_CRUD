import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Check, X, Trash2 } from 'lucide-react';
import { Card, Table, Button, Input, Modal, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageInventory } from '../../utils/permissions';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../services/categoryService';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function Categories() {
  const { userProfile } = useAuth();
  const canManage = canManageInventory(userProfile?.role);
  const toast = useToast();
  const confirm = useConfirm();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', active: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false
  );

  const handleOpenModal = (category = null) => {
    setError(null);
    if (category) {
      setEditingCategory(category);
      setFormData({ 
        name: category.name || '', 
        description: category.description || '', 
        active: category.active 
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Category name is required');
      toast.error('Category name is required');
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
      toast.showLoading(editingCategory ? 'Updating Category...' : 'Adding Category...');

      if (editingCategory) {
        await updateCategory(editingCategory.id, formData, userProfile.id);
        toast.success('Category updated successfully!');
      } else {
        await addCategory(formData, userProfile.id);
        toast.success('Category added successfully!');
      }

      await fetchCategories();
      setIsModalOpen(false);
    } catch (err) {
      setError('Failed to save category');
      toast.error('Failed to save category. Please try again.');
    } finally {
      setSubmitting(false);
      toast.hideLoading();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (isConfirmed) {
      try {
        toast.showLoading('Deleting Category...');
        await deleteCategory(id);
        toast.success('Category deleted successfully!');
        fetchCategories();
      } catch (err) {
        toast.error('Failed to delete category.');
      } finally {
        toast.hideLoading();
      }
    }
  };

  const columns = [
    { 
      header: 'Name', 
      accessor: 'name',
      render: (val) => <span className="font-medium text-surface-900">{val}</span>
    },
    { header: 'Description', accessor: 'description' },
    { 
      header: 'Status', 
      accessor: 'active',
      render: (val) => (
        <Badge variant={val ? 'success' : 'surface'}>
          {val ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    ...(canManage ? [{
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleOpenModal(row)}
            icon={<Edit2 className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            onClick={() => handleDelete(id)}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Categories</h1>
          <p className="text-sm text-surface-500 mt-1">Manage product categories</p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => handleOpenModal()} 
            icon={<Plus className="w-4 h-4" />}
          >
            Add Category
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>
        
        {/* Data Table */}
        <Table 
          columns={columns}
          data={filteredCategories}
          isLoading={loading}
          emptyMessage="No categories found."
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Category Name"
            placeholder="e.g., Lighting"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={submitting}
          />

          <Input
            label="Description (Optional)"
            placeholder="Category details..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            disabled={submitting}
          />

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
              Active Status
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-surface-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              isLoading={submitting}
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
