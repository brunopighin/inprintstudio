import { useEffect, useState } from 'react'
import { ShoppingBag, Users, Package, DollarSign, Clock, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { ORDER_STATUS_LABELS, OrderStatus, Order } from '../../types'

interface Stats {
  totalOrders: number
  pendingOrders: number
  totalUsers: number
  totalProducts: number
  totalRevenue: number
  ordersByStatus: { status: string; _count: { status: number } }[]
  recentOrders: Order[]
  dailyRevenue: { date: string; revenue: number }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false))
  }, [])

  const kpis = stats ? [
    { icon: ShoppingBag, label: 'Pedidos totales', value: stats.totalOrders, sub: `${stats.pendingOrders} pendientes` },
    { icon: DollarSign, label: 'Ingresos totales', value: `$${stats.totalRevenue.toLocaleString('es-AR')}`, sub: 'Pedidos no cancelados' },
    { icon: Users, label: 'Clientes', value: stats.totalUsers, sub: 'Registrados' },
    { icon: Package, label: 'Productos activos', value: stats.totalProducts, sub: 'En catálogo' },
  ] : []

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-none" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen del negocio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="bg-white border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
              <Icon size={16} className="text-gray-400" />
            </div>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} />
            <h3 className="font-bold">Ingresos últimos 7 días</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.dailyRevenue || []}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-AR')}`, 'Ingresos']} />
              <Bar dataKey="revenue" fill="#0a0a0a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by status */}
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="font-bold mb-5">Pedidos por estado</h3>
          <div className="space-y-3">
            {stats?.ordersByStatus.map(s => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{ORDER_STATUS_LABELS[s.status as OrderStatus]}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-100 h-1.5">
                    <div className="bg-black h-full" style={{ width: `${(s._count.status / (stats.totalOrders || 1)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold w-5 text-right">{s._count.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-gray-200">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <Clock size={16} />
          <h3 className="font-bold">Pedidos recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Pedido</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Estado</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Total</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats?.recentOrders.slice(0, 8).map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono font-semibold">{order.orderNumber}</td>
                  <td className="px-6 py-3">
                    <div className="text-sm font-medium">{order.customerName}</div>
                    <div className="text-xs text-gray-400">{order.customerEmail}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`badge text-xs ${
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-700'
                      : order.status === 'CANCELLED' ? 'bg-red-100 text-red-700'
                      : order.status === 'RECEIVED' ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-200 text-gray-700'
                    }`}>
                      {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-bold">${order.total.toLocaleString('es-AR')}</td>
                  <td className="px-6 py-3 text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
