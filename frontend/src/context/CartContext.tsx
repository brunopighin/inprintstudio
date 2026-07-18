import { createContext, useContext, useState, ReactNode } from 'react'
import { CartItem, Product, ProductVariant } from '../types'

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, variant?: ProductVariant, quantity?: number, photoUrl?: string) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addItem = (product: Product, variant?: ProductVariant, quantity = 1, photoUrl?: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.variant?.id === variant?.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id && i.variant?.id === variant?.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, { product, variant, quantity, photoUrl }]
    })
    setIsOpen(true)
  }

  const removeItem = (productId: string, variantId?: string) => {
    setItems(prev => prev.filter(i => !(i.product.id === productId && i.variant?.id === variantId)))
  }

  const updateQuantity = (productId: string, variantId: string | undefined, quantity: number) => {
    if (quantity <= 0) { removeItem(productId, variantId); return }
    setItems(prev => prev.map(i =>
      i.product.id === productId && i.variant?.id === variantId ? { ...i, quantity } : i
    ))
  }

  const clearCart = () => setItems([])
  const total = items.reduce((sum, i) => sum + (i.variant?.price ?? i.product.basePrice) * i.quantity, 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      total, itemCount, isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false)
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
