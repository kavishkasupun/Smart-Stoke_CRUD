import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Eye, Building2, Phone, Mail } from 'lucide-react';
import { Card, Table, Button, Input, Badge, Spinner } from '../../components/ui';
import { getCustomers } from '../../services/customerService';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' ? customer.active : !customer.active;

    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: 'Code',
      accessor: 'customerCode',
      render: (val) => <span className="font-mono text-sm text-surface-500">{val}</span>
    },
    {
      header: 'Customer',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <p className="font-bold text-surface-900">{val}</p>
          {row.companyName && (
            <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" /> {row.companyName}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Contact',
      accessor: 'phone',
      render: (val, row) => (
        <div className="space-y-1">
          {val && <p className="text-sm text-surface-700 flex items-center gap-1"><Phone className="w-3 h-3" /> {val}</p>}
          {row.email && <p className="text-xs text-surface-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {row.email}</p>}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (val) => val 
        ? <Badge variant="success">Active</Badge> 
        : <Badge variant="surface">Inactive</Badge>
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/customers/${id}`)}
            className="p-1.5"
          >
            <Eye className="w-4 h-4 text-surface-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/customers/${id}/edit`)}
            className="p-1.5"
          >
            <Edit2 className="w-4 h-4 text-primary-600" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Customers</h1>
          <p className="text-sm text-surface-500 mt-1">Manage your customer database and contacts</p>
        </div>
        
        <Button 
          onClick={() => navigate('/customers/new')} 
          icon={<Plus className="w-4 h-4" />}
        >
          Add Customer
        </Button>
      </div>

      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-50 border-b border-surface-200">
          <div className="w-full md:w-96 relative">
            <Input
              placeholder="Search name, phone, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="active">Active Customers</option>
              <option value="all">All Customers</option>
              <option value="inactive">Inactive Customers</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Spinner />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={filteredCustomers}
            emptyMessage="No customers found."
          />
        )}
      </Card>
    </div>
  );
}
