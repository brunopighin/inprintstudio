import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../../services/api'
import { Banner } from '../../types'

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; banner?: Banner }>({ open: false })
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', link: '', active: true, displayOrder: '0' })
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/admin/banners').then(r => { setBanners(r.data); setLoading(false) })
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setModal({ open: true })
    setForm({ title: '', subtitle: '', image: '', link: '', active: true, displayOrder: '0' })
  }

  const openEdit = (banner: Banner) => {
    setModal({ open: true, banner })
    setForm({ title: banner.title, subtitle: banner.subtitle || '', image: banner.image, link: banner.link || '', active: banner.active, displayOrder: String(banner.displayOrder) })
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = { ...form, displayOrder: Number(form.displayOrder) }
    if (modal.banner) await api.put(`/admin/banners/${modal.banner.id}`, payload)
    else await api.post('/admin/banners', payload)
    setSaving(false)
    setModal({ open: false })
    fetch()
  }

  const handleToggle = async (banner: Banner) => {
    await api.put(`/admin/banners/${banner.id}`, { ...banner, active: !banner.active })
    fetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este banner?')) return
    await api.delete(`/admin/banners/${id}`)
    fetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Banners</h1>
          <p className="text-gray-500 text-sm mt-1">{banners.length} banners</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2">
          <Plus size={16} /> Nuevo banner
        </button>
      </div>

      {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
        <div className="space-y-3">
          {banners.map(banner => (
            <div key={banner.id} className="bg-white border border-gray-200 flex gap-4 p-4">
              <div className="w-24 h-16 bg-gray-100 flex-shrink-0 overflow-hidden">
                <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{banner.title}</p>
                {banner.subtitle && <p className="text-xs text-gray-500 mt-0.5">{banner.subtitle}</p>}
                {banner.link && <p className="text-xs text-gray-400 mt-1 font-mono">{banner.link}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`badge text-xs ${banner.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {banner.active ? 'Activo' : 'Inactivo'}
                </span>
                <button onClick={() => openEdit(banner)} className="p-2 text-gray-400 hover:text-black transition-colors"><Pencil size={14} /></button>
                <button onClick={() => handleToggle(banner)} className={`p-2 transition-colors ${banner.active ? 'text-green-500 hover:text-gray-400' : 'text-gray-400 hover:text-green-500'}`}>
                  {banner.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => handleDelete(banner.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal({ open: false })}>
          <div className="bg-white w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{modal.banner ? 'Editar banner' : 'Nuevo banner'}</h3>
              <button onClick={() => setModal({ open: false })}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Título *</label>
                <input className="input-base" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Subtítulo</label>
                <input className="input-base" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
              </div>
              <div>
                <label className="label">URL de imagen *</label>
                <input className="input-base" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="https://..." />
                {form.image && <img src={form.image} alt="" className="mt-2 h-20 w-full object-cover border border-gray-200" onError={() => {}} />}
              </div>
              <div>
                <label className="label">Link (ruta interna)</label>
                <input className="input-base" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="/catalogo" />
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="label">Orden</label>
                  <input className="input-base" type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer pb-1">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                  Activo
                </label>
              </div>
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
