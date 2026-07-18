import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signToken } from '../utils/jwt'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' })
      return
    }
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      res.status(400).json({ error: 'Ya existe una cuenta con ese email' })
      return
    }
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, phone, role: 'CUSTOMER' },
    })
    const token = signToken({ id: user.id, email: user.email, role: user.role })
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Email o contraseña incorrectos' })
      return
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role })
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch {
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil' })
  }
})

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return }

    const updateData: Record<string, unknown> = { name, phone }

    if (newPassword) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        res.status(400).json({ error: 'Contraseña actual incorrecta' })
        return
      }
      updateData.password = await bcrypt.hash(newPassword, 10)
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
})

export { router as authRoutes }
