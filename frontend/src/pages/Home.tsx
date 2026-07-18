import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, Store, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../services/api'
import { Product, Category, Banner } from '../types'
import ProductCard from '../components/product/ProductCard'

export default function Home() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [currentBanner, setCurrentBanner] = useState(0)

  useEffect(() => {
    api.get('/banners').then(r => setBanners(r.data))
    api.get('/categories').then(r => setCategories(r.data))
    api.get('/products?featured=true&limit=8').then(r => setFeatured(r.data.products))
  }, [])

  useEffect(() => {
    if (banners.length < 2) return
    const t = setTimeout(() => setCurrentBanner(b => (b + 1) % banners.length), 5000)
    return () => clearTimeout(t)
  }, [currentBanner, banners.length])

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      {banners.length > 0 && (
        <section className="relative h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden bg-black">
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentBanner ? 'opacity-100' : 'opacity-0'}`}
            >
              <img src={banner.image} alt={banner.title} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 flex flex-col justify-center container-main">
                <div className="max-w-2xl animate-slide-up">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight">
                    {banner.title}
                  </h1>
                  {banner.subtitle && (
                    <p className="text-white/80 text-lg md:text-xl mt-4 font-light max-w-lg">
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.link && (
                    <Link to={banner.link} className="btn-primary mt-8 inline-flex">
                      Explorar <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}

          {banners.length > 1 && (
            <>
              <button
                onClick={() => setCurrentBanner(b => (b - 1 + banners.length) % banners.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentBanner(b => (b + 1) % banners.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === currentBanner ? 'bg-white w-6' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Features strip */}
      <section className="bg-black text-white py-10">
        <div className="container-main">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: Truck, title: 'Envíos a todo el país', desc: 'Recibí tu pedido donde estés' },
              { icon: Store, title: 'Retiro en local', desc: 'Pasá a buscar cuando quieras' },
              { icon: ShieldCheck, title: 'Calidad garantizada', desc: 'Impresión profesional certificada' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <div className="w-10 h-10 border border-gray-700 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-20 container-main">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Explorá</p>
              <h2 className="section-title">Nuestros productos</h2>
            </div>
            <Link to="/catalogo" className="hidden sm:flex items-center gap-1 text-sm font-medium hover:gap-3 transition-all">
              Ver todo <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/catalogo/${cat.slug}`}
                className="group relative aspect-square bg-gray-100 overflow-hidden"
              >
                {cat.image && (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-sm leading-tight">{cat.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container-main">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Lo más pedido</p>
                <h2 className="section-title">Destacados</h2>
              </div>
              <Link to="/catalogo" className="hidden sm:flex items-center gap-1 text-sm font-medium hover:gap-3 transition-all">
                Ver catálogo <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20 container-main">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Simple y rápido</p>
          <h2 className="section-title">¿Cómo funciona?</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 relative">
          {[
            { step: '01', title: 'Elegí tu producto', desc: 'Seleccioná tamaño, papel y cantidad' },
            { step: '02', title: 'Subí tu foto', desc: 'Cargá tu imagen desde el celular o computadora' },
            { step: '03', title: 'Pagá y confirmá', desc: 'MercadoPago o transferencia bancaria' },
            { step: '04', title: 'Retirá o recibilo', desc: 'En local o envío a domicilio a todo el país' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 border-2 border-black flex items-center justify-center mb-4">
                <span className="text-xs font-black tracking-widest">{step}</span>
              </div>
              <h3 className="font-bold text-base mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-black py-20">
        <div className="container-main text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
            ¿Tenés un proyecto en mente?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Desde una sola foto hasta tirajes grandes para eventos y empresas. Hablemos.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/catalogo" className="bg-white text-black px-8 py-4 font-bold text-sm uppercase tracking-wider hover:bg-gray-100 transition-colors">
              Ver catálogo
            </Link>
            <Link to="/contacto" className="border border-gray-600 text-white px-8 py-4 font-bold text-sm uppercase tracking-wider hover:border-white transition-colors">
              Contactarnos
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
