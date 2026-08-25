import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Filter, Edit2, ShieldAlert } from 'lucide-react';
import { Card, Table, Button, Input, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canManageUsers } from '../../utils/permissions';
import { getUsers } from '../../services/userService';
import { USER_ROLE_LABELS, BRANCHES } from '../../config/constants';
import { useToast } from '../../contexts/ToastContext';

export default function Users() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isSuperAdmin = canManageUsers(userProfile?.role);
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('You do not have permission to view this page.');
      navigate('/');
      return;
    }
    fetchData();
  }, [isSuperAdmin, navigate, toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
      u?.email?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
      false;
    const matchesRole = selectedRole ? u.role === selectedRole : true;
    const matchesBranch = selectedBranch ? u.branchId === selectedBranch : true;
    return matchesSearch && matchesRole && matchesBranch;
  });

  const columns = [
    { 
      header: 'Name', 
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-medium text-surface-900">{val}</div>
          <div className="text-xs text-surface-500">{row.email}</div>
        </div>
      )
    },
    { 
      header: 'Role', 
      accessor: 'role',
      render: (val) => (
        <Badge variant={val === 'SUPER_ADMIN' ? 'primary' : 'surface'}>
          {USER_ROLE_LABELS[val] || val}
        </Badge>
      )
    },
    { 
      header: 'Branch', 
      accessor: 'branchId',
      render: (val) => {
        if (!val || val === 'all') return <span className="text-surface-500 italic">All Branches</span>;
        const branchName = Object.values(BRANCHES).find(b => b.id === val)?.name;
        return <span className="text-surface-700">{branchName || val}</span>;
      }
    },
    { 
      header: 'Status', 
      accessor: 'active',
      render: (val) => (
        <Badge variant={val ? 'success' : 'danger'}>
          {val ? 'Active' : 'Disabled'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/settings/users/${id}`)}
            icon={<Edit2 className="w-4 h-4" />}
          >
            Manage
          </Button>
        </div>
      )
    }
  ];

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary-600" />
            User Management
          </h1>
          <p className="text-sm text-surface-500 mt-1">Manage system access, roles, and branches.</p>
        </div>
        
        <Button 
          onClick={() => navigate('/settings/users/new')} 
          icon={<Plus className="w-4 h-4" />}
        >
          Add User
        </Button>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="flex w-full md:w-auto gap-4">
            <div className="relative flex items-center w-full md:w-48">
              <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
              >
                <option value="">All Roles</option>
                {Object.entries(USER_ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div className="relative flex items-center w-full md:w-48">
              <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
              >
                <option value="">All Branches</option>
                <option value="all">Global (All)</option>
                {Object.values(BRANCHES).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Data Table */}
        <Table 
          columns={columns}
          data={filteredUsers}
          isLoading={loading}
          emptyMessage="No users found matching your filters."
        />
      </Card>
    </div>
  );
}
