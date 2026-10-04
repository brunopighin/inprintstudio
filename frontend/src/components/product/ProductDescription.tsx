// La dueña escribe las descripciones en el admin como texto plano: párrafos separados
// por una línea en blanco, viñetas con "•" o "-", y títulos cortos que terminan en ":".
// Acá se respeta ese formato en vez de mostrar todo en un solo bloque.

const BULLET = /^\s*[•\-*]\s+/
const isHeading = (line: string) => line.trim().endsWith(':') && line.trim().length <= 60

type Block =
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; lines: string[] }

function parse(text: string): Block[] {
  const blocks: Block[] = []
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const last = blocks[blocks.length - 1]
    if (!line.trim()) {
      // Línea en blanco: corta el párrafo actual
      blocks.push({ type: 'paragraph', lines: [] })
    } else if (BULLET.test(line)) {
      const item = line.replace(BULLET, '').trim()
      if (last?.type === 'list') last.items.push(item)
      else blocks.push({ type: 'list', items: [item] })
    } else if (isHeading(line)) {
      blocks.push({ type: 'heading', text: line.trim() })
    } else if (last?.type === 'paragraph') {
      last.lines.push(line.trim())
    } else {
      blocks.push({ type: 'paragraph', lines: [line.trim()] })
    }
  }
  return blocks.filter(b => b.type !== 'paragraph' || b.lines.length > 0)
}

export default function ProductDescription({ text }: { text: string }) {
  return (
    <div className="text-gray-600 leading-relaxed text-sm space-y-3">
      {parse(text).map((b, i) => {
        if (b.type === 'heading') {
          return <p key={i} className="font-semibold text-gray-900 pt-1">{b.text}</p>
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-gray-400 select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i}>
            {b.lines.map((l, j) => (
              <span key={j}>{j > 0 && <br />}{l}</span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
