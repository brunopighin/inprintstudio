import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { authRoutes } from './routes/auth'
import { productRoutes } from './routes/products'
import { categoryRoutes } from './routes/categories'
import { orderRoutes } from './routes/orders'
import { paymentRoutes } from './routes/payments'
import { bannerRoutes } from './routes/banners'
import { adminDashboardRoutes } from './routes/admin/dashboard'
import { adminProductRoutes } from './routes/admin/products'
import { adminCategoryRoutes } from './routes/admin/categories'
import { adminOrderRoutes } from './routes/admin/orders'
import { adminUserRoutes } from './routes/admin/users'
import { adminPromotionRoutes } from './routes/admin/promotions'
import { adminBannerRoutes } from './routes/admin/banners'
import { adminUploadRoutes } from './routes/admin/upload'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3004
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5175').split(',').map(o => o.trim())
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

app.use(cors({ origin: CORS_ORIGINS, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/uploads', express.static(UPLOAD_DIR))

// Public routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/banners', bannerRoutes)

// Admin routes
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/products', adminProductRoutes)
app.use('/api/admin/categories', adminCategoryRoutes)
app.use('/api/admin/orders', adminOrderRoutes)
app.use('/api/admin/users', adminUserRoutes)
app.use('/api/admin/promotions', adminPromotionRoutes)
app.use('/api/admin/banners', adminBannerRoutes)
app.use('/api/admin/upload', adminUploadRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date(), uptime: process.uptime() }))

app.listen(PORT, () => {
  console.log(`🚀 In Print API running on http://localhost:${PORT}`)
})

export default app
