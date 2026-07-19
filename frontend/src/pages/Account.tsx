import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { User, Lock, ShoppingBag, LogOut, ChevronRight, Truck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Order, ORDER_STATUS_LABELS, OrderStatus, Carrier, CARRIER_LABELS, CARRIER_TRACKING_URLS } from '../types'
import api from '../services/api'
import logo from '../assets/logo.png'

interface Props {
  adminMode?: boolean
}

export default function Account({ adminMode }: Props) {
  const { user, login, register, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [activeSection, setActiveSection] = useState<'orders' | 'profile'>('orders')

  useEffect(() => {
    if (user && !adminMode) {
      api.get('/orders/my').then(r => setOrders(r.data)).catch(() => {})
    }
  }, [user, adminMode])

  if (user && adminMode && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  if (user && adminMode) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (tab === 'login') {
        await login(formData.email, formData.password)
      } else {
        await register(formData.name, formData.email, formData.password, formData.phone)
      }
      if (adminMode) navigate('/admin')
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al procesar la solicitud'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Logged in view
  if (user && !adminMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-black text-white py-14">
          <div className="container-main">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Bienvenido/a</p>
            <h1 className="text-3xl font-black">{user.name}</h1>
            <p className="text-gray-400 mt-1 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="container-main py-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 overflow-hidden">
                {[
                  { key: 'orders', icon: ShoppingBag, label: 'Mis pedidos' },
                  { key: 'profile', icon: User, label: 'Mi perfil' },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key as 'orders' | 'profile')}
                    className={`flex items-center gap-3 w-full px-5 py-4 text-sm font-medium border-b border-gray-100 transition-colors ${activeSection === key ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                  >
                    <Icon size={16} />
                    {label}
                    <ChevronRight size={14} className="ml-auto" />
                  </button>
                ))}
                <button
                  onClick={() => { logout(); navigate('/') }}
                  className="flex items-center gap-3 w-full px-5 py-4 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {activeSection === 'orders' && (
                <div>
                  <h2 className="font-bold text-xl mb-5">Mis pedidos</h2>
                  {orders.length === 0 ? (
                    <div className="bg-white border border-gray-200 p-12 text-center">
                      <ShoppingBag size={36} className="mx-auto text-gray-300 mb-3" />
                      <p className="font-medium text-gray-600">Todavía no tenés pedidos</p>
                      <p className="text-sm text-gray-400 mt-1">Cuando realices una compra aparecerá aquí.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map(order => (
                        <div key={order.id} className="bg-white border border-gray-200 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="font-bold">{order.orderNumber}</p>
                              <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es-AR')}</p>
                            </div>
                            <span className={`badge ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-black text-white'}`}>
                              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{order.items.length} producto{order.items.length !== 1 ? 's' : ''}</p>
                            <p className="font-bold text-black mt-1">${order.total.toLocaleString('es-AR')}</p>
                          </div>
                          {order.trackingNumber && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2 text-sm">
                              <Truck size={14} className="text-gray-400" />
                              <span className="text-gray-600">{CARRIER_LABELS[order.trackingCarrier as Carrier]} · <span className="font-mono">{order.trackingNumber}</span></span>
                              <a
                                href={CARRIER_TRACKING_URLS[order.trackingCarrier as Carrier]}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-auto text-xs font-semibold underline text-blue-600"
                              >
                                Seguir envío
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'profile' && (
                <div className="bg-white border border-gray-200 p-6">
                  <h2 className="font-bold text-xl mb-5">Mi perfil</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                      <User size={15} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Nombre</p>
                        <p className="font-medium">{user.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                      <Lock size={15} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Login/Register form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src={logo} alt="In Print" className="h-28 w-auto" />
        </div>

        {adminMode && (
          <div className="text-center mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Panel de administración</p>
            <p className="font-bold text-lg mt-1">Acceso restringido</p>
          </div>
        )}

        {!adminMode && (
          <div className="flex border border-gray-200 mb-6">
            <button onClick={() => setTab('login')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'login' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black'}`}>
              Iniciar sesión
            </button>
            <button onClick={() => setTab('register')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'register' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black'}`}>
              Crear cuenta
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6 space-y-4">
          {tab === 'register' && !adminMode && (
            <>
              <div>
                <label className="label">Nombre completo *</label>
                <input className="input-base" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Tu nombre" required />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input-base" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="+54 9 221 ..." />
              </div>
            </>
          )}
          <div>
            <label className="label">Email *</label>
            <input className="input-base" type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="tu@email.com" required />
          </div>
          <div>
            <label className="label">Contraseña *</label>
            <input className="input-base" type="password" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 p-3 border border-red-200">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Procesando...' : adminMode ? 'Ingresar al panel' : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        {adminMode && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Solo para administradores de In Print
          </p>
        )}
      </div>
    </div>
  )
}
