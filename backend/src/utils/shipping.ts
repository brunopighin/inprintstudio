export const CARRIERS = ['correo_argentino', 'andreani', 'oca'] as const
export type Carrier = (typeof CARRIERS)[number]

export const CARRIER_LABELS: Record<Carrier, string> = {
  correo_argentino: 'Correo Argentino',
  andreani: 'Andreani',
  oca: 'OCA',
}

// Cotización real de envío: ver ./shippingProviders (Andreani / Correo Argentino).
export const DEFAULT_PACKAGE_DIMENSIONS_CM = { height: 5, width: 30, length: 40 }
