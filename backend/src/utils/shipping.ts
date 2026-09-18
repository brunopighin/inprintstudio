export const CARRIERS = ['correo_argentino', 'andreani', 'oca'] as const
export type Carrier = (typeof CARRIERS)[number]

export const CARRIER_LABELS: Record<Carrier, string> = {
  correo_argentino: 'Correo Argentino',
  andreani: 'Andreani',
  oca: 'OCA',
}

// Cotización real de envío: ver ./shippingProviders (Andreani / Correo Argentino).
// Se usan solo cuando ningún producto del pedido tiene peso/medidas cargados.
export const DEFAULT_PACKAGE_DIMENSIONS_CM = { height: 5, width: 30, length: 40 }
export const DEFAULT_ITEM_WEIGHT_GRAMS = 500

export interface PhysicalItem {
  quantity: number
  weightGrams?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
}

// Peso y medidas del paquete de un pedido a partir de sus items, igual que lo
// hace el plugin oficial de Correo Argentino (class-ca-shipments.php,
// get_order_dimensions): el peso se suma, el largo/ancho es el máximo entre
// los productos (van "al lado"), y el alto se suma (van "apilados"). Si
// ningún item tiene el dato cargado, se usan los valores por defecto.
export function computeOrderPhysicals(items: PhysicalItem[]) {
  let weight = 0
  let maxLength = 0
  let maxWidth = 0
  let sumHeight = 0
  for (const item of items) {
    weight += (item.weightGrams || 0) * item.quantity
    if (item.lengthCm) maxLength = Math.max(maxLength, item.lengthCm)
    if (item.widthCm) maxWidth = Math.max(maxWidth, item.widthCm)
    if (item.heightCm) sumHeight += item.heightCm * item.quantity
  }
  return {
    weightGrams: weight || DEFAULT_ITEM_WEIGHT_GRAMS,
    dimensionsCm: {
      length: maxLength || DEFAULT_PACKAGE_DIMENSIONS_CM.length,
      width: maxWidth || DEFAULT_PACKAGE_DIMENSIONS_CM.width,
      height: sumHeight || DEFAULT_PACKAGE_DIMENSIONS_CM.height,
    },
  }
}
