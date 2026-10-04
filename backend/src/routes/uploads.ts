import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Fotos que sube el cliente desde la página del producto. Es pública porque se
// puede comprar sin cuenta; se suben apenas las elige para no mandar 16 o 100
// imágenes dentro del pedido.

const router = Router()

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
export const CUSTOMER_PHOTOS_SUBDIR = 'clientes'
const CUSTOMER_DIR = path.join(UPLOAD_DIR, CUSTOMER_PHOTOS_SUBDIR)
fs.mkdirSync(CUSTOMER_DIR, { recursive: true })

const MAX_FILE_MB = 25
// Alcanza para varios packs de 100 fotos, pero corta a quien quiera llenar el volumen
const MAX_UPLOADS_PER_HOUR = 500
const uploadsByIp = new Map<string, { count: number; resetAt: number }>()

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const entry = uploadsByIp.get(ip)
  if (!entry || entry.resetAt < now) {
    uploadsByIp.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return next()
  }
  if (entry.count >= MAX_UPLOADS_PER_HOUR) {
    res.status(429).json({ error: 'Subiste demasiadas fotos en poco tiempo. Probá de nuevo en un rato.' })
    return
  }
  entry.count += 1
  next()
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CUSTOMER_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg'
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
    },
  }),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten archivos de imagen'))
      return
    }
    cb(null, true)
  },
})

router.post('/photo', rateLimit, (req: Request, res: Response, next: NextFunction) => {
  upload.single('photo')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? `La foto supera los ${MAX_FILE_MB} MB`
        : (err as Error).message
      res.status(400).json({ error: message || 'Error al subir la foto' })
      return
    }
    next()
  })
}, (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No se recibió ninguna foto' })
    return
  }
  const publicUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
  res.status(201).json({ url: `${publicUrl}/uploads/${CUSTOMER_PHOTOS_SUBDIR}/${req.file.filename}` })
})

export { router as uploadRoutes }
