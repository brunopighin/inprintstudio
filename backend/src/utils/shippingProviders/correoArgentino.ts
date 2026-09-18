import { ShippingProvider, QuoteInput, ShippingQuote } from './types'
import { getSetting, getSettings } from '../settings'

// Integración real contra la API "MiCorreo" de Correo Argentino, verificada
// contra el código fuente del plugin oficial de WooCommerce de Correo
// Argentino (class-ca-api-client.php), no adivinada:
//
// - El /token NO se firma con las credenciales de la cuenta del comerciante.
//   Se firma con una credencial fija de "integrador" que Correo le da a todo
//   integrador (WooCommerce, etc.) — es la misma que usa su propio plugin
//   oficial. Se puede pisar con MICORREO_INTEGRATOR_USER/_PASS si Correo
//   entrega una propia para este proyecto, pero por defecto son las públicas
//   conocidas.
// - El login del comerciante (MICORREO_USER/MICORREO_PASSWORD, email +
//   contraseña de su cuenta MiCorreo) se usa solo contra /users/validate
//   (ya autenticado con el Bearer del paso anterior) para obtener su
//   customerId, que es lo que identifica la cuenta en /rates.
//
// Credenciales de comerciante en https://www.correoargentino.com.ar/MiCorreo
// (no son de autoservicio instantáneo); la de integrador es fija/compartida.

const DEFAULT_INTEGRATOR_USER = 'WOOCOMMERCE'
const DEFAULT_INTEGRATOR_PASS = 'Paneles55+'

const MICORREO_URLS = {
  production: 'https://api.correoargentino.com.ar/micorreo/v1',
  sandbox: 'https://apitest.correoargentino.com.ar/micorreo/v1',
}

let cachedToken: { token: string; expiresAt: number } | null = null
let cachedCustomerId: string | null = null

// Ambiente elegido en el admin (Configuración → Envíos), no una URL a mano —
// evita depender de una variable de entorno que nadie termina cargando.
async function getBaseUrl(): Promise<string> {
  const env = await getSetting('MICORREO_ENVIRONMENT')
  return env === 'sandbox' ? MICORREO_URLS.sandbox : MICORREO_URLS.production
}

export async function isConfigured() {
  const creds = await getSettings(['MICORREO_USER', 'MICORREO_PASSWORD'])
  return Boolean(creds.MICORREO_USER && creds.MICORREO_PASSWORD)
}

// Se llama después de guardar credenciales nuevas en el admin, para no seguir
// usando un token/customerId obtenidos con las credenciales viejas.
export function resetCache() {
  cachedToken = null
  cachedCustomerId = null
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.token
  }

  const baseUrl = await getBaseUrl()
  const integratorUser = process.env.MICORREO_INTEGRATOR_USER || DEFAULT_INTEGRATOR_USER
  const integratorPass = process.env.MICORREO_INTEGRATOR_PASS || DEFAULT_INTEGRATOR_PASS
  const credentials = Buffer.from(`${integratorUser}:${integratorPass}`).toString('base64')
  const res = await fetch(`${baseUrl}/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}` },
  })
  if (!res.ok) throw new Error(`MiCorreo token error: ${res.status}`)
  const data = await res.json() as { token: string; expires: string }
  cachedToken = { token: data.token, expiresAt: new Date(data.expires).getTime() }
  return data.token
}

