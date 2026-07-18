import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      include: { subcategories: true },
      orderBy: { displayOrder: 'asc' },
    })
    res.json(categories)
  } catch {
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { subcategories: true },
    })
    if (!category) { res.status(404).json({ error: 'Categoría no encontrada' }); return }
    res.json(category)
  } catch {
    res.status(500).json({ error: 'Error al obtener categoría' })
  }
})

export { router as categoryRoutes }
