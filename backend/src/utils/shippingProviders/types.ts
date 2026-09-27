import { Carrier } from '../shipping'

export interface QuoteInput {
  postalCodeDestination: string
  weightGrams: number
  dimensionsCm: { height: number; width: number; length: number }
  declaredValue?: number
}

// 'D' = a domicilio, 'S' = a sucursal. Va en la cotización porque el precio y
// lo que recibe el comprador cambian según la modalidad, y hay que poder
// cobrarle la que eligió (no la que quedó primera en la respuesta del correo).
export type DeliveryType = 'D' | 'S'

export interface ShippingQuote {
  carrier: Carrier
  deliveryType: DeliveryType
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
