import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../../services/api'

interface Promotion {
  id: string
  name: string
  code: string
  discount: number
  type: string
  active: boolean
  expiresAt?: string
  createdAt: string
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; promo?: Promotion }>({ open: false })
  const [form, setForm] = useState({ name: '', code: '', discount: '', type: 'percentage', active: true, expiresAt: '' })
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/admin/promotions').then(r => { setPromotions(r.data); setLoading(false) })
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setModal({ open: true })
    setForm({ name: '', code: '', discount: '', type: 'percentage', active: true, expiresAt: '' })
  }

  const openEdit = (promo: Promotion) => {
    setModal({ open: true, promo })
    setForm({
      name: promo.name, code: promo.code, discount: String(promo.discount),
      type: promo.type, active: promo.active,
      expiresAt: promo.expiresAt ? promo.expiresAt.split('T')[0] : '',
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = { ...form, discount: Number(form.discount) }
    if (modal.promo) await api.put(`/admin/promotions/${modal.promo.id}`, payload)
    else await api.post('/admin/promotions', payload)
    setSaving(false)
    setModal({ open: false })
    fetch()
  }

  const handleToggle = async (promo: Promotion) => {
    await api.put(`/admin/promotions/${promo.id}`, { ...promo, active: !promo.active })
    fetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return
    await api.delete(`/admin/promotions/${id}`)
    fetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Promociones</h1>
          <p className="text-gray-500 text-sm mt-1">{promotions.length} códigos de descuento</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2">
          <Plus size={16} /> Nueva promoción
        </button>
      </div>

      {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Código</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Descuento</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Vence</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promotions.map(promo => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{promo.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-sm bg-gray-100 px-2 py-0.5">{promo.code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {promo.type === 'percentage' ? `${promo.discount}%` : `$${promo.discount.toLocaleString('es-AR')}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${promo.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {promo.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(promo)} className="p-1.5 text-gray-400 hover:text-black transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleToggle(promo)} className={`p-1.5 transition-colors ${promo.active ? 'text-green-500 hover:text-gray-400' : 'text-gray-400 hover:text-green-500'}`}>
                        {promo.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button onClick={() => handleDelete(promo.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal({ open: false })}>
          <div className="bg-white w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{modal.promo ? 'Editar promoción' : 'Nueva promoción'}</h3>
              <button onClick={() => setModal({ open: false })}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input className="input-base" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: 20% OFF en fotolibros" />
              </div>
              <div>
                <label className="label">Código *</label>
                <input className="input-base uppercase" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="EJEMPLO20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo</label>
                  <select className="input-base" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Descuento *</label>
                  <input className="input-base" type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder={form.type === 'percentage' ? '20' : '500'} />
                </div>
              </div>
              <div>
                <label className="label">Fecha de vencimiento (opcional)</label>
                <input className="input-base" type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                Activa
              </label>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => setModal({ open: false })} className="btn-secondary px-4">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
