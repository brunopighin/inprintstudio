import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { Product } from '../../types'
import { useCart } from '../../context/CartContext'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const { addItem } = useCart()
  const images = JSON.parse(product.images || '[]')
  const imageUrl = images[0] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80'
  const minPrice = product.variants.length
    ? Math.min(...product.variants.map(v => v.price))
    : product.basePrice
  const hasVariants = product.variants.length > 1

  return (
    <div className="card group">
      <Link to={`/producto/${product.slug}`}>
        <div className="img-zoom aspect-square bg-gray-100">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link to={`/producto/${product.slug}`}>
              <h3 className="font-semibold text-sm text-gray-900 leading-tight hover:text-gray-600 transition-colors line-clamp-2">
                {product.name}
              </h3>
            </Link>
            <p className="text-xs text-gray-400 mt-1">{product.category.name}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{hasVariants ? 'Desde' : ''}</p>
            <p className="text-base font-black">${minPrice.toLocaleString('es-AR')}</p>
          </div>

          {product.variants.length === 0 ? (
            <button
              onClick={() => addItem(product)}
              className="btn-primary py-2 px-3 text-xs"
            >
              <ShoppingBag size={14} />
            </button>
          ) : (
            <Link to={`/producto/${product.slug}`} className="btn-secondary py-2 px-3 text-xs">
              Ver opciones
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
