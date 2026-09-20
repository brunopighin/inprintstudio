import { useEffect, useState } from 'react'
import { Check, X, Plug } from 'lucide-react'
import api from '../../services/api'
import { PROVINCES } from '../../types'

interface SettingsForm {
  MICORREO_USER: string
  MICORREO_PASSWORD: string
  MICORREO_ENVIRONMENT: string
  SENDER_NAME: string
  SENDER_PHONE: string
  SENDER_EMAIL: string
  SENDER_STREET: string
  SENDER_NUMBER: string
  SENDER_FLOOR: string
  SENDER_APARTMENT: string
  SENDER_CITY: string
  SENDER_PROVINCE: string
  SENDER_POSTAL_CODE: string
  ORIGIN_POSTAL_CODE: string
  MERCADOPAGO_ENABLED: string
  MERCADOPAGO_ADJUSTMENT_PERCENT: string
  TRANSFER_ENABLED: string
  TRANSFER_ADJUSTMENT_PERCENT: string
  TRANSFER_BANK: string
  TRANSFER_CBU: string
  TRANSFER_ALIAS: string
  TRANSFER_CUIT: string
  TRANSFER_HOLDER: string
  TRANSFER_NOTE: string
}

const EMPTY_FORM: SettingsForm = {
  MICORREO_USER: '', MICORREO_PASSWORD: '', MICORREO_ENVIRONMENT: 'production',
  SENDER_NAME: '', SENDER_PHONE: '', SENDER_EMAIL: '', SENDER_STREET: '', SENDER_NUMBER: '',
  SENDER_FLOOR: '', SENDER_APARTMENT: '', SENDER_CITY: '', SENDER_PROVINCE: '', SENDER_POSTAL_CODE: '',
  ORIGIN_POSTAL_CODE: '',
  MERCADOPAGO_ENABLED: 'true', MERCADOPAGO_ADJUSTMENT_PERCENT: '0',
  TRANSFER_ENABLED: 'true', TRANSFER_ADJUSTMENT_PERCENT: '0',
  TRANSFER_BANK: '', TRANSFER_CBU: '', TRANSFER_ALIAS: '', TRANSFER_CUIT: '', TRANSFER_HOLDER: '', TRANSFER_NOTE: '',
}

