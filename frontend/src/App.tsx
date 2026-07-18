import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import CartDrawer from './components/cart/CartDrawer'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Checkout from './pages/Checkout'
import Account from './pages/Account'
import Contact from './pages/Contact'
import AdminLayout from './components/layout/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCategories from './pages/admin/AdminCategories'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminPromotions from './pages/admin/AdminPromotions'
import AdminBanners from './pages/admin/AdminBanners'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>
  if (!user || user.role !== 'ADMIN') return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<><Header /><CartDrawer /><Home /><Footer /></>} />
        <Route path="/catalogo" element={<><Header /><CartDrawer /><Catalog /><Footer /></>} />
        <Route path="/catalogo/:category" element={<><Header /><CartDrawer /><Catalog /><Footer /></>} />
        <Route path="/producto/:slug" element={<><Header /><CartDrawer /><ProductDetail /><Footer /></>} />
        <Route path="/checkout" element={<><Header /><Checkout /><Footer /></>} />
        <Route path="/mi-cuenta" element={<><Header /><Account /><Footer /></>} />
        <Route path="/contacto" element={<><Header /><Contact /><Footer /></>} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<Account adminMode />} />
        <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="promociones" element={<AdminPromotions />} />
          <Route path="banners" element={<AdminBanners />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
