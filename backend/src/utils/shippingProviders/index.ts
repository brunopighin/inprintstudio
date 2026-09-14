import { QuoteInput, ShippingQuote } from './types'
import { correoArgentinoProvider } from './correoArgentino'
import { andreaniProvider } from './andreani'

// OCA queda deshabilitado por ahora (se arranca con un solo correo para
// validar el circuito completo con datos reales antes de sumar el segundo).
// La integración de oca.ts sigue verificada y lista — para reactivarla alcanza
// con importar ocaProvider de nuevo y agregarlo a PROVIDERS.
const PROVIDERS = [correoArgentinoProvider, andreaniProvider]

export async function getShippingQuotes(input: QuoteInput): Promise<ShippingQuote[]> {
  const flags = await Promise.all(PROVIDERS.map(p => p.isConfigured()))
  const configured = PROVIDERS.filter((_, i) => flags[i])

  const results = await Promise.allSettled(configured.map(p => p.getQuotes(input)))

  const quotes: ShippingQuote[] = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      quotes.push(...result.value)
    } else {
      console.error(`Error cotizando envío con ${configured[i].carrier}:`, result.reason)
    }
  })
  return quotes
}

export type { ShippingQuote, QuoteInput } from './types'
