import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingBag, Upload, Check, Crop as CropIcon, Loader2, RotateCw, X } from 'lucide-react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import api from '../services/api'
import { Product, ProductVariant } from '../types'
import { useCart } from '../context/CartContext'
import ImageSlider from '../components/product/ImageSlider'
import ProductDescription from '../components/product/ProductDescription'
import FramedPhoto from '../components/product/FramedPhoto'
import { getPhotoFormat } from '../utils/photoFormats'

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'Vertical', value: 2 / 3 },
  { label: 'Libre', value: undefined },
]

function centeredCropFor(aspect: number | undefined, mediaWidth: number, mediaHeight: number): Crop {
  if (!aspect) {
    return { unit: '%', x: 5, y: 5, width: 90, height: 90 }
  }
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  )
}

function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  canvas.width = Math.round(crop.width * scaleX)
  canvas.height = Math.round(crop.height * scaleY)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY,
    0, 0, canvas.width, canvas.height
  )
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}

// Recorte centrado al formato del producto, para los packs: cada foto ya queda en
// la proporción correcta y el cliente la ajusta solo si quiere. Si el navegador no
// puede abrir la imagen (ej. HEIC fuera de Safari) devuelve null y se sube la original.
async function centerCropToAspect(src: string, aspect: number): Promise<Blob | null> {
  const img = new Image()
  img.src = src
  try { await img.decode() } catch { return null }
  const { naturalWidth: w, naturalHeight: h } = img
  const cropW = Math.min(w, h * aspect)
  const cropH = cropW / aspect
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cropW)
  canvas.height = Math.round(cropH)
  canvas.getContext('2d')!.drawImage(img, (w - cropW) / 2, (h - cropH) / 2, cropW, cropH, 0, 0, canvas.width, canvas.height)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}

// Una foto del cliente. Se sube al servidor apenas se elige (o apenas se recorta),
// así el carrito y el pedido solo llevan URLs aunque sea un pack de 100 fotos.
interface CustomerPhoto {
  id: number
  original: File
  originalSrc: string // object URL del original, para poder volver a recortar
  previewSrc: string // object URL de lo que se sube (recortado o no)
  url?: string
  status: 'cropping' | 'uploading' | 'done' | 'error'
  error?: string
}

const UPLOAD_CONCURRENCY = 3
let photoCounter = 0

