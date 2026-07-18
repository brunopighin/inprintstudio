import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    })
    res.json(banners)
  } catch {
    res.status(500).json({ error: 'Error al obtener banners' })
  }
})

export { router as bannerRoutes }
