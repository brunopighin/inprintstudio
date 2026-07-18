import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingBag, Upload, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import api from '../services/api'
import { Product, ProductVariant } from '../types'
import { useCart } from '../context/CartContext'

export default function ProductDetail() {
  const { slug } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [currentImg, setCurrentImg] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/products/${slug}`)
      .then(r => {
        setProduct(r.data)
        if (r.data.variants.length > 0) setSelectedVariant(r.data.variants[0])
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [slug])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleAddToCart = () => {
    if (!product) return
    addItem(product, selectedVariant || undefined, quantity, photoPreview || undefined)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) return (
    <div className="container-main py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="skeleton aspect-square" />
        <div className="space-y-4">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-32 w-full mt-6" />
        </div>
      </div>
    </div>
  )

  if (!product) return (
    <div className="container-main py-20 text-center">
      <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
      <Link to="/catalogo" className="btn-primary">Ver catálogo</Link>
    </div>
  )

  const images = JSON.parse(product.images || '[]')
  const displayImages = images.length > 0 ? images : ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80']
  const currentPrice = selectedVariant?.price ?? product.basePrice

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100">
        <div className="container-main py-3 flex items-center gap-2 text-xs text-gray-400">
          <Link to="/" className="hover:text-black">Inicio</Link>
          <span>/</span>
          <Link to="/catalogo" className="hover:text-black">Catálogo</Link>
          <span>/</span>
          <Link to={`/catalogo/${product.category.slug}`} className="hover:text-black">{product.category.name}</Link>
          <span>/</span>
          <span className="text-gray-600">{product.name}</span>
        </div>
      </div>

      <div className="container-main py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-100 overflow-hidden group">
              <img
                src={photoPreview || displayImages[currentImg]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {photoPreview && (
                <div className="absolute top-3 left-3 bg-black text-white text-xs px-2 py-1">
                  Vista previa de tu foto
                </div>
              )}
              {displayImages.length > 1 && (
                <>
                  <button onClick={() => setCurrentImg(i => (i - 1 + displayImages.length) % displayImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setCurrentImg(i => (i + 1) % displayImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>

            {displayImages.length > 1 && (
              <div className="flex gap-2">
                {displayImages.map((img: string, idx: number) => (
                  <button key={idx} onClick={() => setCurrentImg(idx)}
                    className={`w-20 h-20 border-2 overflow-hidden flex-shrink-0 transition-colors ${idx === currentImg ? 'border-black' : 'border-transparent'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col">
            <div className="mb-1">
              <Link to={`/catalogo/${product.category.slug}`} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                {product.category.name}
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4">{product.name}</h1>

            {/* Price */}
            <div className="mb-6">
              <p className="text-4xl font-black">${currentPrice.toLocaleString('es-AR')}</p>
              {selectedVariant && <p className="text-sm text-gray-500 mt-1">{selectedVariant.label}</p>}
            </div>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed mb-8 text-sm">{product.description}</p>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mb-6">
                <label className="label">Seleccioná una opción</label>
                <div className="grid grid-cols-2 gap-2">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3 py-3 text-sm border-2 text-left transition-all ${selectedVariant?.id === v.id ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                      <span className="font-semibold block">{v.label}</span>
                      <span className={`text-xs ${selectedVariant?.id === v.id ? 'text-gray-300' : 'text-gray-500'}`}>${v.price.toLocaleString('es-AR')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Photo upload */}
            <div className="mb-6">
              <label className="label">Cargá tu foto</label>
              <label className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:border-black transition-colors group">
                {photoPreview ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 overflow-hidden">
                      <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-700 flex items-center gap-1"><Check size={14} /> Foto cargada</p>
                      <p className="text-xs text-gray-500">{photoFile?.name}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-gray-400 group-hover:text-black transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Subí tu imagen</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG o HEIC · Máx. 20 MB</p>
                    </div>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              {photoPreview && (
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  className="text-xs text-gray-400 hover:text-red-600 mt-2 transition-colors">
                  Eliminar foto
                </button>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-8">
              <label className="label">Cantidad de pedidos</label>
              <div className="flex items-center border border-gray-300 w-fit">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-lg">−</button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-lg">+</button>
              </div>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={product.variants.length > 0 && !selectedVariant}
              className={`btn-primary w-full py-4 text-base ${added ? 'bg-green-800' : ''}`}
            >
              {added ? (
                <><Check size={18} /> Agregado al carrito</>
              ) : (
                <><ShoppingBag size={18} /> Agregar al carrito</>
              )}
            </button>

            {product.variants.length > 0 && !selectedVariant && (
              <p className="text-xs text-center text-red-500 mt-2">Seleccioná una opción para continuar</p>
            )}

            {/* Info chips */}
            <div className="flex flex-wrap gap-2 mt-6">
              {['Impresión profesional', 'Procesado en 24-48h', 'Alta resolución'].map(tag => (
                <span key={tag} className="badge bg-gray-100 text-gray-600">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
