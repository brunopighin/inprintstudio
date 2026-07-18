import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, active, page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (search) where.name = { contains: search as string }
    if (category) where.category = { slug: category }
    if (active !== undefined) where.active = active === 'true'

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, subcategory: true, variants: true },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])
    res.json({ products, total })
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, categoryId, subcategoryId, images, basePrice, featured, active, variants } = req.body
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    const product = await prisma.product.create({
      data: {
        name, description, categoryId,
        subcategoryId: subcategoryId || null,
        images: JSON.stringify(images || []),
        basePrice: Number(basePrice),
        slug,
        featured: Boolean(featured),
        active: active !== false,
        variants: variants?.length ? {
          create: variants.map((v: { label: string; size?: string; paperType?: string; quantity?: number; price: number; stock?: number }) => ({
            label: v.label,
            size: v.size || null,
            paperType: v.paperType || null,
            quantity: v.quantity ? Number(v.quantity) : null,
            price: Number(v.price),
            stock: Number(v.stock || 999),
          }))
        } : undefined,
      },
      include: { category: true, subcategory: true, variants: true },
    })
    res.status(201).json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear producto' })
  }
})

router.get('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, subcategory: true, variants: true },
    })
    if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }
    res.json(product)
  } catch {
    res.status(500).json({ error: 'Error al obtener producto' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, categoryId, subcategoryId, images, basePrice, featured, active, variants } = req.body

    await prisma.productVariant.deleteMany({ where: { productId: req.params.id } })

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name, description, categoryId,
        subcategoryId: subcategoryId || null,
        images: JSON.stringify(images || []),
        basePrice: Number(basePrice),
        featured: Boolean(featured),
        active: Boolean(active),
        variants: variants?.length ? {
          create: variants.map((v: { label: string; size?: string; paperType?: string; quantity?: number; price: number; stock?: number }) => ({
            label: v.label,
            size: v.size || null,
            paperType: v.paperType || null,
            quantity: v.quantity ? Number(v.quantity) : null,
            price: Number(v.price),
            stock: Number(v.stock || 999),
          }))
        } : undefined,
      },
      include: { category: true, subcategory: true, variants: true },
    })
    res.json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } })
    res.json({ message: 'Producto desactivado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar producto' })
  }
})

export { router as adminProductRoutes }
