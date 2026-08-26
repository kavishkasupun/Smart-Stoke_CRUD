import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageUsers } from '../../utils/permissions';
import { createUser } from '../../services/userService';
import { USER_ROLE_LABELS, USER_ROLES, BRANCHES } from '../../config/constants';
import { useToast } from '../../contexts/ToastContext';

export default function UserForm() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isSuperAdmin = canManageUsers(userProfile?.role);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    branchId: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('You do not have permission to view this page.');
      navigate('/');
    }
  }, [isSuperAdmin, navigate, toast]);

  // Handle dynamic branch logic
  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    let newBranchId = formData.branchId;

    if (newRole === USER_ROLES.SUPER_ADMIN || newRole === USER_ROLES.INVENTORY_MANAGER) {
      newBranchId = 'all'; // Global roles
    } else if (newRole === USER_ROLES.MABOLA_MANAGER) {
      newBranchId = 'mabola';
    } else if (newRole === USER_ROLES.JAFFNA_MANAGER) {
      newBranchId = 'jaffna';
    } else if (!newBranchId || newBranchId === 'all') {
      newBranchId = ''; // Reset for branch-specific roles if currently global
    }

    setFormData({ ...formData, role: newRole, branchId: newBranchId });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword || !formData.role) {
      setError('All fields are required.');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!['all', 'mabola', 'jaffna'].includes(formData.branchId) && formData.branchId !== '') {
        // Just a sanity check
        setError('Invalid branch selection.');
        return;
    }

    if (!formData.branchId) {
      setError('Please select a branch.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      toast.showLoading('Creating User...');

      await createUser(formData, userProfile);
      toast.success('User created successfully!');
      navigate('/settings/users');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('A user with this email already exists.');
        toast.error('Email already in use.');
      } else {
        setError('Failed to create user. See console for details.');
        toast.error('Failed to create user.');
      }
    } finally {
      setSubmitting(false);
      toast.hideLoading();
    }
  };

  if (!isSuperAdmin) return null;

  const requiresBranchSelection = [USER_ROLES.SALES_USER, USER_ROLES.VIEWER].includes(formData.role);
  const isBranchForced = !requiresBranchSelection && formData.role !== '';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          icon={<ArrowLeft className="w-5 h-5" />} 
          onClick={() => navigate('/settings/users')}
          className="p-2"
        />
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary-600" />
            Add New User
          </h1>
          <p className="text-sm text-surface-500 mt-1">Create a new system user account.</p>
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
              label="Full Name"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={submitting}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. john@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={submitting}
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={submitting}
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              disabled={submitting}
              autoComplete="new-password"
              error={formData.confirmPassword && formData.confirmPassword !== formData.password ? "Passwords do not match" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-700">
                System Role <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  disabled={submitting}
                  value={formData.role}
                  onChange={handleRoleChange}
                  className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:bg-surface-50 disabled:text-surface-500 appearance-none"
                >
                  <option value="" disabled>Select a role</option>
                  {Object.entries(USER_ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-surface-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-700">
                Assigned Branch <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  disabled={submitting || isBranchForced || !formData.role}
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:bg-surface-50 disabled:text-surface-500 appearance-none"
                >
                  <option value="" disabled>Select a branch</option>
                  {formData.role === USER_ROLES.SUPER_ADMIN || formData.role === USER_ROLES.INVENTORY_MANAGER ? (
                    <option value="all">Global (All Branches)</option>
                  ) : formData.role === USER_ROLES.MABOLA_MANAGER ? (
                    <option value="mabola">Mabola</option>
                  ) : formData.role === USER_ROLES.JAFFNA_MANAGER ? (
                    <option value="jaffna">Jaffna</option>
                  ) : (
                    <>
                      <option value="mabola">Mabola</option>
                      <option value="jaffna">Jaffna</option>
                    </>
                  )}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-surface-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                </div>
              </div>
              <p className="text-xs text-surface-500">
                {isBranchForced ? 'Branch is automatically determined by the selected role.' : 'Select the specific branch this user works at.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/settings/users')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              icon={<Save className="w-4 h-4" />}
              isLoading={submitting}
              disabled={submitting}
            >
              Create User
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
