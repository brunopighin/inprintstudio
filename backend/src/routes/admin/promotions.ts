import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(promotions)
  } catch {
    res.status(500).json({ error: 'Error al obtener promociones' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, discount, type, active, expiresAt } = req.body
    const promo = await prisma.promotion.create({
      data: { name, code: code.toUpperCase(), discount: Number(discount), type, active: Boolean(active), expiresAt: expiresAt ? new Date(expiresAt) : null },
    })
    res.status(201).json(promo)
  } catch {
    res.status(500).json({ error: 'Error al crear promoción' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, discount, type, active, expiresAt } = req.body
    const promo = await prisma.promotion.update({
      where: { id: req.params.id },
      data: { name, code: code?.toUpperCase(), discount: Number(discount), type, active: Boolean(active), expiresAt: expiresAt ? new Date(expiresAt) : null },
    })
    res.json(promo)
  } catch {
    res.status(500).json({ error: 'Error al actualizar promoción' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.promotion.delete({ where: { id: req.params.id } })
    res.json({ message: 'Promoción eliminada' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar promoción' })
  }
})

export { router as adminPromotionRoutes }
