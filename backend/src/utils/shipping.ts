export const CARRIERS = ['correo_argentino', 'andreani'] as const
export type Carrier = (typeof CARRIERS)[number]

export const CARRIER_LABELS: Record<Carrier, string> = {
  correo_argentino: 'Correo Argentino',
  andreani: 'Andreani',
}

// Tabla de zonas simplificada por prefijo de código postal argentino (CPA).
// Son valores de referencia: ajustar a costos reales de envío.
const SHIPPING_ZONES = [
  { min: 1000, max: 1499, zone: 'CABA', cost: 700 },
  { min: 1500, max: 1999, zone: 'GBA', cost: 1000 },
  { min: 2000, max: 2999, zone: 'Buenos Aires / Litoral', cost: 1300 },
  { min: 3000, max: 5999, zone: 'Centro / NOA / Cuyo', cost: 1700 },
  { min: 6000, max: 9999, zone: 'Patagonia / zonas alejadas', cost: 2200 },
]

export function quoteShipping(postalCode: string) {
  const numeric = parseInt(postalCode.replace(/\D/g, '').slice(0, 4), 10)
  if (!numeric || numeric < 1000 || numeric > 9999) return null
  const match = SHIPPING_ZONES.find(z => numeric >= z.min && numeric <= z.max)
  if (!match) return null
  return { zone: match.zone, cost: match.cost }
}

export function calculateShippingCost(shippingMethod: string, postalCode?: string | null): number {
  if (shippingMethod === 'pickup') return 0
  const quote = postalCode ? quoteShipping(postalCode) : null
  return quote ? quote.cost : 1300
}