const isAxiosError = (e: unknown): e is { response?: { data?: { error?: string } } } =>
  typeof e === 'object' && e !== null && 'response' in e

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setSuccess(false)
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSaving(true)
    try {
      await api.put('/auth/me', { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.error || 'No se pudo cambiar la contraseña' : 'No se pudo cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="font-bold">Cambiar contraseña</h2>
        <p className="text-xs text-gray-400 mt-1">Contraseña de acceso a este panel de administración.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Contraseña actual</label>
          <input className="input-base" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        </div>
        <div />
        <div>
          <label className="label">Nueva contraseña</label>
          <input className="input-base" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirmar nueva contraseña</label>
          <input className="input-base" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={handleSubmit} disabled={saving || !currentPassword || !newPassword} className="btn-secondary disabled:opacity-50">
          {saving ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
        {success && <span className="text-sm text-green-700 flex items-center gap-1"><Check size={14} /> Contraseña actualizada</span>}
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM)
  const [passwordSet, setPasswordSet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    api.get('/admin/settings').then(r => {
      const { micorreoPasswordSet, ...values } = r.data
      setForm(f => ({
        ...f, ...values,
        MICORREO_PASSWORD: '',
        MICORREO_ENVIRONMENT: values.MICORREO_ENVIRONMENT || 'production',
        MERCADOPAGO_ENABLED: values.MERCADOPAGO_ENABLED || 'true',
        MERCADOPAGO_ADJUSTMENT_PERCENT: values.MERCADOPAGO_ADJUSTMENT_PERCENT || '0',
        TRANSFER_ENABLED: values.TRANSFER_ENABLED || 'true',
        TRANSFER_ADJUSTMENT_PERCENT: values.TRANSFER_ADJUSTMENT_PERCENT || '0',
      }))
      setPasswordSet(Boolean(micorreoPasswordSet))
      setLoading(false)
    })
  }, [])

  const update = (k: keyof SettingsForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await api.put('/admin/settings', form)
      if (form.MICORREO_PASSWORD) setPasswordSet(true)
      setForm(f => ({ ...f, MICORREO_PASSWORD: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const { data } = await api.post('/admin/settings/correo-argentino/test-connection')
      setTestResult({ ok: true, message: `Conexión OK — customerId ${data.customerId}` })
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined
      setTestResult({ ok: false, message: message || 'No se pudo conectar con MiCorreo' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Envíos y medios de pago de la tienda.</p>
      </div>

      <ChangePasswordCard />

      <div className="bg-white border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold">Correo Argentino (MiCorreo)</h2>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="btn-secondary py-1.5 px-3 text-xs gap-1.5 disabled:opacity-50"
          >
            <Plug size={13} /> {testing ? 'Probando conexión...' : 'Probar conexión'}
          </button>
        </div>
        {testResult && (
          <p className={`text-sm flex items-center gap-1.5 ${testResult.ok ? 'text-green-700' : 'text-red-600'}`}>
            {testResult.ok ? <Check size={14} /> : <X size={14} />} {testResult.message}
          </p>
        )}
        <p className="text-xs text-gray-400 -mt-2">Prueba la conexión con lo que ya está guardado — guardá los cambios antes de probar.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Usuario (email de la cuenta MiCorreo)</label>
            <input className="input-base" value={form.MICORREO_USER} onChange={e => update('MICORREO_USER', e.target.value)} placeholder="tucuenta@mail.com" />
          </div>
          <div>
            <label className="label">Contraseña {passwordSet && <span className="text-green-600 font-normal">(ya cargada)</span>}</label>
            <input className="input-base" type="password" value={form.MICORREO_PASSWORD} onChange={e => update('MICORREO_PASSWORD', e.target.value)} placeholder={passwordSet ? '•••••••• (dejar en blanco para no cambiar)' : ''} />
          </div>
          <div>
            <label className="label">Ambiente</label>
            <select className="input-base" value={form.MICORREO_ENVIRONMENT} onChange={e => update('MICORREO_ENVIRONMENT', e.target.value)}>
              <option value="production">Producción</option>
              <option value="sandbox">Pruebas (sandbox)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Dejalo en "Producción" salvo que Correo te haya dado credenciales de prueba.</p>
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 pt-2">Remitente (de dónde sale el envío)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input-base" value={form.SENDER_NAME} onChange={e => update('SENDER_NAME', e.target.value)} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input-base" value={form.SENDER_PHONE} onChange={e => update('SENDER_PHONE', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input-base" type="email" value={form.SENDER_EMAIL} onChange={e => update('SENDER_EMAIL', e.target.value)} />
          </div>
          <div />
          <div>
            <label className="label">Calle</label>
            <input className="input-base" value={form.SENDER_STREET} onChange={e => update('SENDER_STREET', e.target.value)} />
          </div>
          <div>
            <label className="label">Número</label>
            <input className="input-base" value={form.SENDER_NUMBER} onChange={e => update('SENDER_NUMBER', e.target.value)} />
          </div>
          <div>
            <label className="label">Piso (opcional)</label>
            <input className="input-base" value={form.SENDER_FLOOR} onChange={e => update('SENDER_FLOOR', e.target.value)} />
          </div>
          <div>
            <label className="label">Depto (opcional)</label>
            <input className="input-base" value={form.SENDER_APARTMENT} onChange={e => update('SENDER_APARTMENT', e.target.value)} />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input className="input-base" value={form.SENDER_CITY} onChange={e => update('SENDER_CITY', e.target.value)} />
          </div>
          <div>
            <label className="label">Provincia</label>
            <select className="input-base" value={form.SENDER_PROVINCE} onChange={e => update('SENDER_PROVINCE', e.target.value)}>
              <option value="">Seleccioná una provincia</option>
              {PROVINCES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Código postal</label>
            <input className="input-base max-w-[180px]" value={form.SENDER_POSTAL_CODE} onChange={e => update('SENDER_POSTAL_CODE', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold">General</h2>
        <div>
          <label className="label">Código postal de origen</label>
          <input className="input-base max-w-[180px]" value={form.ORIGIN_POSTAL_CODE} onChange={e => update('ORIGIN_POSTAL_CODE', e.target.value)} placeholder="1900" />
          <p className="text-xs text-gray-400 mt-1">El código postal de tu local/depósito, usado para cotizar envíos.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="font-bold">Medios de pago</h2>
          <p className="text-xs text-gray-400 mt-1">Activá o desactivá cada medio y definí un % de recargo (positivo) o descuento (negativo) sobre el total del pedido.</p>
        </div>

        <div className="space-y-3 pb-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">MercadoPago</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4" checked={form.MERCADOPAGO_ENABLED === 'true'} onChange={e => update('MERCADOPAGO_ENABLED', e.target.checked ? 'true' : 'false')} />
              Activo
            </label>
          </div>
          <div className="max-w-[200px]">
            <label className="label">% de ajuste</label>
            <input className="input-base" type="number" step="0.01" value={form.MERCADOPAGO_ADJUSTMENT_PERCENT} onChange={e => update('MERCADOPAGO_ADJUSTMENT_PERCENT', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Dejalo en 0 si tus precios de lista ya incluyen la comisión de MercadoPago.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Transferencia bancaria</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4" checked={form.TRANSFER_ENABLED === 'true'} onChange={e => update('TRANSFER_ENABLED', e.target.checked ? 'true' : 'false')} />
              Activo
            </label>
          </div>
          <div className="max-w-[200px]">
            <label className="label">% de ajuste</label>
            <input className="input-base" type="number" step="0.01" value={form.TRANSFER_ADJUSTMENT_PERCENT} onChange={e => update('TRANSFER_ADJUSTMENT_PERCENT', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Ej: -10 para un 10% de descuento pagando por transferencia.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Banco</label>
              <input className="input-base" value={form.TRANSFER_BANK} onChange={e => update('TRANSFER_BANK', e.target.value)} />
            </div>
            <div>
              <label className="label">Titular</label>
              <input className="input-base" value={form.TRANSFER_HOLDER} onChange={e => update('TRANSFER_HOLDER', e.target.value)} />
            </div>
            <div>
              <label className="label">CBU</label>
              <input className="input-base" value={form.TRANSFER_CBU} onChange={e => update('TRANSFER_CBU', e.target.value)} />
            </div>
            <div>
              <label className="label">Alias</label>
              <input className="input-base" value={form.TRANSFER_ALIAS} onChange={e => update('TRANSFER_ALIAS', e.target.value)} />
            </div>
            <div>
              <label className="label">CUIT / CUIL</label>
              <input className="input-base" value={form.TRANSFER_CUIT} onChange={e => update('TRANSFER_CUIT', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Nota para el cliente (opcional)</label>
            <textarea className="input-base resize-none" rows={2} value={form.TRANSFER_NOTE} onChange={e => update('TRANSFER_NOTE', e.target.value)} placeholder="Enviá el comprobante al WhatsApp o email y confirmamos tu pedido." />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-sm text-green-700 flex items-center gap-1"><Check size={14} /> Guardado</span>}
      </div>
    </div>
  )
}
