import { CSSProperties } from 'react'
import { PhotoFormat } from '../../utils/photoFormats'

interface Props {
  src: string
  format?: PhotoFormat
  // Pisa la proporción del formato (ej. copias que pueden ser verticales u horizontales)
  aspect?: number
  className?: string
  imgClassName?: string
  style?: CSSProperties
}

// Muestra la foto del cliente como va a quedar impresa: con la proporción del
// formato y, si tiene, el marco blanco (Polaroid, Instax). Sin formato, cuadrada.
export default function FramedPhoto({ src, format, aspect, className = '', imgClassName = '', style }: Props) {
  const photo = (
    <div className="w-full overflow-hidden bg-gray-100" style={{ aspectRatio: String(aspect ?? format?.aspect ?? 1) }}>
      <img src={src} alt="" className={`w-full h-full object-cover ${imgClassName}`} />
    </div>
  )
  if (!format?.frame) return <div className={className} style={style}>{photo}</div>
  const { top, side, bottom } = format.frame
  // El padding en % se calcula sobre el ancho del contenedor, no del propio marco:
  // el envoltorio con el ancho del marco hace que los bordes salgan en proporción
  return (
    <div className={className} style={style}>
      <div
        className="bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)]"
        style={{ padding: `${top}% ${side}% ${bottom}% ${side}%` }}
      >
        {photo}
      </div>
    </div>
  )
}
