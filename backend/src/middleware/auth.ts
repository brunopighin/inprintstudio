import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  authenticate(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Acceso denegado' })
      return
    }
    next()
  })
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.slice(7))
    } catch {
      // ignore invalid token — optional auth
    }
  }
  next()
}
