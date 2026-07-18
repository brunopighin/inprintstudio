import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users,
  Percent, Image, LogOut, Menu, X, Camera, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { to: '/admin/productos', icon: Package, label: 'Productos' },
  { to: '/admin/categorias', icon: Tag, label: 'Categorías' },
  { to: '/admin/usuarios', icon: Users, label: 'Clientes' },
  { to: '/admin/promociones', icon: Percent, label: 'Promociones' },
  { to: '/admin/banners', icon: Image, label: 'Banners' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-black text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-gray-800">
          <div className="w-7 h-7 bg-white flex items-center justify-center">
            <Camera size={14} className="text-black" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xs font-black tracking-widest text-white">IN PRINT</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors w-full">
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-black">
            <Menu size={20} />
          </button>
          <div className="text-sm text-gray-500">
            Panel de administración
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
