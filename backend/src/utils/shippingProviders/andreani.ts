import { ShippingProvider, QuoteInput, ShippingQuote } from './types'

// Andreani NO tiene un cotizador de tarifas de autoservicio: el sandbox público
// (developers-sandbox.andreani.com) solo expone su API de logística en depósito
// propio (stock/acondicionamiento/kitting), no cálculo de costo de envío. El
// cotizador real es un producto distinto que requiere un contrato comercial
// (número de "contrato" y "cliente") gestionado con un ejecutivo de cuenta de
// Andreani — no se puede completar esta integración sin eso.
//
// Este proveedor queda intencionalmente sin implementar hasta tener:
//   1. Número de contrato y código de cliente Andreani.
//   2. La documentación real del endpoint de tarifas para ese contrato
//      (formato de request/response — el ejecutivo de cuenta la provee al
//      dar de alta el contrato; no es la misma que la del portal de desarrolladores).
//   3. Credenciales de acceso a esa API (usuario/token según lo que indique
//      la documentación entregada).
//
// No se llama a ningún endpoint con un esquema adivinado: es preferible no
// mostrar Andreani como opción de envío a mostrar un precio incorrecto.

function isConfigured() {
  return false
}

async function getQuotes(_input: QuoteInput): Promise<ShippingQuote[]> {
  throw new Error(
    'Proveedor Andreani no implementado: falta contrato comercial y documentación real del cotizador de tarifas.'
  )
}

export const andreaniProvider: ShippingProvider = {
  carrier: 'andreani',
  isConfigured,
  getQuotes,
}
