import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configuración editable desde el admin (credenciales de envío, remitente,
// etc.), guardada en la tabla Setting. Si una clave no está en la base, se
// usa la variable de entorno del mismo nombre como respaldo (para no romper
// despliegues que todavía la configuran solo por env var).
let cache: Record<string, string> | null = null

async function loadAll(): Promise<Record<string, string>> {
  if (cache) return cache
  const rows = await prisma.setting.findMany()
  cache = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return cache
}

export async function getSetting(key: string): Promise<string | undefined> {
  const all = await loadAll()
  return all[key] || process.env[key] || undefined
}

export async function getSettings(keys: string[]): Promise<Record<string, string | undefined>> {
  const all = await loadAll()
  return Object.fromEntries(keys.map(k => [k, all[k] || process.env[k]]))
}

export async function setSettings(values: Record<string, string>): Promise<void> {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  )
  cache = null
}
