import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  alt: string
  // Controlado desde afuera (ej. miniaturas en el detalle); si no se pasa, maneja su propio índice
  index?: number
  onIndexChange?: (index: number) => void
  // En la card las flechas solo aparecen en desktop al pasar el mouse; en el detalle también en mobile
  arrowsOnMobile?: boolean
}

const SWIPE_THRESHOLD = 40

export default function ImageSlider({ images, alt, index, onIndexChange, arrowsOnMobile = false }: Props) {
  const [internalIndex, setInternalIndex] = useState(0)
  const current = index ?? internalIndex
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const goTo = (i: number) => {
    const next = (i + images.length) % images.length
    setInternalIndex(next)
    onIndexChange?.(next)
  }

  // Las flechas pueden estar dentro de un <Link>: evitamos que el click navegue
  const arrowClick = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    goTo(current + delta)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      goTo(current + (dx < 0 ? 1 : -1))
    }
  }

  const arrowVisibility = arrowsOnMobile
    ? 'flex md:opacity-0 md:group-hover:opacity-100'
    : 'hidden md:flex opacity-0 group-hover:opacity-100'

  return (
    <div className="relative w-full h-full overflow-hidden group" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={alt}
            className="w-full h-full object-cover flex-shrink-0"
            loading={i === 0 ? undefined : 'lazy'}
            draggable={false}
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Imagen anterior"
            onClick={arrowClick(-1)}
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 items-center justify-center hover:bg-white transition-opacity ${arrowVisibility}`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Imagen siguiente"
            onClick={arrowClick(1)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 items-center justify-center hover:bg-white transition-opacity ${arrowVisibility}`}
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                style={{ boxShadow: '0 0 2px rgba(0,0,0,0.4)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
