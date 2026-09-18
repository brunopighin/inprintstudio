import { getSettings } from './settings'

export type PaymentMethodKey = 'mercadopago' | 'transfer'

export interface PaymentMethodConfig {
  key: PaymentMethodKey
  label: string
  enabled: boolean
  adjustmentPercent: number
}

export interface TransferInfo {
  bank: string
  cbu: string
  alias: string
  cuit: string
  holder: string
  note: string
}

const LABELS: Record<PaymentMethodKey, string> = {
  mercadopago: 'MercadoPago',
  transfer: 'Transferencia bancaria',
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true'
}

// Clamp defensivo: un % de ajuste fuera de este rango es casi seguro un error
// de tipeo en el admin (esto mueve plata real en cada pedido).
function toPercent(value: string | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(-95, n))
}

export async function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const s = await getSettings([
    'MERCADOPAGO_ENABLED', 'MERCADOPAGO_ADJUSTMENT_PERCENT',
    'TRANSFER_ENABLED', 'TRANSFER_ADJUSTMENT_PERCENT',
  ])
  return [
    {
      key: 'mercadopago',
      label: LABELS.mercadopago,
      enabled: toBool(s.MERCADOPAGO_ENABLED, true) && Boolean(process.env.MP_ACCESS_TOKEN),
      adjustmentPercent: toPercent(s.MERCADOPAGO_ADJUSTMENT_PERCENT),
    },
    {
      key: 'transfer',
      label: LABELS.transfer,
      enabled: toBool(s.TRANSFER_ENABLED, true),
      adjustmentPercent: toPercent(s.TRANSFER_ADJUSTMENT_PERCENT),
    },
  ]
}

export async function getPaymentMethod(key: string): Promise<PaymentMethodConfig | undefined> {
  const methods = await getPaymentMethods()
  return methods.find(m => m.key === key)
}

export async function getTransferInfo(): Promise<TransferInfo> {
  const s = await getSettings([
    'TRANSFER_BANK', 'TRANSFER_CBU', 'TRANSFER_ALIAS', 'TRANSFER_CUIT', 'TRANSFER_HOLDER', 'TRANSFER_NOTE',
  ])
  return {
    bank: s.TRANSFER_BANK || '',
    cbu: s.TRANSFER_CBU || '',
    alias: s.TRANSFER_ALIAS || '',
    cuit: s.TRANSFER_CUIT || '',
    holder: s.TRANSFER_HOLDER || '',
    note: s.TRANSFER_NOTE || '',
  }
}

export function calcAdjustment(baseTotal: number, adjustmentPercent: number): number {
  if (!adjustmentPercent) return 0
  return Math.round(baseTotal * (adjustmentPercent / 100) * 100) / 100
}
