import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SidebarProvider } from './contexts/SidebarContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { USER_ROLES } from './config/constants';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import PlaceholderPage from './pages/PlaceholderPage';

// Inventory Pages
import Categories from './pages/inventory/Categories';
import Products from './pages/inventory/Products';
import ProductForm from './pages/inventory/ProductForm';
import ProductDetails from './pages/inventory/ProductDetails';
import StockOverview from './pages/inventory/StockOverview';

// Operations Pages
import ReceiveHistory from './pages/operations/ReceiveHistory';
import ReceiveStockForm from './pages/operations/ReceiveStockForm';
import ReceiveDetails from './pages/operations/ReceiveDetails';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <SidebarProvider>
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
                    
                    <Route path="/stock-transfers" element={<PlaceholderPage />} />
                    <Route path="/adjustments" element={<PlaceholderPage />} />

                    {/* Sales */}
                    <Route path="/bills" element={<PlaceholderPage />} />
                    <Route path="/sales-returns" element={<PlaceholderPage />} />
                    <Route path="/customers" element={<PlaceholderPage />} />

                    {/* Reports */}
                    <Route path="/reports/sales" element={<PlaceholderPage />} />
                    <Route path="/reports/stock" element={<PlaceholderPage />} />

                    {/* Settings - Only Super Admin can manage users */}
                    <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]} />}>
                      <Route path="/settings/users" element={<PlaceholderPage />} />
                    </Route>
                    <Route path="/settings/notifications" element={<PlaceholderPage />} />
                    <Route path="/settings/audit-logs" element={<PlaceholderPage />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              </Routes>
            </SidebarProvider>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