export default function ProductDetail() {
  const { slug } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [currentImg, setCurrentImg] = useState(0)
  const [photos, setPhotos] = useState<CustomerPhoto[]>([])
  const [photoNotice, setPhotoNotice] = useState('')
  const [added, setAdded] = useState(false)

  const [cropTargetId, setCropTargetId] = useState<number | null>(null)
  const [aspectPreset, setAspectPreset] = useState<number | undefined>(2 / 3)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)

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

  // Cuántas fotos pide la variante elegida (campo "Fotos que sube el cliente" del admin)
  // Fotos por unidad según la variante (campo "Fotos que sube el cliente" del admin).
  // Con varias unidades el cliente elige: las mismas fotos para todas (photosPerUnit)
  // o fotos distintas para cada una (maxPhotos). Otra cantidad sería ambigua.
  const photosPerUnit = Math.max(1, selectedVariant?.quantity || 1)
  const maxPhotos = photosPerUnit * quantity
  const validCounts = maxPhotos === photosPerUnit ? [photosPerUnit] : [photosPerUnit, maxPhotos]
  // Formato fijo del producto (Polaroid, Instax...); sin formato, el cliente elige el recorte
  const photoFormat = getPhotoFormat(product?.photoFormat)
  const cropTarget = photos.find(p => p.id === cropTargetId)

  const updatePhoto = (id: number, patch: Partial<CustomerPhoto>) =>
    setPhotos(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)))

  const uploadPhoto = async (id: number, blob: Blob, filename: string) => {
    updatePhoto(id, { status: 'uploading', error: undefined })
    try {
      const data = new FormData()
      data.append('photo', blob, filename)
      const { data: res } = await api.post('/uploads/photo', data)
      updatePhoto(id, { status: 'done', url: res.url })
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'No se pudo subir'
      updatePhoto(id, { status: 'error', error: message })
    }
  }

  const openCropperFor = (id: number) => {
    setCropTargetId(id)
    setAspectPreset(photoFormat?.aspect ?? 2 / 3)
    setCrop(undefined)
    setCompletedCrop(undefined)
  }

  const releasePhoto = (p: CustomerPhoto) => {
    URL.revokeObjectURL(p.originalSrc)
    if (p.previewSrc !== p.originalSrc) URL.revokeObjectURL(p.previewSrc)
  }

  const removePhoto = (id: number) => {
    setPhotos(ps => {
      const p = ps.find(x => x.id === id)
      if (p) releasePhoto(p)
      return ps.filter(x => x.id !== id)
    })
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const slots = maxPhotos - photos.length
    const accepted = files.slice(0, Math.max(0, slots))
    setPhotoNotice(files.length > accepted.length
      ? `Elegiste ${files.length} fotos y entran ${maxPhotos}: se usaron las primeras ${accepted.length}.`
      : '')
    if (!accepted.length) return

    const entries: CustomerPhoto[] = accepted.map(file => {
      const src = URL.createObjectURL(file)
      return { id: ++photoCounter, original: file, originalSrc: src, previewSrc: src, status: maxPhotos === 1 ? 'cropping' : 'uploading' }
    })
    setPhotos(ps => [...ps, ...entries])

    // Con una sola foto se mantiene el flujo de siempre: recortar y después subir.
    // En un pack se suben directo y el recorte queda opcional por foto.
    if (maxPhotos === 1) {
      openCropperFor(entries[0].id)
      return
    }
    const queue = [...entries]
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const cropped = photoFormat ? await centerCropToAspect(next.originalSrc, photoFormat.aspect) : null
        if (cropped) {
          updatePhoto(next.id, { previewSrc: URL.createObjectURL(cropped) })
          await uploadPhoto(next.id, cropped, next.original.name.replace(/.w+$/, '') + '-recorte.jpg')
        } else {
          await uploadPhoto(next.id, next.original, next.original.name)
        }
      }
    }
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker))
  }

  const retryPhoto = async (p: CustomerPhoto) => {
    // Se reintenta con lo mismo que se había querido subir (incluido el recorte)
    const blob = await fetch(p.previewSrc).then(r => r.blob())
    await uploadPhoto(p.id, blob, p.original.name)
  }

  const cancelCrop = () => {
    // Si la foto todavía no se había subido nunca, cancelar el recorte es no usarla
    if (cropTarget?.status === 'cropping') removePhoto(cropTarget.id)
    setCropTargetId(null)
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const initial = centeredCropFor(aspectPreset, width, height)
    setCrop(initial)
    // ReactCrop no avisa onComplete con el recorte inicial: sin esto, "Usar esta foto" sin mover el recuadro no hacía nada
    setCompletedCrop(convertToPixelCrop(initial, width, height))
  }

  const handleAspectChange = (aspect: number | undefined) => {
    setAspectPreset(aspect)
    if (imgRef.current) {
      const next = centeredCropFor(aspect, imgRef.current.width, imgRef.current.height)
      setCrop(next)
      setCompletedCrop(convertToPixelCrop(next, imgRef.current.width, imgRef.current.height))
    }
  }

  const confirmCrop = async () => {
    if (!cropTarget || !imgRef.current || !completedCrop?.width || !completedCrop?.height) return
    const blob = await getCroppedBlob(imgRef.current, completedCrop)
    if (!blob) return
    if (cropTarget.previewSrc !== cropTarget.originalSrc) URL.revokeObjectURL(cropTarget.previewSrc)
    updatePhoto(cropTarget.id, { previewSrc: URL.createObjectURL(blob) })
    setCropTargetId(null)
    await uploadPhoto(cropTarget.id, blob, cropTarget.original.name.replace(/\.\w+$/, '') + '-recorte.jpg')
  }

  const fotos = (n: number) => `${n} ${n === 1 ? 'foto' : 'fotos'}`

  function photoCountHint() {
    if (validCounts.length === 1) {
      const missing = maxPhotos - photos.length
      return `Te ${missing === 1 ? 'falta 1 foto' : `faltan ${missing} fotos`} (cargaste ${photos.length} de ${maxPhotos}).`
    }
    return `Cargaste ${fotos(photos.length)}: tienen que ser ${photosPerUnit} (${photosPerUnit === 1 ? 'se repite' : 'se repiten'} en las ${quantity} copias) o ${maxPhotos} (distintas para cada copia).`
  }

  const uploadingCount = photos.filter(p => p.status === 'uploading' || p.status === 'cropping').length
  const failedCount = photos.filter(p => p.status === 'error').length
  // Las fotos siguen siendo opcionales (se pueden mandar después), pero si empezó a cargarlas tienen que ser justas
  const photoProblem =
    uploadingCount ? `Subiendo fotos (${photos.length - uploadingCount}/${photos.length})...`
    : failedCount ? `${failedCount === 1 ? 'Una foto no se pudo subir' : `${failedCount} fotos no se pudieron subir`}: reintentá o quitala.`
    : photos.length > maxPhotos ? `Entran hasta ${maxPhotos} ${maxPhotos === 1 ? 'foto' : 'fotos'}: quitá ${photos.length - maxPhotos}.`
    : photos.length > 0 && !validCounts.includes(photos.length) ? photoCountHint()
    : ''

  const handleAddToCart = () => {
    if (!product || photoProblem) return
    addItem(product, selectedVariant || undefined, quantity, photos.map(p => p.url!))
    // Las fotos ya quedaron en el carrito; se limpia para que el próximo pack arranque de cero
    photos.forEach(releasePhoto)
    setPhotos([])
    setPhotoNotice('')
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
  // Con una sola foto se muestra grande en la galería, como antes; en un pack se ven en la grilla
  // Si cambió de un pack a una opción de 1 foto con varias ya cargadas, se sigue viendo la grilla para poder quitar las que sobran
  const singleMode = maxPhotos === 1 && photos.length <= 1
  const singlePhoto = singleMode && photos[0]?.status !== 'cropping' ? photos[0] : undefined
  const photoPreview = singlePhoto?.previewSrc

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
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              {photoPreview ? (
                <>
                  {photoFormat ? (
                    <div className="w-full h-full flex items-center justify-center p-8 sm:p-12">
                      <FramedPhoto
                        src={photoPreview}
                        format={photoFormat}
                        className="w-full"
                        // Que entre en el cuadrado: las verticales se achican según su proporción
                        style={{ maxWidth: `${Math.min(100, photoFormat.aspect * 100 * (photoFormat.frame ? 0.82 : 1))}%` }}
                      />
                    </div>
                  ) : (
                    <img src={photoPreview} alt={product.name} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-3 left-3 bg-black text-white text-xs px-2 py-1">
                    Vista previa de tu foto
                  </div>
                </>
              ) : (
                <ImageSlider
                  images={displayImages}
                  alt={product.name}
                  index={currentImg}
                  onIndexChange={setCurrentImg}
                  arrowsOnMobile
                />
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
            <div className="mb-8">
              <ProductDescription text={product.description} />
            </div>

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

            {/* Quantity */}
            <div className="mb-6">
              <label className="label">Cantidad de pedidos</label>
              <div className="flex items-center border border-gray-300 w-fit">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-lg">−</button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-lg">+</button>
              </div>
            </div>

            {/* Photo upload */}
            <div className="mb-6">
              {singleMode ? (
                <>
                  <label className="label">Cargá tu foto</label>
                  {singlePhoto ? (
                    <div className="flex items-center gap-3 border-2 border-gray-200 p-4">
                      <div className="w-16 h-16 overflow-hidden flex-shrink-0">
                        <img src={singlePhoto.previewSrc} alt="preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        {singlePhoto.status === 'done' && <p className="text-sm font-semibold text-green-700 flex items-center gap-1"><Check size={14} /> Foto cargada</p>}
                        {singlePhoto.status === 'uploading' && <p className="text-sm font-semibold text-gray-600 flex items-center gap-1"><Loader2 size={14} className="animate-spin" /> Subiendo foto...</p>}
                        {singlePhoto.status === 'error' && <p className="text-sm font-semibold text-red-600">{singlePhoto.error}</p>}
                        <p className="text-xs text-gray-500 truncate">{singlePhoto.original.name}</p>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:border-black transition-colors group">
                      <Upload size={24} className="text-gray-400 group-hover:text-black transition-colors" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Subí tu imagen</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG o HEIC · Máx. 25 MB</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                  )}
                  {singlePhoto && (
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => openCropperFor(singlePhoto.id)} disabled={singlePhoto.status === 'uploading'}
                        className="text-xs text-gray-500 hover:text-black flex items-center gap-1 transition-colors disabled:opacity-50">
                        <CropIcon size={12} /> Recortar de nuevo
                      </button>
                      {singlePhoto.status === 'error' && (
                        <button onClick={() => retryPhoto(singlePhoto)} className="text-xs text-gray-500 hover:text-black flex items-center gap-1 transition-colors">
                          <RotateCw size={12} /> Reintentar
                        </button>
                      )}
                      <button onClick={() => removePhoto(singlePhoto.id)}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors">
                        Eliminar foto
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="label mb-0">{validCounts.length > 1 ? 'Cargá tus fotos' : maxPhotos === 1 ? 'Cargá tu foto' : `Cargá tus ${maxPhotos} fotos`}</label>
                    <span className={`text-sm font-bold ${validCounts.includes(photos.length) ? 'text-green-700' : photos.length > maxPhotos ? 'text-red-600' : 'text-gray-500'}`}>
                      {photos.length}/{maxPhotos}
                    </span>
                  </div>
                  {validCounts.length > 1 && (
                    <p className="text-xs text-gray-500 -mt-1 mb-3">
                      Para tus {quantity} copias podés cargar {fotos(photosPerUnit)} ({photosPerUnit === 1 ? 'se imprime' : 'se imprimen'} en todas) o {fotos(maxPhotos)} distintas ({photosPerUnit === 1 ? 'una por copia' : `${photosPerUnit} por copia`}).
                    </p>
                  )}
                  {photos.length > 0 && (
                    <div className={`grid gap-2 mb-3 ${photoFormat?.frame ? 'grid-cols-3 sm:grid-cols-4 gap-3' : 'grid-cols-4 sm:grid-cols-5'}`}>
                      {photos.map(p => (
                        <div key={p.id} className={`relative self-start border-2 ${p.status === 'error' ? 'border-red-500' : 'border-transparent'}`}>
                          <FramedPhoto src={p.previewSrc} format={photoFormat} imgClassName={p.status === 'uploading' ? 'opacity-50' : ''} />
                          {p.status === 'uploading' && (
                            <span className="absolute inset-0 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-black" /></span>
                          )}
                          {p.status === 'error' && (
                            <button onClick={() => retryPhoto(p)} title={p.error} aria-label="Reintentar"
                              className="absolute inset-0 flex items-center justify-center bg-white/60 text-red-600">
                              <RotateCw size={18} />
                            </button>
                          )}
                          <button onClick={() => removePhoto(p.id)} aria-label="Quitar foto"
                            className="absolute top-0 right-0 bg-black/70 text-white p-0.5 hover:bg-red-600 transition-colors">
                            <X size={12} />
                          </button>
                          {p.status === 'done' && (
                            <button onClick={() => openCropperFor(p.id)} aria-label="Recortar"
                              className="absolute bottom-0 left-0 bg-black/70 text-white p-1 hover:bg-black transition-colors">
                              <CropIcon size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {photos.length < maxPhotos && (
                    <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 p-5 cursor-pointer hover:border-black transition-colors group">
                      <Upload size={22} className="text-gray-400 group-hover:text-black transition-colors" />
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {photos.length === 0 ? (validCounts.length > 1 ? 'Elegí tus fotos' : `Elegí tus ${maxPhotos} fotos`) : `Podés agregar ${maxPhotos - photos.length} más`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Podés seleccionar varias a la vez · JPG, PNG o HEIC · Máx. 25 MB c/u</p>
                      </div>
                      <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                    </label>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Tocá <CropIcon size={10} className="inline" /> en una foto si querés recortarla.</p>
                </>
              )}
              {photoNotice && <p className="text-xs text-gray-500 mt-2">{photoNotice}</p>}
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={(product.variants.length > 0 && !selectedVariant) || !!photoProblem}
              className={`btn-primary w-full py-4 text-base ${added ? 'bg-green-800' : ''}`}
            >
              {added ? (
                <><Check size={18} /> Agregado al carrito</>
              ) : (
                <><ShoppingBag size={18} /> Agregar al carrito</>
              )}
            </button>

            {product.variants.length > 0 && !selectedVariant ? (
              <p className="text-xs text-center text-red-500 mt-2">Seleccioná una opción para continuar</p>
            ) : photoProblem && (
              <p className={`text-xs text-center mt-2 ${uploadingCount ? 'text-gray-500' : 'text-red-500'}`}>{photoProblem}</p>
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

      {/* Crop modal */}
      {cropTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="font-bold text-lg mb-4">Recortá tu foto{photoFormat && <span className="font-normal text-gray-500 text-sm"> · {photoFormat.label}</span>}</h3>

            <div className={`flex gap-2 mb-4 ${photoFormat ? 'hidden' : ''}`}>
              {ASPECT_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handleAspectChange(p.value)}
                  className={`px-3 py-2 text-xs font-semibold border-2 transition-colors ${aspectPreset === p.value ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex justify-center bg-gray-100 max-h-[55vh] overflow-auto">
              <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={aspectPreset}>
                <img ref={imgRef} src={cropTarget.originalSrc} onLoad={handleImageLoad} alt="Recortar" style={{ maxHeight: '55vh' }} />
              </ReactCrop>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={cancelCrop} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={confirmCrop} className="btn-primary flex-1">Usar esta foto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
