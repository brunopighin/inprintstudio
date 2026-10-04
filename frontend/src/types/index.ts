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
  // Cuántas fotos sube el cliente para esta variante (vacío = 1)
  quantity?: number
  price: number
  stock: number
  weightGrams?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
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
  weightGrams?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  variants: ProductVariant[]
  active: boolean
  featured: boolean
  createdAt: string
}

export type OrderStatus = 'RECEIVED' | 'IN_PRODUCTION' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export type ShippingMethod = 'pickup' | 'shipping'

export type Carrier = 'correo_argentino' | 'andreani' | 'oca'

export const CARRIER_LABELS: Record<Carrier, string> = {
  correo_argentino: 'Correo Argentino',
  andreani: 'Andreani',
  oca: 'OCA',
}

export const CARRIER_TRACKING_URLS: Record<Carrier, string> = {
  correo_argentino: 'https://www.correoargentino.com.ar/formularios/e-commerce',
  andreani: 'https://www.andreani.com/?tab=seguir-envio',
  oca: 'https://www.oca.com.ar/Busquedas/Seguimientos',
}

// Códigos de provincia de Correo Argentino (ISO 3166-2:AR), usados como
// value del selector de provincia en el checkout y para pedir sucursales.
export const PROVINCES: { code: string; name: string }[] = [
  { code: 'A', name: 'Salta' },
  { code: 'B', name: 'Buenos Aires' },
  { code: 'C', name: 'Ciudad Autónoma de Buenos Aires' },
  { code: 'D', name: 'San Luis' },
  { code: 'E', name: 'Entre Ríos' },
  { code: 'F', name: 'La Rioja' },
  { code: 'G', name: 'Santiago del Estero' },
  { code: 'H', name: 'Chaco' },
  { code: 'J', name: 'San Juan' },
  { code: 'K', name: 'Catamarca' },
  { code: 'L', name: 'La Pampa' },
  { code: 'M', name: 'Mendoza' },
  { code: 'N', name: 'Misiones' },
  { code: 'P', name: 'Formosa' },
  { code: 'Q', name: 'Neuquén' },
  { code: 'R', name: 'Río Negro' },
  { code: 'S', name: 'Santa Fe' },
  { code: 'T', name: 'Tucumán' },
  { code: 'U', name: 'Chubut' },
  { code: 'V', name: 'Tierra del Fuego' },
  { code: 'W', name: 'Corrientes' },
  { code: 'X', name: 'Córdoba' },
  { code: 'Y', name: 'Jujuy' },
  { code: 'Z', name: 'Santa Cruz' },
]

export const PROVINCE_NAMES: Record<string, string> = Object.fromEntries(PROVINCES.map(p => [p.code, p.name]))

// 'D' = a domicilio, 'S' = a sucursal.
export type DeliveryType = 'D' | 'S'

export interface ShippingQuote {
  carrier: Carrier
  deliveryType: DeliveryType
  label: string
  price: number
  etaDaysMin?: number
  etaDaysMax?: number
}

export interface Agency {
  code: string
  name: string
  address: string
  city: string
  postalCode: string
}

export interface PaymentMethodConfig {
  key: string
  label: string
  enabled: boolean
  adjustmentPercent: number
}

export interface TransferInfo {
  bank: string
  cbu: string
  alias: string
  cuit: string
  holder: string
  note: string
  whatsapp: string
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mercadopago: 'MercadoPago',
  transfer: 'Transferencia',
}

export interface OrderItem {
  id: string
  productId: string
  product: Product
  variantId?: string
  variant?: ProductVariant
  quantity: number
  price: number
  // Pedidos viejos: una sola foto como data URL
  photoUrl?: string
  // JSON con las URLs de las fotos que subió el cliente
  photoUrls?: string
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
  discount: number
  shippingCost: number
  paymentAdjustment: number
  total: number
  shippingMethod: ShippingMethod
  shippingCarrier?: Carrier
  paymentMethod: string
  paymentStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROCESS'
  shippingAddress?: string
  locality?: string
  province?: string
  postalCode?: string
  deliveryReference?: string
  trackingCarrier?: Carrier
  trackingNumber?: string
  shippingBranchCode?: string
  shipmentStatus?: string
  shipmentError?: string
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
  // Identifica la línea: dos packs del mismo producto con fotos distintas van separados
  lineId: string
  product: Product
  variant?: ProductVariant
  quantity: number
  photoUrls: string[]
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
