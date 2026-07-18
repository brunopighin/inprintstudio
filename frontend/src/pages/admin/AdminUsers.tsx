import { useEffect, useState } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../services/api'
import { Order, ORDER_STATUS_LABELS, OrderStatus } from '../../types'

interface AdminUser {
  id: string
  name: string
  email: string
  phone?: string
  createdAt: string
  _count: { orders: number }
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [userOrders, setUserOrders] = useState<Record<string, Order[]>>({})

  const fetchUsers = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    const { data } = await api.get(`/admin/users?${params}`)
    setUsers(data.users)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [page])

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!userOrders[id]) {
      const { data } = await api.get(`/admin/users/${id}/orders`)
      setUserOrders(o => ({ ...o, [id]: data }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{total} clientes registrados</p>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); setPage(1); fetchUsers() }} className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-base pl-9 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o email..." />
        </div>
        <button type="submit" className="btn-primary py-2 text-sm">Buscar</button>
      </form>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No hay clientes con esos criterios.</div>
        ) : (
          <div>
            {users.map(user => (
              <div key={user.id} className="border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                  <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 hidden sm:block">
                    <p>{user._count.orders} pedido{user._count.orders !== 1 ? 's' : ''}</p>
                    <p>Desde {new Date(user.createdAt).toLocaleDateString('es-AR')}</p>
                  </div>
                  <button onClick={() => toggleExpand(user.id)} className="p-2 text-gray-400 hover:text-black transition-colors">
                    {expandedId === user.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {expandedId === user.id && (
                  <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Historial de pedidos</p>
                    {!userOrders[user.id] ? (
                      <p className="text-xs text-gray-400">Cargando...</p>
                    ) : userOrders[user.id].length === 0 ? (
                      <p className="text-xs text-gray-400">Sin pedidos</p>
                    ) : (
                      <div className="space-y-2">
                        {userOrders[user.id].map(order => (
                          <div key={order.id} className="flex items-center justify-between text-sm bg-white border border-gray-200 px-3 py-2">
                            <span className="font-mono font-semibold">{order.orderNumber}</span>
                            <span className={`badge text-xs ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                            </span>
                            <span className="font-bold">${order.total.toLocaleString('es-AR')}</span>
                            <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('es-AR')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: Math.ceil(total / 20) }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`w-9 h-9 text-sm border transition-colors ${page === i + 1 ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  )
}
