import { Router, Response } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: { subcategories: true, _count: { select: { products: true } } },
      orderBy: { displayOrder: 'asc' },
    })
    res.json(categories)
  } catch {
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, image, displayOrder, active } = req.body
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const category = await prisma.category.create({
      data: { name, slug, description, image, displayOrder: Number(displayOrder || 0), active: active !== false },
    })
    res.status(201).json(category)
  } catch {
    res.status(500).json({ error: 'Error al crear categoría' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, image, displayOrder, active } = req.body
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name, description, image, displayOrder: Number(displayOrder || 0), active: Boolean(active) },
    })
    res.json(category)
  } catch {
    res.status(500).json({ error: 'Error al actualizar categoría' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { active: false } })
    res.json({ message: 'Categoría desactivada' })
  } catch {
    res.status(500).json({ error: 'Error al desactivar categoría' })
  }
})

// Subcategories
router.post('/:id/subcategories', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const sub = await prisma.subcategory.create({
      data: { name, slug, categoryId: req.params.id },
    })
    res.status(201).json(sub)
  } catch {
    res.status(500).json({ error: 'Error al crear subcategoría' })
  }
})

router.delete('/subcategories/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.subcategory.delete({ where: { id: req.params.id } })
    res.json({ message: 'Subcategoría eliminada' })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      res.status(409).json({ error: 'No se puede eliminar: tiene productos asociados. Desactivalos o reasignalos primero.' })
      return
    }
    res.status(500).json({ error: 'Error al eliminar subcategoría' })
  }
})

export { router as adminCategoryRoutes }
