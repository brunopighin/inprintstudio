import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import api from '../../services/api'
import { PROVINCES } from '../../types'

interface SettingsForm {
  MICORREO_USER: string
  MICORREO_PASSWORD: string
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
  OCA_CUIT: string
  OCA_OPERATIVA: string
  ORIGIN_POSTAL_CODE: string
}

const EMPTY_FORM: SettingsForm = {
  MICORREO_USER: '', MICORREO_PASSWORD: '',
  SENDER_NAME: '', SENDER_PHONE: '', SENDER_EMAIL: '', SENDER_STREET: '', SENDER_NUMBER: '',
  SENDER_FLOOR: '', SENDER_APARTMENT: '', SENDER_CITY: '', SENDER_PROVINCE: '', SENDER_POSTAL_CODE: '',
  OCA_CUIT: '', OCA_OPERATIVA: '', ORIGIN_POSTAL_CODE: '',
}

export default function AdminShippingSettings() {
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM)
  const [passwordSet, setPasswordSet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/admin/settings').then(r => {
      const { micorreoPasswordSet, ...values } = r.data
      setForm(f => ({ ...f, ...values, MICORREO_PASSWORD: '' }))
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

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black">Envíos</h1>
        <p className="text-gray-500 text-sm mt-1">Credenciales y datos de remitente para cotizar y generar envíos.</p>
      </div>

      <div className="bg-white border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold">Correo Argentino (MiCorreo)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Usuario (email de la cuenta MiCorreo)</label>
            <input className="input-base" value={form.MICORREO_USER} onChange={e => update('MICORREO_USER', e.target.value)} placeholder="tucuenta@mail.com" />
          </div>
          <div>
            <label className="label">Contraseña {passwordSet && <span className="text-green-600 font-normal">(ya cargada)</span>}</label>
            <input className="input-base" type="password" value={form.MICORREO_PASSWORD} onChange={e => update('MICORREO_PASSWORD', e.target.value)} placeholder={passwordSet ? '•••••••• (dejar en blanco para no cambiar)' : ''} />
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

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-sm text-green-700 flex items-center gap-1"><Check size={14} /> Guardado</span>}
      </div>
    </div>
  )
}
