import { Router, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten archivos de imagen'))
      return
    }
    cb(null, true)
  },
})

router.post('/', requireAdmin, (req: AuthRequest, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof multer.MulterError ? err.message : (err as Error).message
      res.status(400).json({ error: message || 'Error al subir la imagen' })
      return
    }
    next()
  })
}, (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No se recibió ninguna imagen' })
    return
  }
  const publicUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
  res.status(201).json({ url: `${publicUrl}/uploads/${req.file.filename}` })
})

export { router as adminUploadRoutes }
