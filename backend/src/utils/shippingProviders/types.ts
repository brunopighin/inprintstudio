import { Carrier } from '../shipping'

export interface QuoteInput {
  postalCodeDestination: string
  weightGrams: number
  dimensionsCm: { height: number; width: number; length: number }
  declaredValue?: number
}

export interface ShippingQuote {
  carrier: Carrier
  label: string
  price: number
  etaDaysMin?: number
  etaDaysMax?: number
}

export interface ShippingProvider {
  carrier: Carrier
  isConfigured(): Promise<boolean>
  getQuotes(input: QuoteInput): Promise<ShippingQuote[]>
}
