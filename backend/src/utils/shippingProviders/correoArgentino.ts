import { ShippingProvider, QuoteInput, ShippingQuote } from './types'

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

let cachedToken: { token: string; expiresAt: number } | null = null
let cachedCustomerId: string | null = null

function isConfigured() {
  return Boolean(
    process.env.MICORREO_BASE_URL &&
    process.env.MICORREO_USER &&
    process.env.MICORREO_PASSWORD
  )
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.token
  }

  const baseUrl = process.env.MICORREO_BASE_URL!.replace(/\/$/, '')
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

  const baseUrl = process.env.MICORREO_BASE_URL!.replace(/\/$/, '')
  const token = await getToken()
  const res = await fetch(`${baseUrl}/users/validate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: process.env.MICORREO_USER,
      password: process.env.MICORREO_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`MiCorreo users/validate error: ${res.status}`)
  const data = await res.json() as { customerId: string }
  if (!data.customerId) throw new Error('MiCorreo: no se pudo obtener el customerId')
  cachedCustomerId = data.customerId
  return data.customerId
}

async function getQuotes(input: QuoteInput): Promise<ShippingQuote[]> {
  const baseUrl = process.env.MICORREO_BASE_URL!.replace(/\/$/, '')
  const [token, customerId] = await Promise.all([getToken(), getCustomerId()])

  const res = await fetch(`${baseUrl}/rates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
      postalCodeOrigin: process.env.ORIGIN_POSTAL_CODE,
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