async function getCustomerId(): Promise<string> {
  if (cachedCustomerId) return cachedCustomerId

  const baseUrl = await getBaseUrl()
  const token = await getToken()
  const res = await fetch(`${baseUrl}/users/validate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: await getSetting('MICORREO_USER'),
      password: await getSetting('MICORREO_PASSWORD'),
    }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => null) as { message?: string } | null
    if (res.status === 404 || res.status === 401) {
      throw new Error('Usuario o contraseña de MiCorreo incorrectos.')
    }
    throw new Error(errBody?.message || `MiCorreo users/validate error: ${res.status}`)
  }
  const data = await res.json() as { customerId: string }
  if (!data.customerId) throw new Error('MiCorreo: no se pudo obtener el customerId')
  cachedCustomerId = data.customerId
  return data.customerId
}

// Igual que el botón "Probar conexión" del plugin oficial: fuerza un token y
// un customerId nuevos (ignorando la caché) para validar que las credenciales
// cargadas realmente funcionan contra MiCorreo.
export async function testConnection(): Promise<{ customerId: string }> {
  resetCache()
  await getToken()
  const customerId = await getCustomerId()
  return { customerId }
}

async function getQuotes(input: QuoteInput): Promise<ShippingQuote[]> {
  const baseUrl = await getBaseUrl()
  const [token, customerId] = await Promise.all([getToken(), getCustomerId()])

  const res = await fetch(`${baseUrl}/rates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
      postalCodeOrigin: await getSetting('ORIGIN_POSTAL_CODE'),
      postalCodeDestination: input.postalCodeDestination,
      dimensions: {
        weight: input.weightGrams,
        height: input.dimensionsCm.height,
        width: input.dimensionsCm.width,
        length: input.dimensionsCm.length,
      },
    }),
  })
  if (!res.ok) throw new Error(`MiCorreo rates error: ${res.status}`)

  const data = await res.json() as {
    rates: { deliveredType: string; productName: string; price: number; deliveryTimeMin: string; deliveryTimeMax: string }[]
  }

  // Se prioriza la entrega a domicilio ("D"); si Correo solo cotiza a sucursal
  // ("S") para ese código postal, se muestra esa opción igual.
  const domicilio = data.rates.find(r => r.deliveredType === 'D')
  const rate = domicilio || data.rates[0]
  if (!rate) return []

  return [{
    carrier: 'correo_argentino',
    label: rate.deliveredType === 'S' ? `${rate.productName} (a sucursal)` : rate.productName,
    price: rate.price,
    etaDaysMin: Number(rate.deliveryTimeMin) || undefined,
    etaDaysMax: Number(rate.deliveryTimeMax) || undefined,
  }]
}

export const correoArgentinoProvider: ShippingProvider = {
  carrier: 'correo_argentino',
  isConfigured,
  getQuotes,
}

// --- Sucursales y generación de envío (verificado contra class-ca-agencies.php /
// class-ca-shipments.php del mismo plugin oficial) -------------------------

// Códigos de provincia de Correo (= ISO 3166-2:AR, un solo carácter).
const PROVINCE_CODES: Record<string, string> = {
  SALTA: 'A',
  'BUENOS AIRES': 'B',
  'CIUDAD AUTONOMA DE BUENOS AIRES': 'C',
  CABA: 'C',
  'SAN LUIS': 'D',
  'ENTRE RIOS': 'E',
  'LA RIOJA': 'F',
  'SANTIAGO DEL ESTERO': 'G',
  CHACO: 'H',
  'SAN JUAN': 'J',
  CATAMARCA: 'K',
  'LA PAMPA': 'L',
  MENDOZA: 'M',
  MISIONES: 'N',
  FORMOSA: 'P',
  NEUQUEN: 'Q',
  'RIO NEGRO': 'R',
  'SANTA FE': 'S',
  TUCUMAN: 'T',
  CHUBUT: 'U',
  'TIERRA DEL FUEGO': 'V',
  CORRIENTES: 'W',
  CORDOBA: 'X',
  JUJUY: 'Y',
  'SANTA CRUZ': 'Z',
}

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Acepta ya sea un código de una letra o el nombre de la provincia.
export function toProvinceCode(input: string): string {
  const normalized = stripAccents(input.trim()).toUpperCase()
  if (/^[A-Z]$/.test(normalized) && Object.values(PROVINCE_CODES).includes(normalized)) {
    return normalized
  }
  return PROVINCE_CODES[normalized] || ''
}

export interface Agency {
  code: string
  name: string
  address: string
  city: string
  postalCode: string
}

export async function getAgencies(provinceCode: string): Promise<Agency[]> {
  const baseUrl = await getBaseUrl()
  const [token, customerId] = await Promise.all([getToken(), getCustomerId()])

  const url = new URL(`${baseUrl}/agencies`)
  url.searchParams.set('customerId', customerId)
  url.searchParams.set('provinceCode', provinceCode)
  url.searchParams.set('services', 'pickup_availability')

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`MiCorreo agencies error: ${res.status}`)

  const data = await res.json() as {
    code: string
    name: string
    location?: { address?: { streetName?: string; streetNumber?: string; locality?: string; city?: string; postalCode?: string } }
  }[]

  return (data || []).filter(a => a.code).map(a => {
    const addr = a.location?.address
    return {
      code: a.code,
      name: a.name || a.code,
      address: addr ? `${addr.streetName || ''} ${addr.streetNumber || ''}`.trim() : '',
      city: addr?.locality || addr?.city || '',
      postalCode: addr?.postalCode || '',
    }
  }).sort((x, y) => x.name.localeCompare(y.name))
}

