import { XMLParser } from 'fast-xml-parser'
import { ShippingProvider, QuoteInput, ShippingQuote } from './types'

// Integración real contra el webservice legacy "ePak" de OCA (Oep_TrackEPak.asmx,
// endpoint Tarifar_Envio_Corporativo). Verificado a mano contra el WSDL público
// (https://integraciones.ocadev.com.ar/epak_tracking_test/Oep_TrackEPak.asmx?WSDL)
// y probado en vivo contra el ambiente de pruebas con las credenciales de test
// publicadas por OCA (cuenta 111757/001, CUIT 30-53625919-4), así que los campos
// de request/response de abajo son los reales, no adivinados.
//
// Cuit y Operativa son datos de la cuenta comercial de OCA (la Operativa es el
// código de servicio contratado, p.ej. "410150 - ePak - Estandar PaP - Generica";
// se obtiene llamando a GetOperativasByUsuario con el usuario/clave de la cuenta,
// o la entrega el ejecutivo de OCA al dar de alta el contrato).
//
// CodigoPostalOrigen/Destino son el código postal numérico de 4 dígitos (no el
// CPA con letras) — si llega en formato CPA (p.ej. "B1842ZAB") se extraen los
// primeros 4 dígitos, que en la práctica coinciden con el CP viejo.

const parser = new XMLParser({ removeNSPrefix: false, ignoreAttributes: true })

function toOldPostalCode(postalCode: string): string | null {
  const match = postalCode.match(/\d{4}/)
  return match ? match[0] : null
}

function isConfigured() {
  return Boolean(
    process.env.OCA_BASE_URL &&
    process.env.OCA_CUIT &&
    process.env.OCA_OPERATIVA
  )
}

interface TarifaRow {
  Error?: string
  Total?: number | string
  Precio?: number | string
  Adicional?: number | string
  PlazoEntrega?: number | string
}

async function getQuotes(input: QuoteInput): Promise<ShippingQuote[]> {
  const baseUrl = process.env.OCA_BASE_URL!.replace(/\/$/, '')
  const origin = toOldPostalCode(process.env.ORIGIN_POSTAL_CODE || '')
  const destination = toOldPostalCode(input.postalCodeDestination)
  if (!origin || !destination) {
    throw new Error('Código postal inválido para cotizar con OCA')
  }

  const pesoKg = (input.weightGrams / 1000).toFixed(3)
  const volumenM3 = ((input.dimensionsCm.height * input.dimensionsCm.width * input.dimensionsCm.length) / 1_000_000).toFixed(4)

  const body = new URLSearchParams({
    PesoTotal: pesoKg,
    VolumenTotal: volumenM3,
    CodigoPostalOrigen: origin,
    CodigoPostalDestino: destination,
    CantidadPaquetes: '1',
    ValorDeclarado: input.declaredValue ? String(Math.round(input.declaredValue)) : '',
    Cuit: process.env.OCA_CUIT!,
    Operativa: process.env.OCA_OPERATIVA!,
  })

  const res = await fetch(`${baseUrl}/Tarifar_Envio_Corporativo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`OCA Tarifar_Envio_Corporativo error: ${res.status}`)

  const xml = parser.parse(await res.text())
  const newDataSet = xml?.DataSet?.['diffgr:diffgram']?.NewDataSet
  if (!newDataSet) throw new Error('OCA: respuesta sin NewDataSet')

  const rowsValue = Object.values(newDataSet)[0]
  const rows: TarifaRow[] = Array.isArray(rowsValue) ? rowsValue : rowsValue ? [rowsValue as TarifaRow] : []

  const row = rows[0]
  if (!row || row.Error) {
    throw new Error(`OCA: ${row?.Error || 'no se pudo cotizar'}`)
  }

  const total = Number(row.Total ?? row.Precio)
  if (!Number.isFinite(total)) throw new Error('OCA: respuesta sin precio')

  const plazoEntrega = Number(row.PlazoEntrega) || undefined

  return [{
    carrier: 'oca',
    label: 'OCA',
    price: total,
    etaDaysMin: plazoEntrega,
    etaDaysMax: plazoEntrega,
  }]
}

export const ocaProvider: ShippingProvider = {
  carrier: 'oca',
  isConfigured,
  getQuotes,
}
