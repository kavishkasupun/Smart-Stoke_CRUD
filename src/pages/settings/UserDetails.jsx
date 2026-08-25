import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User as UserIcon, ShieldAlert, Key } from 'lucide-react';
import { Card, Button, Input, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageUsers } from '../../utils/permissions';
import { getUserById, updateUser, resetUserPassword } from '../../services/userService';
import { USER_ROLE_LABELS, USER_ROLES, BRANCHES } from '../../config/constants';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isSuperAdmin = canManageUsers(userProfile?.role);
  const isSelf = userProfile?.id === id;
  const toast = useToast();
  const confirm = useConfirm();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    branchId: '',
    active: true
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('You do not have permission to view this page.');
      navigate('/');
      return;
    }
    fetchUser();
  }, [id, isSuperAdmin, navigate, toast]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await getUserById(id);
      if (!data) {
        toast.error('User not found.');
        navigate('/settings/users');
        return;
      }
      setUser(data);
      setFormData({
        name: data.name || '',
        role: data.role || '',
        branchId: data.branchId || '',
        active: data.active
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load user.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    let newBranchId = formData.branchId;

    if (newRole === USER_ROLES.SUPER_ADMIN || newRole === USER_ROLES.INVENTORY_MANAGER) {
      newBranchId = 'all'; 
    } else if (newRole === USER_ROLES.MABOLA_MANAGER) {
      newBranchId = 'mabola';
    } else if (newRole === USER_ROLES.JAFFNA_MANAGER) {
      newBranchId = 'jaffna';
    } else if (!newBranchId || newBranchId === 'all') {
      newBranchId = ''; 
    }

    setFormData({ ...formData, role: newRole, branchId: newBranchId });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.role) {
      setError('Name and Role are required.');
      return;
    }

    if (!formData.branchId) {
      setError('Please select a branch.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Only update what changed to avoid unnecessary audit spam
      const updates = {};
      if (formData.name !== user.name) updates.name = formData.name;
      if (formData.role !== user.role) updates.role = formData.role;
      if (formData.branchId !== user.branchId) updates.branchId = formData.branchId;
      if (formData.active !== user.active) updates.active = formData.active;

      if (Object.keys(updates).length > 0) {
        await updateUser(id, updates, userProfile);
        toast.success('User updated successfully!');
        fetchUser();
      } else {
        toast.info('No changes to save.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update user.');
      toast.error('Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const isConfirmed = await confirm({
      title: 'Reset Password',
      message: `Send a password reset email to ${user.email}?`,
      confirmText: 'Send Email'
    });

    if (isConfirmed) {
      try {
        await resetUserPassword(user.email, userProfile);
        toast.success('Password reset email sent!');
      } catch (err) {
        console.error(err);
        toast.error('Failed to send reset email.');
      }
    }
  };

  if (loading || !user) {
    return <div className="p-8 text-center text-surface-500">Loading...</div>;
  }

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">{user.name}</h1>
            {isSelf && <Badge variant="primary">You</Badge>}
            {!user.active && <Badge variant="danger">Disabled</Badge>}
          </div>
          <p className="text-sm text-surface-500 mt-1">{user.email}</p>
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={submitting}
            />

            <Input
              label="Email Address"
              value={user.email}
              disabled={true}
              helperText="Email address cannot be changed."
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
                  disabled={submitting || isSelf}
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
              {isSelf && <p className="text-xs text-warning-600 mt-1">You cannot change your own role.</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-700">
                Assigned Branch <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  disabled={submitting || isSelf || isBranchForced}
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
            </div>
          </div>

          {!isSelf && (
            <div className="flex items-center gap-2 pt-2 border-t border-surface-200 mt-4">
              <input
                type="checkbox"
                id="active-toggle"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500"
                disabled={submitting}
              />
              <label htmlFor="active-toggle" className="text-sm font-medium text-surface-700">
                User account is active (can log in)
              </label>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t border-surface-200">
            <Button
              type="button"
              variant="outline"
              icon={<Key className="w-4 h-4" />}
              onClick={handlePasswordReset}
              disabled={submitting}
            >
              Reset Password
            </Button>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchUser()} // Reset form
                disabled={submitting}
              >
                Reset
              </Button>
              <Button
                type="submit"
                icon={<Save className="w-4 h-4" />}
                isLoading={submitting}
                disabled={submitting}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
