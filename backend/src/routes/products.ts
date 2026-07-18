import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, subcategory, featured, search, page = '1', limit = '12' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = { active: true }
    if (category) where.category = { slug: category }
    if (subcategory) where.subcategory = { slug: subcategory }
    if (featured === 'true') where.featured = true
    if (search) where.name = { contains: search as string }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          subcategory: true,
          variants: { orderBy: { price: 'asc' } },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
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
        variants: { orderBy: { price: 'asc' } },
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
