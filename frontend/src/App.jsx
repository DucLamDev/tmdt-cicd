import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import DashboardLayout from './components/layouts/DashboardLayout';

// Public pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Compare from './pages/Compare';
import ShopPage from './pages/ShopPage';
import FlashSales from './pages/FlashSales';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import OAuthCallback from './pages/auth/OAuthCallback';

// Customer pages
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import Orders from './pages/customer/Orders';
import OrderDetail from './pages/customer/OrderDetail';
import Profile from './pages/customer/Profile';
import Wishlist from './pages/customer/Wishlist';
import VNPayCallback from './pages/customer/VNPayCallback';
import MoMoCallback from './pages/customer/MoMoCallback';
import ZaloPayCallback from './pages/customer/ZaloPayCallback';
import StripeCheckout from './pages/customer/StripeCheckout';
import Notifications from './pages/customer/Notifications';
import MyReturns from './pages/customer/MyReturns';
import LoyaltyPoints from './pages/customer/LoyaltyPoints';
import CustomerMessages from './pages/CustomerMessages';

// Seller pages
import SellerDashboard from './pages/seller/EnhancedDashboard';
import SellerProducts from './pages/seller/Products';
import SellerProductForm from './pages/seller/ProductForm';
import SellerOrders from './pages/seller/Orders';
import SellerShop from './pages/seller/Shop';
import SellerReports from './pages/seller/Reports';
import SellerMessages from './pages/seller/Messages';
import SellerInventory from './pages/seller/Inventory';
import SellerReturns from './pages/seller/SellerReturns';

// Shipper pages
import ShipperDashboard from './pages/shipper/EnhancedDashboard';
import ShipperOrders from './pages/shipper/Orders';
import AvailableOrders from './pages/shipper/AvailableOrders';
import CODManagement from './pages/shipper/CODManagement';
import ShipperHistory from './pages/shipper/History';
import ShipperReports from './pages/shipper/Reports';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminPromotions from './pages/admin/Promotions';
import AdminReports from './pages/admin/Reports';
import PendingApprovals from './pages/admin/PendingApprovals';
import AdminContactMessages from './pages/admin/ContactMessages';
import CategoryManagement from './pages/admin/CategoryManagement';
import FlashSaleManagement from './pages/admin/FlashSaleManagement';
import BlogManagement from './pages/admin/BlogManagement';
import AdminReturnsPage from './pages/admin/AdminReturns';
import AdminMessages from './pages/AdminMessages';

// Protected Route
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/payment/vnpay/callback" element={<VNPayCallback />} />
        <Route path="/payment/momo/callback" element={<MoMoCallback />} />
        <Route path="/payment/zalopay/callback" element={<ZaloPayCallback />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/shop/:slug" element={<ShopPage />} />
        <Route path="/flash-sales" element={<FlashSales />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
      </Route>

      {/* Customer routes */}
      <Route element={<MainLayout />}>
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <CustomerMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/stripe/checkout"
          element={
            <ProtectedRoute>
              <StripeCheckout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns"
          element={
            <ProtectedRoute>
              <MyReturns />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty"
          element={
            <ProtectedRoute>
              <LoyaltyPoints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games"
          element={
            <ProtectedRoute>
              <LoyaltyPoints />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Seller routes */}
      <Route element={<DashboardLayout />}>
        <Route
          path="/seller"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/products"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/products/new"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/products/edit/:id"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/orders"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/shop"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerShop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/reports"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/messages"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/inventory"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerInventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/returns"
          element={
            <ProtectedRoute requireRole="seller">
              <SellerReturns />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Shipper routes */}
      <Route element={<DashboardLayout />}>
        <Route
          path="/shipper"
          element={
            <ProtectedRoute requireRole="shipper">
              <ShipperDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipper/available-orders"
          element={
            <ProtectedRoute requireRole="shipper">
              <AvailableOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipper/orders"
          element={
            <ProtectedRoute requireRole="shipper">
              <ShipperOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipper/cod"
          element={
            <ProtectedRoute requireRole="shipper">
              <CODManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipper/history"
          element={
            <ProtectedRoute requireRole="shipper">
              <ShipperHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipper/reports"
          element={
            <ProtectedRoute requireRole="shipper">
              <ShipperReports />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin routes */}
      <Route element={<DashboardLayout />}>
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pending-approvals"
          element={
            <ProtectedRoute requireRole="admin">
              <PendingApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/promotions"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminPromotions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/contact-messages"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminContactMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute requireRole="admin">
              <CategoryManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/flash-sales"
          element={
            <ProtectedRoute requireRole="admin">
              <FlashSaleManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/blog"
          element={
            <ProtectedRoute requireRole="admin">
              <BlogManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/returns"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminReturnsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 */}
      <Route path="*" element={<div className="container py-20 text-center"><h1 className="text-4xl font-bold">404 - Không tìm thấy trang</h1></div>} />
    </Routes>
  );
}

export default App;
