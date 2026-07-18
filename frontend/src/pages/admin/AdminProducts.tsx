import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Eye, EyeOff, X, Star, Upload } from 'lucide-react'
import api from '../../services/api'
import { Product, Category } from '../../types'

interface VariantInput {
  label: string
  size: string
  paperType: string
  quantity: string
  price: string
  stock: string
}

const emptyVariant = (): VariantInput => ({ label: '', size: '', paperType: '', quantity: '', price: '', stock: '999' })

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', categoryId: '', subcategoryId: '',
    images: '', basePrice: '', featured: false, active: true,
  })
  const [variants, setVariants] = useState<VariantInput[]>([emptyVariant()])

  const fetch = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    const { data } = await api.get(`/admin/products?${params}`)
    setProducts(data.products)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [page])
  useEffect(() => {
    api.get('/admin/categories').then(r => setCategories(r.data))
  }, [])

  const openCreate = () => {
    setEditProduct(null)
    setForm({ name: '', description: '', categoryId: '', subcategoryId: '', images: '', basePrice: '', featured: false, active: true })
    setVariants([emptyVariant()])
    setUploadError('')
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditProduct(p)
    const imgs = JSON.parse(p.images || '[]')
    setForm({
      name: p.name, description: p.description,
      categoryId: p.categoryId, subcategoryId: p.subcategoryId || '',
      images: imgs.join('\n'), basePrice: String(p.basePrice),
      featured: p.featured, active: p.active,
    })
    setVariants(p.variants.length > 0 ? p.variants.map(v => ({
      label: v.label, size: v.size || '', paperType: v.paperType || '',
      quantity: String(v.quantity || ''), price: String(v.price), stock: String(v.stock),
    })) : [emptyVariant()])
    setUploadError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const images = form.images.split('\n').map(s => s.trim()).filter(Boolean)
      const payload = {
        ...form,
        images,
        basePrice: Number(form.basePrice),
        variants: variants.filter(v => v.label && v.price).map(v => ({
          label: v.label, size: v.size || null, paperType: v.paperType || null,
          quantity: v.quantity ? Number(v.quantity) : null,
          price: Number(v.price), stock: Number(v.stock || 999),
        })),
      }
      if (editProduct) await api.put(`/admin/products/${editProduct.id}`, payload)
      else await api.post('/admin/products', payload)
      setModalOpen(false)
      fetch()
    } finally {
      setSaving(false)
    }
  }

  const imageList = form.images.split('\n').map(s => s.trim()).filter(Boolean)

  const removeImage = (idx: number) => {
    setForm(f => ({ ...f, images: imageList.filter((_, i) => i !== idx).join('\n') }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const data = new FormData()
      data.append('image', file)
      const { data: res } = await api.post('/admin/upload', data)
      setForm(f => ({ ...f, images: [...imageList, res.url].join('\n') }))
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al subir la imagen'
      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }

  const toggleActive = async (p: Product) => {
    await api.put(`/admin/products/${p.id}`, { ...p, active: !p.active, images: JSON.parse(p.images || '[]') })
    fetch()
  }

  const selectedCategory = categories.find(c => c.id === form.categoryId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Productos</h1>
          <p className="text-gray-500 text-sm mt-1">{total} productos</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      <form onSubmit={e => { e.preventDefault(); setPage(1); fetch() }} className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-base pl-9 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." />
        </div>
        <button type="submit" className="btn-primary py-2 text-sm">Buscar</button>
      </form>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Producto</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Categoría</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Precio</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Variantes</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p => {
                  const imgs = JSON.parse(p.images || '[]')
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 flex-shrink-0 overflow-hidden">
                            {imgs[0] && <img src={imgs[0]} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-1">
                              {p.name}
                              {p.featured && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.category?.name}</td>
                      <td className="px-4 py-3 text-sm font-bold">${p.basePrice.toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.variants.length}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-black transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => toggleActive(p)} className="p-1.5 text-gray-400 hover:text-black transition-colors">
                            {p.active ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: Math.ceil(total / 20) }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`w-9 h-9 text-sm border transition-colors ${page === i + 1 ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-end overflow-auto" onClick={() => setModalOpen(false)}>
          <div className="bg-white w-full max-w-2xl min-h-screen p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black">{editProduct ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-160px)]">
              <div>
                <label className="label">Nombre del producto *</label>
                <input className="input-base" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea className="input-base resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Categoría *</label>
                  <select className="input-base" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value, subcategoryId: '' }))}>
                    <option value="">Seleccionar...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Subcategoría</label>
                  <select className="input-base" value={form.subcategoryId} onChange={e => setForm(f => ({ ...f, subcategoryId: e.target.value }))}>
                    <option value="">Ninguna</option>
                    {selectedCategory?.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Precio base *</label>
                <input className="input-base" type="number" value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))} />
              </div>
              <div>
                <label className="label">Imágenes</label>
                {imageList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {imageList.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 bg-gray-100 border border-gray-200 overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-0 right-0 bg-black/70 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className={`btn-secondary inline-flex items-center gap-2 text-sm cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={14} />
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                {uploadError && <p className="text-red-600 text-xs mt-2">{uploadError}</p>}
                <textarea
                  className="input-base resize-none font-mono text-xs mt-3"
                  rows={2}
                  value={form.images}
                  onChange={e => setForm(f => ({ ...f, images: e.target.value }))}
                  placeholder="O pegá URLs de imágenes, una por línea: https://..."
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                  Destacado
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                  Activo
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Variantes</label>
                  <button onClick={() => setVariants(v => [...v, emptyVariant()])} className="text-xs btn-ghost py-1 px-2">
                    <Plus size={12} /> Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {variants.map((v, i) => (
                    <div key={i} className="border border-gray-200 p-3 grid grid-cols-2 gap-2 relative">
                      <button onClick={() => setVariants(vv => vv.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                        <X size={12} />
                      </button>
                      <div className="col-span-2">
                        <input className="input-base py-2 text-sm" placeholder="Etiqueta (ej: x10 Brillante)" value={v.label} onChange={e => setVariants(vv => vv.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} />
                      </div>
                      <input className="input-base py-2 text-sm" placeholder="Tamaño (ej: 10x15)" value={v.size} onChange={e => setVariants(vv => vv.map((x, idx) => idx === i ? { ...x, size: e.target.value } : x))} />
                      <input className="input-base py-2 text-sm" placeholder="Papel (ej: Brillante)" value={v.paperType} onChange={e => setVariants(vv => vv.map((x, idx) => idx === i ? { ...x, paperType: e.target.value } : x))} />
                      <input className="input-base py-2 text-sm" type="number" placeholder="Cantidad" value={v.quantity} onChange={e => setVariants(vv => vv.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x))} />
                      <input className="input-base py-2 text-sm" type="number" placeholder="Precio *" value={v.price} onChange={e => setVariants(vv => vv.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : editProduct ? 'Guardar cambios' : 'Crear producto'}
                </button>
                <button onClick={() => setModalOpen(false)} className="btn-secondary px-4">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
