// Formato en el que se recorta la foto que sube el cliente. Se elige por producto
// desde el admin (Product.photoFormat). Sin formato, el cliente elige el recorte.
//
// El marco es solo una vista previa para que el cliente vea cómo queda: no se
// agrega al archivo que se sube. Los bordes están en % del ancho total del papel
// (así calcula el padding en CSS) y salen de las medidas reales.

export interface PhotoFrame {
  top: number
  side: number
  bottom: number
}

export interface PhotoFormat {
  label: string
  aspect: number // ancho / alto del área de la foto
  frame?: PhotoFrame
  // La proporción sale de la medida de la variante (ej. "13x18") y el cliente elige
  // vertical u horizontal; aspect queda como respaldo si la variante no tiene medida
  orientable?: boolean
}

export type Orientation = 'vertical' | 'horizontal'

export const PHOTO_FORMATS: Record<string, PhotoFormat> = {
  // Polaroid: papel 88×107 mm, foto 79×79 mm (bordes 4,5 a los lados, 6,5 arriba, 21,5 abajo)
  polaroid: { label: 'Polaroid (cuadrada, con marco blanco)', aspect: 1, frame: { top: 7.4, side: 5.1, bottom: 24.4 } },
  // Instax mini: papel 54×86 mm, foto 46×62 mm (bordes 4 a los lados, 6,5 arriba, 17,5 abajo)
  instax: { label: 'Instax mini (vertical, con marco blanco)', aspect: 46 / 62, frame: { top: 12, side: 7.4, bottom: 32.4 } },
  // Copias clásicas y pósters: 10x15, 13x18, 15x21, 21x29,7...
  print: { label: 'Según la medida de cada opción (vertical u horizontal)', aspect: 2 / 3, orientable: true },
  square: { label: 'Cuadrada', aspect: 1 },
  vertical: { label: 'Vertical 2:3 (10x15, 20x30)', aspect: 2 / 3 },
  horizontal: { label: 'Horizontal 3:2', aspect: 3 / 2 },
}

export const getPhotoFormat = (key?: string | null): PhotoFormat | undefined =>
  key ? PHOTO_FORMATS[key] : undefined

// "10x15", "15x21cm", "21x29,7cm" -> lado corto / lado largo (siempre <= 1)
export function sizeRatio(size?: string | null): number | undefined {
  const m = size?.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i)
  if (!m) return undefined
  const a = Number(m[1])
  const b = Number(m[2])
  if (!a || !b) return undefined
  return Math.min(a, b) / Math.max(a, b)
}

// Proporción (ancho / alto) con la que se recorta: fija según el formato, o según la
// medida de la variante y la orientación elegida
export function resolveAspect(
  format: PhotoFormat | undefined,
  variant: { size?: string | null; label?: string } | null | undefined,
  orientation: Orientation = 'vertical',
): number | undefined {
  if (!format) return undefined
  if (!format.orientable) return format.aspect
  const ratio = sizeRatio(variant?.size) ?? sizeRatio(variant?.label) ?? format.aspect
  return orientation === 'horizontal' ? 1 / ratio : ratio
}
