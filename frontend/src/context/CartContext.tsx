import { createContext, useContext, useState, ReactNode } from 'react'
import { CartItem, Product, ProductVariant } from '../types'

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, variant?: ProductVariant, quantity?: number, photoUrls?: string[]) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

let lineCounter = 0
const newLineId = () => `${Date.now()}-${++lineCounter}`

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addItem = (product: Product, variant?: ProductVariant, quantity = 1, photoUrls: string[] = []) => {
    setItems(prev => {
      // Solo se suman a una línea existente si ninguna de las dos tiene fotos:
      // cada pack con fotos es un pedido distinto y no se pueden mezclar
      const existing = !photoUrls.length && prev.find(i =>
        i.product.id === product.id && i.variant?.id === variant?.id && !i.photoUrls.length
      )
      if (existing) {
        return prev.map(i => (i.lineId === existing.lineId ? { ...i, quantity: i.quantity + quantity } : i))
      }
      return [...prev, { lineId: newLineId(), product, variant, quantity, photoUrls }]
    })
    setIsOpen(true)
  }

  const removeItem = (lineId: string) => {
    setItems(prev => prev.filter(i => i.lineId !== lineId))
  }

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(lineId); return }
    setItems(prev => prev.map(i => (i.lineId === lineId ? { ...i, quantity } : i)))
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
