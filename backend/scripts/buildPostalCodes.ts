/**
 * Regenera src/data/postalCodes.json: el índice de código postal → localidad y
 * provincia que usa el checkout para autocompletar.
 *
 *   cd backend && npx tsx scripts/buildPostalCodes.ts
 *
 * La fuente es la lista de sucursales de Correo Argentino, o sea el mismo
 * origen que cotiza y despacha los envíos. Correo devuelve el CP en formato
 * CPA (C1194AAQ) y acá se guardan los 4 dígitos, que es lo que escribe el
 * comprador. Cubre los CP que tienen sucursal: al 2026-09-27, 1749 de ellos,
 * todos sin ambigüedad. Conviene correrlo de vez en cuando, aunque el nombre
 * de la localidad de un CP no cambia casi nunca.
 */
import { writeFileSync } from 'fs'
import { join } from 'path'
import { getAgencies } from '../src/utils/shippingProviders/correoArgentino'

const PROVINCE_CODES = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')
const OUT = join(__dirname, '..', 'src', 'data', 'postalCodes.json')

const cp4 = (raw: string) => /(\d{4})/.exec(raw || '')?.[1] || null

// Correo guarda las localidades en mayúsculas y sin acentos. Se pasa a
// capitales para que el campo del checkout no le grite al comprador.
const MINOR = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el', 'en'])
function titleCase(s: string) {
  return s.toLowerCase().split(/\s+/).map((w, i) =>
    i > 0 && MINOR.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ')
}

async function main() {
  const index: Record<string, [string, string]> = {}
  const conflicts: string[] = []
  let branches = 0

  for (const province of PROVINCE_CODES) {
    const agencies = await getAgencies(province)
    branches += agencies.length
    for (const a of agencies) {
      const cp = cp4(a.postalCode)
      const city = (a.city || '').trim()
      if (!cp || !city) continue
      const locality = titleCase(city)
      const existing = index[cp]
      if (existing && (existing[0] !== locality || existing[1] !== province)) {
        conflicts.push(`${cp}: ${existing[0]} (${existing[1]}) vs ${locality} (${province})`)
        continue
      }
      index[cp] = [locality, province]
    }
    process.stdout.write(`${province}:${agencies.length} `)
  }

  const sorted = Object.fromEntries(Object.keys(index).sort().map(k => [k, index[k]]))
  writeFileSync(OUT, JSON.stringify(sorted) + '\n')

  console.log(`\n${branches} sucursales -> ${Object.keys(sorted).length} códigos postales`)
  if (conflicts.length) {
    console.log(`${conflicts.length} CP con más de una localidad (se ignoraron):`)
    conflicts.slice(0, 20).forEach(c => console.log('  ' + c))
  } else {
    console.log('Sin conflictos: cada CP resolvió a una sola localidad.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
