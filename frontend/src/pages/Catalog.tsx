import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Filter, X, SlidersHorizontal } from 'lucide-react'
import api from '../services/api'
import { Product, Category } from '../types'
import ProductCard from '../components/product/ProductCard'

export default function Catalog() {
  const { category: categorySlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const search = searchParams.get('search') || ''
  const subcategory = searchParams.get('subcategory') || ''
  const page = Number(searchParams.get('page') || 1)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categorySlug) params.set('category', categorySlug)
      if (subcategory) params.set('subcategory', subcategory)
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '12')
      const { data } = await api.get(`/products?${params}`)
      setProducts(data.products)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [categorySlug, subcategory, search, page])

  useEffect(() => {
    api.get('/categories').then(r => {
      setCategories(r.data)
      if (categorySlug) {
        const cat = r.data.find((c: Category) => c.slug === categorySlug)
        setActiveCategory(cat || null)
      }
    })
  }, [categorySlug])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="bg-black text-white py-14">
        <div className="container-main">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            {search ? 'Búsqueda' : 'Catálogo'}
          </p>
          <h1 className="text-4xl md:text-5xl font-black">
            {search ? `"${search}"` : activeCategory?.name || 'Todos los productos'}
          </h1>
          {activeCategory?.description && (
            <p className="text-gray-400 mt-3 max-w-xl">{activeCategory.description}</p>
          )}
          <p className="text-gray-600 text-sm mt-3">{total} producto{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="container-main py-10">
        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
            <div className="sticky top-24 space-y-8">
              {/* Categories */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Categorías</h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/catalogo"
                      className={`block py-1.5 px-2 text-sm transition-colors ${!categorySlug ? 'font-semibold text-black bg-gray-100' : 'text-gray-600 hover:text-black'}`}
                    >
                      Todos los productos
                    </Link>
                  </li>
                  {categories.map(cat => (
                    <li key={cat.id}>
                      <Link
                        to={`/catalogo/${cat.slug}`}
                        className={`block py-1.5 px-2 text-sm transition-colors ${categorySlug === cat.slug ? 'font-semibold text-black bg-gray-100' : 'text-gray-600 hover:text-black'}`}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Subcategories */}
              {activeCategory?.subcategories && activeCategory.subcategories.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Tipo</h3>
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={() => updateFilter('subcategory', '')}
                        className={`block w-full text-left py-1.5 px-2 text-sm transition-colors ${!subcategory ? 'font-semibold text-black' : 'text-gray-500 hover:text-black'}`}
                      >
                        Todos
                      </button>
                    </li>
                    {activeCategory.subcategories.map(sub => (
                      <li key={sub.id}>
                        <button
                          onClick={() => updateFilter('subcategory', sub.slug)}
                          className={`block w-full text-left py-1.5 px-2 text-sm transition-colors ${subcategory === sub.slug ? 'font-semibold text-black bg-gray-100' : 'text-gray-500 hover:text-black'}`}
                        >
                          {sub.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          {/* Products grid */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden flex items-center gap-2 text-sm font-medium border border-gray-300 px-3 py-2">
                <SlidersHorizontal size={16} />
                Filtros
              </button>

              {(search || subcategory) && (
                <div className="flex flex-wrap gap-2 flex-1">
                  {search && (
                    <span className="badge bg-black text-white gap-1">
                      "{search}"
                      <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete('search'); setSearchParams(p) }}><X size={12} /></button>
                    </span>
                  )}
                  {subcategory && (
                    <span className="badge bg-gray-200 text-gray-700 gap-1">
                      {subcategory}
                      <button onClick={() => updateFilter('subcategory', '')}><X size={12} /></button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card">
                    <div className="skeleton aspect-square" />
                    <div className="p-4 space-y-2">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-3 w-1/2" />
                      <div className="skeleton h-8 w-1/3 mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Filter size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="font-semibold text-gray-600">No hay productos</h3>
                <p className="text-gray-400 text-sm mt-1">Probá con otros filtros o categorías.</p>
                <Link to="/catalogo" className="btn-primary mt-6 inline-flex">Ver todo el catálogo</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {/* Pagination */}
            {total > 12 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: Math.ceil(total / 12) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateFilter('page', String(i + 1))}
                    className={`w-10 h-10 text-sm font-medium border transition-colors ${page === i + 1 ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
