import { useCart } from '../../context/CartContext'
import { useNavigate } from 'react-router-dom'
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, itemCount } = useCart()
  const navigate = useNavigate()

  const formatPrice = (n: number) => `$${n.toLocaleString('es-AR')}`

  const handleCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/60 animate-fade-in" onClick={closeCart} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} />
            <h2 className="font-bold text-lg">Carrito</h2>
            {itemCount > 0 && (
              <span className="bg-black text-white text-xs font-bold px-2 py-0.5">{itemCount}</span>
            )}
          </div>
          <button onClick={closeCart} className="p-2 text-gray-400 hover:text-black transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
              <ShoppingBag size={48} strokeWidth={1} />
              <div className="text-center">
                <p className="font-medium text-gray-600">Tu carrito está vacío</p>
                <p className="text-sm mt-1">Agregá productos para continuar</p>
              </div>
              <button onClick={() => { closeCart(); navigate('/catalogo') }} className="btn-primary mt-2">
                Ver catálogo
              </button>
            </div>
          ) : (
            <div className="px-6 flex flex-col gap-5">
              {items.map((item, idx) => {
                const price = item.variant?.price ?? item.product.basePrice
                const images = JSON.parse(item.product.images || '[]')
                const imageUrl = images[0] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60'
                return (
                  <div key={`${item.product.id}-${item.variant?.id}-${idx}`} className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-100 flex-shrink-0 overflow-hidden">
                      <img src={imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight">{item.product.name}</h3>
                      {item.variant && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.variant.label}</p>
                      )}
                      {item.photoUrl && (
                        <p className="text-xs text-gray-500 mt-0.5">📷 Foto cargada</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.variant?.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.variant?.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="text-sm font-bold">{formatPrice(price * item.quantity)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id, item.variant?.id)}
                      className="self-start p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 space-y-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Envío calculado en el checkout</span>
            </div>
            <button onClick={handleCheckout} className="btn-primary w-full text-center">
              Continuar al checkout
            </button>
            <button onClick={closeCart} className="w-full text-sm text-gray-400 hover:text-black text-center transition-colors">
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  )
}
