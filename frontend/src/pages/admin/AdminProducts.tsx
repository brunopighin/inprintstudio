import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Eye, EyeOff, X, Star, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../services/api'
import { Product, Category } from '../../types'

interface VariantInput {
  label: string
  size: string
  paperType: string
  quantity: string
  price: string
  stock: string
  weightGrams: string
  lengthCm: string
  widthCm: string
  heightCm: string
}

const emptyVariant = (): VariantInput => ({
  label: '', size: '', paperType: '', quantity: '', price: '', stock: '999',
  weightGrams: '', lengthCm: '', widthCm: '', heightCm: '',
})

// Mismo criterio que valida el backend: sin peso y medidas no se puede cotizar
// el envío, y vale cargarlo en el producto o en todas sus variantes.
interface PackageData {
  weightGrams?: string | number | null
  lengthCm?: string | number | null
  widthCm?: string | number | null
  heightCm?: string | number | null
}

const hasPackageData = (v: PackageData) =>
  [v.weightGrams, v.lengthCm, v.widthCm, v.heightCm].every(n => Number(n) > 0)

const money = (n: number) => `$${n.toLocaleString('es-AR')}`

// Con variantes el precio real es el de cada una, no el base
const priceLabel = (p: Product) => {
  if (!p.variants.length) return money(p.basePrice)
  const prices = p.variants.map(v => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? money(min) : `${money(min)} – ${money(max)}`
}

const packageIncomplete = (p: Product) =>
  !hasPackageData(p) && !(p.variants.length && p.variants.every(hasPackageData))

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [activating, setActivating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [missingPackageData, setMissingPackageData] = useState(0)

  const [form, setForm] = useState({
    name: '', description: '', categoryId: '', subcategoryId: '',
    images: '', basePrice: '', featured: false, active: true,
    weightGrams: '', lengthCm: '', widthCm: '', heightCm: '',
  })
  const [variants, setVariants] = useState<VariantInput[]>([emptyVariant()])

  const fetch = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    if (categoryFilter) params.set('category', categoryFilter)
    const { data } = await api.get(`/admin/products?${params}`)
    setProducts(data.products)
    setTotal(data.total)
    setMissingPackageData(data.missingPackageData ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [page, categoryFilter])
  useEffect(() => {
    api.get('/admin/categories').then(r => setCategories(r.data))
  }, [])

  const handleBulkActivate = async () => {
    const scope = [search && `que coincidan con "${search}"`, categoryFilter && `de la categoría filtrada`].filter(Boolean).join(' y ')
    if (!confirm(`¿Activar todos los productos inactivos${scope ? ' ' + scope : ''}? Van a aparecer en la tienda con el precio que tengan cargado.`)) return
    setActivating(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category', categoryFilter)
      const { data } = await api.patch(`/admin/products/bulk-activate?${params}`)
      alert(`${data.count} producto(s) activado(s).`)
      fetch()
    } finally {
      setActivating(false)
    }
  }

  const openCreate = () => {
    setEditProduct(null)
    setForm({ name: '', description: '', categoryId: '', subcategoryId: '', images: '', basePrice: '', featured: false, active: true, weightGrams: '', lengthCm: '', widthCm: '', heightCm: '' })
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
      weightGrams: String(p.weightGrams ?? ''), lengthCm: String(p.lengthCm ?? ''),
      widthCm: String(p.widthCm ?? ''), heightCm: String(p.heightCm ?? ''),
    })
    setVariants(p.variants.length > 0 ? p.variants.map(v => ({
      label: v.label, size: v.size || '', paperType: v.paperType || '',
      quantity: String(v.quantity || ''), price: String(v.price), stock: String(v.stock),
      weightGrams: String(v.weightGrams ?? ''), lengthCm: String(v.lengthCm ?? ''),
      widthCm: String(v.widthCm ?? ''), heightCm: String(v.heightCm ?? ''),
    })) : [emptyVariant()])
    setUploadError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    // Una variante a medio cargar no se descarta en silencio: antes, borrar el precio y guardar eliminaba la variante
    const usableVariants = variants.filter(v => v.label.trim() || v.price.trim())
    if (usableVariants.some(v => !v.label.trim())) {
      setFormError('Cada variante necesita un nombre (ej: 10x15 cm).')
      return
    }
    if (usableVariants.some(v => v.price.trim() === '' || Number(v.price) < 0)) {
      setFormError('Cargá el precio de cada variante (puede ser 0).')
      return
    }
    if (!usableVariants.length && form.basePrice.trim() === '') {
      setFormError('Cargá el precio del producto.')
      return
    }
    if (!hasPackageData(form) && !(usableVariants.length && usableVariants.every(hasPackageData))) {
      setFormError('Cargá peso y medidas del paquete para poder cotizar el envío. Si cada variante tiene un tamaño distinto, completalas en todas las variantes.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const images = form.images.split('\n').map(s => s.trim()).filter(Boolean)
      const payload = {
        ...form,
        images,
        // Con variantes, el precio base no se muestra: se guarda el más barato para que "Desde $…" sea coherente
        basePrice: usableVariants.length ? Math.min(...usableVariants.map(v => Number(v.price))) : Number(form.basePrice),
        variants: usableVariants.map(v => ({
          label: v.label.trim(), size: v.size || null, paperType: v.paperType || null,
          quantity: v.quantity ? Number(v.quantity) : null,
          price: Number(v.price), stock: Number(v.stock || 999),
          weightGrams: v.weightGrams || null, lengthCm: v.lengthCm || null,
          widthCm: v.widthCm || null, heightCm: v.heightCm || null,
        })),
      }
      if (editProduct) await api.put(`/admin/products/${editProduct.id}`, payload)
      else await api.post('/admin/products', payload)
      setModalOpen(false)
      fetch()
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'No se pudo guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  const imageList = form.images.split('\n').map(s => s.trim()).filter(Boolean)
  const hasVariantsInForm = variants.some(v => v.label.trim() || v.price.trim())

  const setVariant = (i: number, field: keyof VariantInput, value: string) =>
    setVariants(vv => vv.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)))

  const removeImage = (idx: number) => {
    setForm(f => ({ ...f, images: imageList.filter((_, i) => i !== idx).join('\n') }))
  }

  // La primera imagen es la portada que se ve en el catálogo
  const moveImageTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= imageList.length) return
    const next = [...imageList]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setForm(f => ({ ...f, images: next.join('\n') }))
  }
  const moveImage = (idx: number, delta: number) => moveImageTo(idx, idx + delta)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    setUploadError('')
    const failed: string[] = []
    // De a una, en el orden elegido, y agregando cada una apenas sube para no perder las que ya subieron si otra falla
    for (const [i, file] of files.entries()) {
      setUploadProgress(files.length > 1 ? `${i + 1}/${files.length}` : '')
      try {
        const data = new FormData()
        data.append('image', file)
        const { data: res } = await api.post('/admin/upload', data)
        setForm(f => ({ ...f, images: [...f.images.split('\n').map(s => s.trim()).filter(Boolean), res.url].join('\n') }))
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al subir la imagen'
        failed.push(`${file.name}: ${message}`)
      }
    }
    if (failed.length) setUploadError(`No se pudieron subir: ${failed.join(' · ')}`)
    setUploadProgress('')
    setUploading(false)
  }

  const toggleActive = async (p: Product) => {
    await api.patch(`/admin/products/${p.id}/active`, { active: !p.active })
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

      <form onSubmit={e => { e.preventDefault(); setPage(1); fetch() }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-base pl-9 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." />
        </div>
        <select
          className="input-base py-2 text-sm max-w-xs"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <button type="submit" className="btn-primary py-2 text-sm">Buscar</button>
        <button
          type="button"
          onClick={handleBulkActivate}
          disabled={activating}
          className="ml-auto py-2 px-4 text-sm font-semibold border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          {activating ? 'Activando...' : 'Activar todos los filtrados'}
        </button>
      </form>

      {missingPackageData > 0 && (
        <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3">
          <strong>{missingPackageData}</strong> {missingPackageData === 1 ? 'producto no tiene' : 'productos no tienen'} peso ni medidas cargados.
          El envío de esos productos se cotiza con un paquete por defecto, así que el precio que ve el comprador no es el real.
          Editalos y completá <em>Peso y medidas del paquete</em>.
        </div>
      )}

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
                              {packageIncomplete(p) && (
                                <span className="badge bg-amber-100 text-amber-700 ml-1" title="Sin peso ni medidas: el envío se cotiza con un paquete por defecto">sin peso</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.category?.name}</td>
                      <td className="px-4 py-3 text-sm font-bold">{priceLabel(p)}</td>
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
                <label className="label">Precio *</label>
                {hasVariantsInForm ? (
                  <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 px-3 py-2">
                    Este producto tiene variantes: el precio se carga en cada una, más abajo.
                  </p>
                ) : (
                  <input className="input-base" type="number" min="0" value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))} />
                )}
              </div>
              <div>
                <label className="label mb-2">Peso y medidas del paquete *</label>
                <p className="text-xs text-gray-400 -mt-1 mb-2">Obligatorios: sin estos datos no se puede cotizar el envío y el comprador ve un precio que no es el real. Si el producto tiene variantes de distinto tamaño, cargalas ahí en vez de acá.</p>
                <div className="grid grid-cols-4 gap-2">
                  <input className="input-base py-2 text-sm" type="number" placeholder="Peso (g)" value={form.weightGrams} onChange={e => setForm(f => ({ ...f, weightGrams: e.target.value }))} />
                  <input className="input-base py-2 text-sm" type="number" placeholder="Largo (cm)" value={form.lengthCm} onChange={e => setForm(f => ({ ...f, lengthCm: e.target.value }))} />
                  <input className="input-base py-2 text-sm" type="number" placeholder="Ancho (cm)" value={form.widthCm} onChange={e => setForm(f => ({ ...f, widthCm: e.target.value }))} />
                  <input className="input-base py-2 text-sm" type="number" placeholder="Alto (cm)" value={form.heightCm} onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Imágenes</label>
                {imageList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {imageList.map((url, idx) => (
                      <div
                        key={`${idx}-${url}`}
                        draggable
                        onDragStart={e => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }}
                        onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
                        onDragLeave={() => setDragOverIdx(i => (i === idx ? null : i))}
                        onDrop={e => { e.preventDefault(); if (dragIdx !== null) moveImageTo(dragIdx, idx); setDragIdx(null); setDragOverIdx(null) }}
                        onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                        className={`relative w-24 h-24 bg-gray-100 border-2 overflow-hidden cursor-move transition-all ${dragOverIdx === idx && dragIdx !== idx ? 'border-black scale-105' : 'border-gray-200'} ${dragIdx === idx ? 'opacity-40' : ''}`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                        {idx === 0 && (
                          <span className="absolute top-0 left-0 bg-black text-white text-[10px] px-1 leading-4">Portada</span>
                        )}
                        <button
                          type="button"
                          aria-label="Quitar imagen"
                          onClick={() => removeImage(idx)}
                          className="absolute top-0 right-0 bg-black/70 text-white p-0.5 hover:bg-red-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                        {imageList.length > 1 && (
                          <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                            <button
                              type="button"
                              aria-label="Mover a la izquierda"
                              onClick={() => moveImage(idx, -1)}
                              disabled={idx === 0}
                              className="bg-black/70 text-white p-1 hover:bg-black disabled:invisible"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label="Mover a la derecha"
                              onClick={() => moveImage(idx, 1)}
                              disabled={idx === imageList.length - 1}
                              className="bg-black/70 text-white p-1 hover:bg-black disabled:invisible"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <label className={`btn-secondary inline-flex items-center gap-2 text-sm cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={14} />
                  {uploading ? `Subiendo${uploadProgress ? ` ${uploadProgress}` : ''}...` : 'Subir imágenes'}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                <p className="text-xs text-gray-400 mt-1">Podés elegir varias fotos a la vez. La primera es la portada del catálogo. Para cambiar el orden, arrastrá las fotos o usá las flechas.</p>
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
                      <div className="col-span-2 grid grid-cols-3 gap-2 pr-5">
                        <div className="col-span-2">
                          <span className="block text-[11px] text-gray-500 mb-0.5">Nombre (lo que ve el cliente) *</span>
                          <input className="input-base py-2 text-sm" placeholder="ej: 10x15 cm" value={v.label} onChange={e => setVariant(i, 'label', e.target.value)} />
                        </div>
                        <div>
                          <span className="block text-[11px] text-gray-500 mb-0.5">Precio *</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                            <input className="input-base py-2 pl-5 text-sm font-semibold" type="number" min="0" placeholder="0" value={v.price} onChange={e => setVariant(i, 'price', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[11px] text-gray-500 mb-0.5">Tamaño</span>
                        <input className="input-base py-2 text-sm" placeholder="ej: 10x15" value={v.size} onChange={e => setVariant(i, 'size', e.target.value)} />
                      </div>
                      <div>
                        <span className="block text-[11px] text-gray-500 mb-0.5">Papel</span>
                        <input className="input-base py-2 text-sm" placeholder="ej: Brillante" value={v.paperType} onChange={e => setVariant(i, 'paperType', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[11px] text-gray-500 mb-0.5">Cantidad</span>
                        <input className="input-base py-2 text-sm" type="number" placeholder="ej: 10" value={v.quantity} onChange={e => setVariant(i, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-2 pt-1 border-t border-gray-100 mt-1">
                        <span className="block text-[11px] text-gray-500 mb-0.5">Paquete para el envío: peso (g), largo, ancho y alto (cm)</span>
                        <div className="grid grid-cols-4 gap-2">
                          <input className="input-base py-1.5 text-xs" type="number" placeholder="Peso (g)" value={v.weightGrams} onChange={e => setVariant(i, 'weightGrams', e.target.value)} />
                          <input className="input-base py-1.5 text-xs" type="number" placeholder="Largo" value={v.lengthCm} onChange={e => setVariant(i, 'lengthCm', e.target.value)} />
                          <input className="input-base py-1.5 text-xs" type="number" placeholder="Ancho" value={v.widthCm} onChange={e => setVariant(i, 'widthCm', e.target.value)} />
                          <input className="input-base py-1.5 text-xs" type="number" placeholder="Alto" value={v.heightCm} onChange={e => setVariant(i, 'heightCm', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{formError}</p>
              )}

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
