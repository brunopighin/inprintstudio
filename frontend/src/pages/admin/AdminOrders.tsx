import { useEffect, useState } from 'react'
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import api from '../../services/api'
import { Order, ORDER_STATUS_LABELS, OrderStatus } from '../../types'

const STATUSES: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'RECEIVED', label: 'Recibidos' },
  { key: 'IN_PRODUCTION', label: 'En producción' },
  { key: 'READY', label: 'Listos' },
  { key: 'SHIPPED', label: 'Enviados' },
  { key: 'DELIVERED', label: 'Entregados' },
  { key: 'CANCELLED', label: 'Cancelados' },
]

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEIVED: 'IN_PRODUCTION',
  IN_PRODUCTION: 'READY',
  READY: 'SHIPPED',
  SHIPPED: 'DELIVERED',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (search) params.set('search', search)
    const { data } = await api.get(`/admin/orders?${params}`)
    setOrders(data.orders)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [statusFilter, page])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchOrders() }

  const advanceStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status as OrderStatus]
    if (!next) return
    await api.patch(`/admin/orders/${order.id}/status`, { status: next })
    fetchOrders()
  }

  const cancelOrder = async (order: Order) => {
    if (!confirm('¿Cancelar este pedido?')) return
    await api.patch(`/admin/orders/${order.id}/status`, { status: 'CANCELLED' })
    fetchOrders()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">{total} pedido{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-base pl-9 py-2 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Número, cliente, email..."
          />
        </form>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map(s => (
            <button
              key={s.key}
              onClick={() => { setStatusFilter(s.key); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${statusFilter === s.key ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No hay pedidos con esos filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 w-8" />
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Pedido</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Fecha</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => (
                  <>
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="text-gray-400 hover:text-black">
                          {expandedId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono font-semibold">{order.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{order.customerName}</div>
                        <div className="text-xs text-gray-400">{order.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-700'
                          : order.status === 'CANCELLED' ? 'bg-red-100 text-red-700'
                          : order.status === 'RECEIVED' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-200 text-gray-700'
                        }`}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">${order.total.toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es-AR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {NEXT_STATUS[order.status as OrderStatus] && (
                            <button onClick={() => advanceStatus(order)} className="text-xs bg-black text-white px-2.5 py-1.5 hover:bg-gray-800 transition-colors whitespace-nowrap">
                              → {ORDER_STATUS_LABELS[NEXT_STATUS[order.status as OrderStatus]!]}
                            </button>
                          )}
                          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                            <button onClick={() => cancelOrder(order)} className="text-xs border border-red-300 text-red-600 px-2.5 py-1.5 hover:bg-red-50 transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-expanded`}>
                        <td colSpan={7} className="bg-gray-50 border-b border-gray-200">
                          <div className="px-8 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Productos</p>
                              <div className="space-y-2">
                                {order.items?.map(item => (
                                  <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{item.product?.name} {item.variant && `(${item.variant.label})`} ×{item.quantity}</span>
                                    <span className="font-medium">${(item.price * item.quantity).toLocaleString('es-AR')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Detalles</p>
                              <div className="text-sm space-y-1 text-gray-600">
                                <p>Teléfono: {order.customerPhone || '—'}</p>
                                <p>Envío: {order.shippingMethod === 'pickup' ? 'Retiro en local' : 'Envío a domicilio'}</p>
                                <p>Pago: {order.paymentMethod === 'mercadopago' ? 'MercadoPago' : 'Transferencia'}</p>
                                {order.shippingAddress && <p>Dirección: {order.shippingAddress}</p>}
                                {order.notes && <p>Notas: {order.notes}</p>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: Math.ceil(total / 20) }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`w-9 h-9 text-sm font-medium border transition-colors ${page === i + 1 ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
