import { QuoteInput, ShippingQuote } from './types'
import { correoArgentinoProvider } from './correoArgentino'

// Se arranca con un solo correo activo (Correo Argentino) para validar el
// circuito completo con datos reales antes de sumar más:
// - OCA: integración de oca.ts verificada y lista — reactivar importando
//   ocaProvider y agregándolo acá.
// - Andreani: nunca llegó a implementarse (ver andreani.ts) — su cotizador
//   real requiere un contrato comercial que todavía no se gestionó.
const PROVIDERS = [correoArgentinoProvider]

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
