import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SidebarProvider } from './contexts/SidebarContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { USER_ROLES } from './config/constants';
import { Loader2 } from 'lucide-react';

// Eagerly load login and dashboard for perceived performance
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Lazy loaded components
const NotFound = React.lazy(() => import('./pages/NotFound'));
const PlaceholderPage = React.lazy(() => import('./pages/PlaceholderPage'));

// Settings Pages
const Users = React.lazy(() => import('./pages/settings/Users'));
const UserForm = React.lazy(() => import('./pages/settings/UserForm'));
const UserDetails = React.lazy(() => import('./pages/settings/UserDetails'));
const AuditLogs = React.lazy(() => import('./pages/settings/AuditLogs'));
const NotificationSettings = React.lazy(() => import('./pages/settings/NotificationSettings'));

// Reports Pages
const ReportsDashboard = React.lazy(() => import('./pages/reports/ReportsDashboard'));
const InventoryReport = React.lazy(() => import('./pages/reports/InventoryReport'));
const SalesReport = React.lazy(() => import('./pages/reports/SalesReport'));
const OperationsReport = React.lazy(() => import('./pages/reports/OperationsReport'));

// Inventory Pages
const Categories = React.lazy(() => import('./pages/inventory/Categories'));
const Products = React.lazy(() => import('./pages/inventory/Products'));
const ProductForm = React.lazy(() => import('./pages/inventory/ProductForm'));
const ProductDetails = React.lazy(() => import('./pages/inventory/ProductDetails'));
const StockOverview = React.lazy(() => import('./pages/inventory/StockOverview'));

// Operations Pages
const ReceiveHistory = React.lazy(() => import('./pages/operations/ReceiveHistory'));
const ReceiveStockForm = React.lazy(() => import('./pages/operations/ReceiveStockForm'));
const ReceiveDetails = React.lazy(() => import('./pages/operations/ReceiveDetails'));

const TransferHistory = React.lazy(() => import('./pages/operations/TransferHistory'));
const CreateTransferForm = React.lazy(() => import('./pages/operations/CreateTransferForm'));
const TransferDetails = React.lazy(() => import('./pages/operations/TransferDetails'));

const AdjustmentHistory = React.lazy(() => import('./pages/operations/AdjustmentHistory'));
const CreateAdjustmentForm = React.lazy(() => import('./pages/operations/CreateAdjustmentForm'));
const AdjustmentDetails = React.lazy(() => import('./pages/operations/AdjustmentDetails'));

const NotificationCenter = React.lazy(() => import('./pages/notifications/NotificationCenter'));

// People
const Customers = React.lazy(() => import('./pages/customers/Customers'));
const CustomerForm = React.lazy(() => import('./pages/customers/CustomerForm'));
const CustomerDetails = React.lazy(() => import('./pages/customers/CustomerDetails'));

// Sales
const Invoices = React.lazy(() => import('./pages/sales/Invoices'));
const InvoiceForm = React.lazy(() => import('./pages/sales/InvoiceForm'));
const InvoiceDetails = React.lazy(() => import('./pages/sales/InvoiceDetails'));

const SalesReturns = React.lazy(() => import('./pages/sales/SalesReturns'));
const CreateReturnForm = React.lazy(() => import('./pages/sales/CreateReturnForm'));
const ReturnDetails = React.lazy(() => import('./pages/sales/ReturnDetails'));

const PageLoader = () => (
  <div className="flex justify-center items-center h-full w-full p-20">
    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <SidebarProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Login — accessible only to guests */}
                  <Route element={<ProtectedRoute requireAuth={false} />}>
                    <Route path="/login" element={<Login />} />
                  </Route>

                  {/* App routes — require auth and are wrapped in AppLayout */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      {/* Dashboard - accessible to all logged-in users */}
                      <Route path="/" element={<Dashboard />} />

                      {/* Inventory */}
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/new" element={<ProductForm />} />
                      <Route path="/products/:id" element={<ProductDetails />} />
                      <Route path="/products/:id/edit" element={<ProductForm />} />
                      
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/stock-overview" element={<StockOverview />} />

                      {/* Operations */}
                      <Route path="/stock-receiving" element={<ReceiveHistory />} />
                      <Route path="/stock-receiving/new" element={<ReceiveStockForm />} />
                      <Route path="/stock-receiving/:id" element={<ReceiveDetails />} />
                      
                      <Route path="/stock-transfers" element={<TransferHistory />} />
                      <Route path="/stock-transfers/new" element={<CreateTransferForm />} />
                      <Route path="/stock-transfers/:id" element={<TransferDetails />} />
                      
                      <Route path="/adjustments" element={<AdjustmentHistory />} />
                      <Route path="/adjustments/new" element={<CreateAdjustmentForm />} />
                      <Route path="/adjustments/:id" element={<AdjustmentDetails />} />

                      {/* Sales */}
                      <Route path="/bills" element={<Invoices />} />
                      <Route path="/bills/new" element={<InvoiceForm />} />
                      <Route path="/bills/:id" element={<InvoiceDetails />} />
                      
                      <Route path="/sales-returns" element={<SalesReturns />} />
                      <Route path="/sales-returns/new" element={<CreateReturnForm />} />
                      <Route path="/sales-returns/:id" element={<ReturnDetails />} />
                      
                      {/* Notifications */}
                      <Route path="/notifications" element={<NotificationCenter />} />

                      {/* People */}
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/customers/new" element={<CustomerForm />} />
                      <Route path="/customers/:id" element={<CustomerDetails />} />
                      <Route path="/customers/:id/edit" element={<CustomerForm />} />

                      {/* Reports */}
                      <Route path="/reports/dashboard" element={<ReportsDashboard />} />
                      <Route path="/reports/inventory" element={<InventoryReport />} />
                      <Route path="/reports/sales" element={<SalesReport />} />
                      <Route path="/reports/operations" element={<OperationsReport />} />

                      {/* Settings - Only Super Admin can manage users */}
                      <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]} />}>
                        <Route path="/settings/users" element={<Users />} />
                        <Route path="/settings/users/new" element={<UserForm />} />
                        <Route path="/settings/users/:id" element={<UserDetails />} />
                        <Route path="/settings/audit-logs" element={<AuditLogs />} />
                      </Route>
                      <Route path="/settings/notifications" element={<NotificationSettings />} />

                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </SidebarProvider>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
