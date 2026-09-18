import { Router, Response } from 'express'
import { requireAdmin, AuthRequest } from '../../middleware/auth'
import { getSettings, setSettings } from '../../utils/settings'
import { resetCache as resetCorreoArgentinoCache, testConnection as testCorreoArgentinoConnection, isConfigured as isCorreoArgentinoConfigured } from '../../utils/shippingProviders/correoArgentino'

const router = Router()

const SENDER_KEYS = [
  'SENDER_NAME', 'SENDER_PHONE', 'SENDER_EMAIL', 'SENDER_STREET', 'SENDER_NUMBER',
  'SENDER_FLOOR', 'SENDER_APARTMENT', 'SENDER_CITY', 'SENDER_PROVINCE', 'SENDER_POSTAL_CODE',
]
const PUBLIC_KEYS = ['MICORREO_USER', 'MICORREO_ENVIRONMENT', ...SENDER_KEYS, 'OCA_CUIT', 'OCA_OPERATIVA', 'ORIGIN_POSTAL_CODE']

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const values = await getSettings(PUBLIC_KEYS)
    const micorreoPassword = await getSettings(['MICORREO_PASSWORD'])
    res.json({
      ...Object.fromEntries(PUBLIC_KEYS.map(k => [k, values[k] || ''])),
      micorreoPasswordSet: Boolean(micorreoPassword.MICORREO_PASSWORD),
    })
  } catch {
    res.status(500).json({ error: 'Error al obtener la configuración' })
  }
})

router.put('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>
    const updates: Record<string, string> = {}

    for (const key of PUBLIC_KEYS) {
      if (typeof body[key] === 'string') updates[key] = (body[key] as string).trim()
    }
    // La contraseña solo se pisa si mandan una nueva; en blanco = no tocar.
    if (typeof body.MICORREO_PASSWORD === 'string' && body.MICORREO_PASSWORD.trim()) {
      updates.MICORREO_PASSWORD = body.MICORREO_PASSWORD.trim()
    }

    await setSettings(updates)
    if (updates.MICORREO_USER || updates.MICORREO_PASSWORD || updates.MICORREO_ENVIRONMENT) resetCorreoArgentinoCache()

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al guardar la configuración' })
  }
})

router.post('/correo-argentino/test-connection', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    if (!(await isCorreoArgentinoConfigured())) {
      res.status(400).json({ error: 'Cargá usuario y contraseña de MiCorreo antes de probar la conexión.' })
      return
    }
    const { customerId } = await testCorreoArgentinoConnection()
    res.json({ ok: true, customerId })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo conectar con MiCorreo' })
  }
})

export { router as adminSettingsRoutes }
