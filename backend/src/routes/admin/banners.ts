import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { displayOrder: 'asc' } })
    res.json(banners)
  } catch {
    res.status(500).json({ error: 'Error al obtener banners' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, subtitle, image, link, active, displayOrder } = req.body
    const banner = await prisma.banner.create({
      data: { title, subtitle, image, link, active: Boolean(active), displayOrder: Number(displayOrder || 0) },
    })
    res.status(201).json(banner)
  } catch {
    res.status(500).json({ error: 'Error al crear banner' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, subtitle, image, link, active, displayOrder } = req.body
    const banner = await prisma.banner.update({
      where: { id: req.params.id },
      data: { title, subtitle, image, link, active: Boolean(active), displayOrder: Number(displayOrder || 0) },
    })
    res.json(banner)
  } catch {
    res.status(500).json({ error: 'Error al actualizar banner' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id } })
    res.json({ message: 'Banner eliminado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar banner' })
  }
})

export { router as adminBannerRoutes }
