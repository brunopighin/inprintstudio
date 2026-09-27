// Validación de teléfonos argentinos. El número se usa para avisarle al
// comprador y viaja a Correo Argentino al generar el envío, así que no sirve
// cualquier cosa: antes alcanzaba con que el campo no estuviera vacío.
//
// Esta lógica está duplicada en frontend/src/utils/phone.ts a propósito (no hay
// código compartido entre los dos proyectos). Si cambia una, cambiar la otra.

// Deja el número en 10 dígitos: código de área + abonado, que es el formato
// nacional. Saca el +54, el 0 de larga distancia, el 9 de los celulares y el
// 15 que se escribe después del código de área.
export function normalizeArgentinePhone(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length > 10 && d.startsWith('9')) d = d.slice(1)
  // El 15 va pegado después del código de área, que puede tener 2, 3 o 4
  // dígitos: 11 15 xxxx-xxxx, 221 15 xxx-xxxx, 2323 15 xx-xxxx.
  if (d.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (d.slice(areaLen, areaLen + 2) === '15') {
        d = d.slice(0, areaLen) + d.slice(areaLen + 2)
        break
      }
    }
  }
  return d
}

export function isValidArgentinePhone(raw: string): boolean {
  const d = normalizeArgentinePhone(raw)
  if (d.length !== 10) return false
  // Un código de área no arranca en 0 ni en 1 (salvo el 11 de Buenos Aires).
  if (d.startsWith('0')) return false
  if (d.startsWith('1') && !d.startsWith('11')) return false
  // Descarta rellenos tipo 0000000000 o 1111111111.
  if (/^(\d)\1{9}$/.test(d)) return false
  return true
}