interface ShipmentAddress {
  street: string
  number: string
  city: string
  provinceCode: string
  postalCode: string
  apartment?: string
}

export interface ImportShipmentParams {
  extOrderId: string
  orderNumber: string
  recipientName: string
  recipientEmail: string
  recipientPhone?: string
  deliveryType: 'D' | 'S'
  branchCode?: string
  address: ShipmentAddress
  declaredValue: number
  weightGrams: number
  dimensionsCm: { height: number; width: number; length: number }
}

// Separa "Av. Corrientes 1234" en calle + altura, igual que el plugin.
function parseStreet(address: string): { street: string; number: string } {
  const trimmed = address.trim()
  const match = /^(.*?)[\s,]+(\d+[a-zA-Z]?)\s*$/.exec(trimmed)
  if (match) return { street: match[1].trim(), number: match[2] }
  return { street: trimmed || 'S/N', number: 'S/N' }
}

export function buildShipmentAddress(rawAddress: string, city: string, province: string, postalCode: string): ShipmentAddress {
  const { street, number } = parseStreet(rawAddress)
  return {
    street,
    number,
    city,
    provinceCode: toProvinceCode(province),
    postalCode: (postalCode || '').replace(/\D/g, ''),
  }
}

export async function importShipment(params: ImportShipmentParams): Promise<void> {
  const baseUrl = await getBaseUrl()
  const [token, customerId] = await Promise.all([getToken(), getCustomerId()])

  const sender = await getSettings([
    'SENDER_NAME', 'SENDER_PHONE', 'SENDER_EMAIL', 'SENDER_STREET', 'SENDER_NUMBER',
    'SENDER_FLOOR', 'SENDER_APARTMENT', 'SENDER_CITY', 'SENDER_PROVINCE', 'SENDER_POSTAL_CODE',
  ])
  const requiredSender = ['SENDER_NAME', 'SENDER_STREET', 'SENDER_NUMBER', 'SENDER_CITY', 'SENDER_PROVINCE', 'SENDER_POSTAL_CODE']
  const missing = requiredSender.filter(k => !sender[k])
  if (missing.length) throw new Error(`Faltan datos del remitente. Cargalos en el admin, en Configuración → Envíos.`)

  const body = {
    customerId,
    extOrderId: params.extOrderId,
    orderNumber: params.orderNumber,
    sender: {
      name: sender.SENDER_NAME,
      phone: sender.SENDER_PHONE || '',
      cellPhone: sender.SENDER_PHONE || '',
      email: sender.SENDER_EMAIL || '',
      originAddress: {
        streetName: sender.SENDER_STREET,
        streetNumber: sender.SENDER_NUMBER,
        floor: sender.SENDER_FLOOR || '',
        apartment: sender.SENDER_APARTMENT || '',
        city: sender.SENDER_CITY,
        provinceCode: toProvinceCode(sender.SENDER_PROVINCE!),
        postalCode: (sender.SENDER_POSTAL_CODE || '').replace(/\D/g, ''),
      },
    },
    recipient: {
      name: params.recipientName,
      email: params.recipientEmail,
      phone: params.recipientPhone || '',
      cellPhone: params.recipientPhone || '',
    },
    shipping: {
      deliveryType: params.deliveryType,
      agency: params.deliveryType === 'S' ? (params.branchCode || null) : null,
      address: {
        streetName: params.address.street,
        streetNumber: params.address.number,
        floor: '',
        apartment: params.address.apartment || '',
        city: params.address.city,
        provinceCode: params.address.provinceCode,
        postalCode: params.address.postalCode,
      },
      weight: Math.max(1, Math.round(params.weightGrams)),
      declaredValue: params.declaredValue,
      height: Math.max(1, Math.round(params.dimensionsCm.height)),
      length: Math.max(1, Math.round(params.dimensionsCm.length)),
      width: Math.max(1, Math.round(params.dimensionsCm.width)),
    },
  }

  const res = await fetch(`${baseUrl}/shipping/import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => null) as { message?: string } | null
    throw new Error(errBody?.message || `MiCorreo shipping/import error: ${res.status}`)
  }
}
