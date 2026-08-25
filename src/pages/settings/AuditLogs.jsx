import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Table, Button, Input, Badge } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { canViewAuditLogs } from '../../utils/permissions';
import { getAuditLogs } from '../../services/auditService';
import { getUsers } from '../../services/userService';
import { BRANCHES } from '../../config/constants';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/formatters';

export default function AuditLogs() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isSuperAdmin = canViewAuditLogs(userProfile?.role);
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  const ACTION_TYPES = [
    'LOGIN', 'LOGOUT', 
    'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
    'CREATE_VARIANT', 'UPDATE_VARIANT', 'DELETE_VARIANT',
    'RECEIVE_STOCK', 'TRANSFER_STOCK', 'ADJUST_STOCK',
    'CREATE_BILL', 'CANCEL_BILL', 'SALE_RETURN',
    'CREATE_USER', 'UPDATE_USER', 'CHANGE_USER_ROLE', 'ACTIVATE_USER', 'DEACTIVATE_USER', 'RESET_USER_PASSWORD'
  ];

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('You do not have permission to view audit logs.');
      navigate('/');
      return;
    }
    fetchData();
  }, [isSuperAdmin, navigate, toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsData, usersData] = await Promise.all([
        getAuditLogs({ limitCount: 200 }), // Increased limit for frontend filtering
        getUsers()
      ]);
      setLogs(logsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters on the client side (since we fetched recent 200)
  // For production with massive logs, this should use Algolia or specialized backend queries
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesUser = selectedUser ? log.userId === selectedUser : true;
    const matchesAction = selectedAction ? log.action === selectedAction : true;
    const matchesBranch = selectedBranch ? log.branchId === selectedBranch : true;
    
    return matchesSearch && matchesUser && matchesAction && matchesBranch;
  });

  const getActionColor = (action) => {
    if (action.includes('CREATE') || action.includes('RECEIVE') || action === 'LOGIN' || action.includes('ACTIVATE')) return 'success';
    if (action.includes('DELETE') || action.includes('CANCEL') || action === 'LOGOUT' || action.includes('DEACTIVATE')) return 'danger';
    if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('TRANSFER') || action.includes('ADJUST') || action.includes('RETURN')) return 'warning';
    return 'surface';
  };

  const columns = [
    { 
      header: 'Timestamp', 
      accessor: 'timestamp',
      render: (val) => (
        <span className="text-sm text-surface-600 whitespace-nowrap">
          {formatDate(val, { includeTime: true })}
        </span>
      )
    },
    { 
      header: 'User', 
      accessor: 'userName',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-surface-900">{val || 'Unknown'}</span>
          <span className="text-xs text-surface-400">{row.userId}</span>
        </div>
      )
    },
    { 
      header: 'Action', 
      accessor: 'action',
      render: (val) => (
        <Badge variant={getActionColor(val)}>
          {val.replace(/_/g, ' ')}
        </Badge>
      )
    },
    { 
      header: 'Entity / Details', 
      accessor: 'entityType',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-sm text-surface-700">{val || 'N/A'}</span>
          <span className="text-xs text-surface-500 font-mono truncate max-w-[200px]" title={row.entityId}>
            {row.entityId}
          </span>
        </div>
      )
    },
    { 
      header: 'Branch', 
      accessor: 'branchId',
      render: (val) => {
        if (!val || val === 'all') return <span className="text-surface-400">-</span>;
        const branchName = Object.values(BRANCHES).find(b => b.id === val)?.name;
        return <span className="text-sm text-surface-700">{branchName || val}</span>;
      }
    }
  ];

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <History className="w-6 h-6 text-primary-600" />
            Audit Logs
          </h1>
          <p className="text-sm text-surface-500 mt-1">Track system events and user actions.</p>
        </div>
        <Button variant="outline" onClick={fetchData} icon={<History className="w-4 h-4" />}>
          Refresh Logs
        </Button>
      </div>

      <Card>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-surface-50 border-b border-surface-200">
          <div className="relative">
            <Input
              placeholder="Search ID, action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map(a => (
                <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center">
            <Filter className="w-4 h-4 absolute left-3 text-surface-400 pointer-events-none" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">All Branches</option>
              {Object.values(BRANCHES).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <Table 
          columns={columns}
          data={filteredLogs}
          isLoading={loading}
          emptyMessage="No audit logs found matching your filters."
        />
        
        <div className="p-4 border-t border-surface-200 bg-surface-50 text-center rounded-b-xl">
          <span className="text-xs text-surface-500 italic">Showing top 200 recent events</span>
        </div>
      </Card>
    </div>
  );
}
