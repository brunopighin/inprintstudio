export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'ADMIN' | 'CUSTOMER'
}

export interface ProductVariant {
  id: string
  label: string
  size?: string
  paperType?: string
  quantity?: number
  price: number
  stock: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  displayOrder: number
  active: boolean
  subcategories: Subcategory[]
}

export interface Subcategory {
  id: string
  name: string
  slug: string
  categoryId: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  categoryId: string
  category: Category
  subcategoryId?: string
  subcategory?: Subcategory
  images: string
  basePrice: number
  variants: ProductVariant[]
  active: boolean
  featured: boolean
  createdAt: string
}

export type OrderStatus = 'RECEIVED' | 'IN_PRODUCTION' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export type Carrier = 'correo_argentino' | 'andreani'

export const CARRIER_LABELS: Record<Carrier, string> = {
  correo_argentino: 'Correo Argentino',
  andreani: 'Andreani',
}

export const CARRIER_TRACKING_URLS: Record<Carrier, string> = {
  correo_argentino: 'https://www.correoargentino.com.ar/formularios/e-commerce',
  andreani: 'https://www.andreani.com/?tab=seguir-envio',
}

export interface OrderItem {
  id: string
  productId: string
  product: Product
  variantId?: string
  variant?: ProductVariant
  quantity: number
  price: number
  photoUrl?: string
  notes?: string
}

export interface Order {
  id: string
  orderNumber: string
  userId?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: OrderItem[]
  status: OrderStatus
  subtotal: number
  shippingCost: number
  total: number
  shippingMethod: string
  paymentMethod: string
  paymentStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROCESS'
  shippingAddress?: string
  postalCode?: string
  trackingCarrier?: Carrier
  trackingNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Banner {
  id: string
  title: string
  subtitle?: string
  image: string
  link?: string
  active: boolean
  displayOrder: number
}

export interface CartItem {
  product: Product
  variant?: ProductVariant
  quantity: number
  photoUrl?: string
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Recibido',
  IN_PRODUCTION: 'En producción',
  READY: 'Listo para retirar/enviar',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

export const PAYMENT_STATUS_LABELS: Record<Order['paymentStatus'], string> = {
  PENDING: 'Pago pendiente',
  IN_PROCESS: 'Pago en proceso',
  APPROVED: 'Pago aprobado',
  REJECTED: 'Pago rechazado',
}
