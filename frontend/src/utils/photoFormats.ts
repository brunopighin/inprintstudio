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
}

export const PHOTO_FORMATS: Record<string, PhotoFormat> = {
  // Polaroid: papel 88×107 mm, foto 79×79 mm (bordes 4,5 a los lados, 6,5 arriba, 21,5 abajo)
  polaroid: { label: 'Polaroid (cuadrada, con marco blanco)', aspect: 1, frame: { top: 7.4, side: 5.1, bottom: 24.4 } },
  // Instax mini: papel 54×86 mm, foto 46×62 mm (bordes 4 a los lados, 6,5 arriba, 17,5 abajo)
  instax: { label: 'Instax mini (vertical, con marco blanco)', aspect: 46 / 62, frame: { top: 12, side: 7.4, bottom: 32.4 } },
  square: { label: 'Cuadrada', aspect: 1 },
  vertical: { label: 'Vertical 2:3 (10x15, 20x30)', aspect: 2 / 3 },
  horizontal: { label: 'Horizontal 3:2', aspect: 3 / 2 },
}

export const getPhotoFormat = (key?: string | null): PhotoFormat | undefined =>
  key ? PHOTO_FORMATS[key] : undefined
