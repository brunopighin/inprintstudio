import { QuoteInput, ShippingQuote } from './types'
import { correoArgentinoProvider } from './correoArgentino'
import { andreaniProvider } from './andreani'
import { ocaProvider } from './oca'

const PROVIDERS = [correoArgentinoProvider, andreaniProvider, ocaProvider]

export async function getShippingQuotes(input: QuoteInput): Promise<ShippingQuote[]> {
  const configured = PROVIDERS.filter(p => p.isConfigured())

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
