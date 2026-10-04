import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

const productInclude = {
  category: true,
  subcategory: true,
  variants: { orderBy: [{ price: 'asc' as const }, { createdAt: 'asc' as const }] },
}

// Sin mayúsculas ni acentos: "ceramica" tiene que encontrar "Cerámica"
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Plural simple: "tazas" -> "taza", "fotos" -> "foto" (que encuentra "fotografías")
const searchTerms = (q: string) =>
  normalize(q).split(/[^a-z0-9]+/).filter(Boolean).map(t => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t))

// El buscador se resuelve en memoria: el catálogo es chico (decenas de productos) y así
// se puede ignorar acentos y buscar en categoría, descripción y variantes sin tocar la base.
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, subcategory, featured, search, page = '1', limit = '12' } = req.query
    const take = Number(limit)
    const skip = (Number(page) - 1) * take

    const where: Record<string, unknown> = { active: true }
    if (category) where.category = { slug: category }
    if (subcategory) where.subcategory = { slug: subcategory }
    if (featured === 'true') where.featured = true

    const terms = typeof search === 'string' ? searchTerms(search) : []
    if (terms.length) {
      const all = await prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' } })
      const scored = all
        .map(p => {
          const name = normalize(p.name)
          const rest = normalize([
            p.description, p.category?.name, p.subcategory?.name, ...p.variants.map(v => v.label),
          ].filter(Boolean).join(' '))
          if (!terms.every(t => name.includes(t) || rest.includes(t))) return null
          // Primero los que tienen las palabras en el nombre
          return { p, score: terms.filter(t => name.includes(t)).length }
        })
        .filter((x): x is { p: typeof all[number]; score: number } => x !== null)
        .sort((a, b) => b.score - a.score)
      const total = scored.length
      res.json({ products: scored.slice(skip, skip + take).map(x => x.p), total, page: Number(page), pages: Math.ceil(total / take) })
      return
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ])

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / take) })
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: true,
        subcategory: true,
        variants: { orderBy: [{ price: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    if (!product || !product.active) {
      res.status(404).json({ error: 'Producto no encontrado' })
      return
    }
    res.json(product)
  } catch {
    res.status(500).json({ error: 'Error al obtener producto' })
  }
})

export { router as productRoutes }
