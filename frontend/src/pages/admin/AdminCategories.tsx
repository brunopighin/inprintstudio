import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../services/api'
import { Category } from '../../types'

export default function AdminCategories() {
  const [categories, setCategories] = useState<(Category & { _count?: { products: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; cat?: Category }>({ open: false })
  const [subModal, setSubModal] = useState<{ open: boolean; catId?: string; name: string }>({ open: false, name: '' })
  const [form, setForm] = useState({ name: '', description: '', image: '', displayOrder: '0', active: true })
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/admin/categories').then(r => { setCategories(r.data); setLoading(false) })
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setModal({ open: true })
    setForm({ name: '', description: '', image: '', displayOrder: '0', active: true })
  }

  const openEdit = (cat: Category) => {
    setModal({ open: true, cat })
    setForm({ name: cat.name, description: cat.description || '', image: cat.image || '', displayOrder: String(cat.displayOrder), active: cat.active })
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = { ...form, displayOrder: Number(form.displayOrder) }
    if (modal.cat) await api.put(`/admin/categories/${modal.cat.id}`, payload)
    else await api.post('/admin/categories', payload)
    setSaving(false)
    setModal({ open: false })
    fetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Se eliminará junto a todas sus subcategorías.')) return
    await api.delete(`/admin/categories/${id}`)
    fetch()
  }

  const handleAddSub = async () => {
    if (!subModal.catId || !subModal.name) return
    await api.post(`/admin/categories/${subModal.catId}/subcategories`, { name: subModal.name })
    setSubModal({ open: false, name: '' })
    fetch()
  }

  const handleDeleteSub = async (id: string) => {
    if (!confirm('¿Eliminar esta subcategoría?')) return
    await api.delete(`/admin/categories/subcategories/${id}`)
    fetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Categorías</h1>
          <p className="text-gray-500 text-sm mt-1">{categories.length} categorías</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2">
          <Plus size={16} /> Nueva categoría
        </button>
      </div>

      {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white border border-gray-200">
              <div className="flex items-center gap-4 p-4">
                {cat.image && (
                  <div className="w-10 h-10 bg-gray-100 flex-shrink-0 overflow-hidden">
                    <img src={cat.image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat._count?.products || 0} productos · {cat.subcategories.length} subcategorías</p>
                </div>
                <span className={`badge ${cat.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {cat.active ? 'Activa' : 'Inactiva'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cat)} className="p-2 text-gray-400 hover:text-black transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  <button onClick={() => setExpanded(expanded === cat.id ? null : cat.id)} className="p-2 text-gray-400 hover:text-black transition-colors">
                    {expanded === cat.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {expanded === cat.id && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="flex items-center justify-between mb-3 mt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Subcategorías</p>
                    <button onClick={() => setSubModal({ open: true, catId: cat.id, name: '' })} className="text-xs btn-ghost py-1 px-2">
                      <Plus size={12} /> Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.subcategories.length === 0 ? (
                      <p className="text-xs text-gray-400">Sin subcategorías</p>
                    ) : cat.subcategories.map(sub => (
                      <div key={sub.id} className="flex items-center gap-1 bg-gray-100 px-2.5 py-1.5 text-xs">
                        {sub.name}
                        <button onClick={() => handleDeleteSub(sub.id)} className="ml-1 text-gray-400 hover:text-red-500">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal({ open: false })}>
          <div className="bg-white w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{modal.cat ? 'Editar categoría' : 'Nueva categoría'}</h3>
              <button onClick={() => setModal({ open: false })}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input className="input-base" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea className="input-base resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">URL de imagen</label>
                <input className="input-base" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Orden</label>
                  <input className="input-base" type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value }))} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                    Activa
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => setModal({ open: false })} className="btn-secondary px-4">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory modal */}
      {subModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSubModal({ open: false, name: '' })}>
          <div className="bg-white w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Nueva subcategoría</h3>
              <button onClick={() => setSubModal({ open: false, name: '' })}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input className="input-base" value={subModal.name} onChange={e => setSubModal(s => ({ ...s, name: e.target.value }))} autoFocus />
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddSub} disabled={!subModal.name} className="btn-primary flex-1">Agregar</button>
                <button onClick={() => setSubModal({ open: false, name: '' })} className="btn-secondary px-4">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
