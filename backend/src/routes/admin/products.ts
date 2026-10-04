import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const toIntOrNull = (v: unknown) => (v === '' || v === null || v === undefined) ? null : Number(v)

interface VariantInput {
  label: string
  size?: string
  paperType?: string
  quantity?: number
  price: number
  stock?: number
  weightGrams?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
}

const mapVariant = (v: VariantInput) => ({
  label: v.label,
  size: v.size || null,
  paperType: v.paperType || null,
  quantity: v.quantity ? Number(v.quantity) : null,
  price: Number(v.price),
  stock: Number(v.stock || 999),
  weightGrams: toIntOrNull(v.weightGrams),
  lengthCm: toIntOrNull(v.lengthCm),
  widthCm: toIntOrNull(v.widthCm),
  heightCm: toIntOrNull(v.heightCm),
})

// Sin peso ni medidas no hay cotización real posible: computeOrderPhysicals cae
// a un paquete por defecto y el comprador ve un precio de envío que no tiene
// relación con lo que Correo va a cobrar. El dato lo carga el cliente desde el
// admin, así que se exige al guardar en vez de confiar en que se acuerde.
const PACKAGE_REQUIRED = 'Cargá peso y medidas del paquete para poder cotizar el envío. Si cada variante tiene un tamaño distinto, completalas en todas las variantes.'

interface PackageData {
  weightGrams?: unknown
  lengthCm?: unknown
  widthCm?: unknown
  heightCm?: unknown
}

const hasPackageData = (v: PackageData) =>
  [v.weightGrams, v.lengthCm, v.widthCm, v.heightCm].every(n => Number(n) > 0)

// Vale cargarlo en el producto o en todas sus variantes, porque al cotizar la
// variante pisa al producto (ver resolveItems en routes/orders.ts).
function packageError(body: PackageData & { variants?: VariantInput[] }): string | null {
  if (hasPackageData(body)) return null
  // Precio 0 es válido (placeholder hasta que la dueña defina precios); no filtrar por price
  const variants = (body.variants || []).filter(v => v.label)
  if (variants.length && variants.every(hasPackageData)) return null
  return PACKAGE_REQUIRED
}

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, active, page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (search) where.name = { contains: search as string }
    if (category) where.category = { slug: category }
    if (active !== undefined) where.active = active === 'true'

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, subcategory: true, variants: true },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])

    // Cuántos productos del catálogo no pueden cotizar envío todavía, para que
    // el admin lo vea sin tener que abrirlos uno por uno.
    const all = await prisma.product.findMany({
      select: {
        weightGrams: true, lengthCm: true, widthCm: true, heightCm: true,
        variants: { select: { weightGrams: true, lengthCm: true, widthCm: true, heightCm: true } },
      },
    })
    const missingPackageData = all.filter(p =>
      !hasPackageData(p) && !(p.variants.length && p.variants.every(hasPackageData))
    ).length

    res.json({ products, total, missingPackageData })
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

router.patch('/bulk-activate', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, category } = req.query
    const where: Record<string, unknown> = { active: false }
    if (search) where.name = { contains: search as string }
    if (category) where.category = { slug: category }

    const { count } = await prisma.product.updateMany({ where, data: { active: true } })
    res.json({ count })
  } catch {
    res.status(500).json({ error: 'Error al activar productos' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, categoryId, subcategoryId, images, basePrice, weightGrams, lengthCm, widthCm, heightCm, photoFormat, featured, active, variants } = req.body

    const packageProblem = packageError(req.body)
    if (packageProblem) { res.status(400).json({ error: packageProblem }); return }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    const product = await prisma.product.create({
      data: {
        name, description, categoryId,
        subcategoryId: subcategoryId || null,
        images: JSON.stringify(images || []),
        basePrice: Number(basePrice),
        weightGrams: toIntOrNull(weightGrams),
        lengthCm: toIntOrNull(lengthCm),
        widthCm: toIntOrNull(widthCm),
        heightCm: toIntOrNull(heightCm),
        photoFormat: typeof photoFormat === 'string' && photoFormat ? photoFormat.slice(0, 30) : null,
        slug,
        featured: Boolean(featured),
        active: active !== false,
        variants: variants?.length ? {
          create: variants.map(mapVariant)
        } : undefined,
      },
      include: { category: true, subcategory: true, variants: true },
    })
    res.status(201).json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear producto' })
  }
})

router.get('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, subcategory: true, variants: true },
    })
    if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return }
    res.json(product)
  } catch {
    res.status(500).json({ error: 'Error al obtener producto' })
  }
})

// Mostrar/ocultar no pasa por la validación del paquete: es un cambio de
// visibilidad y no tiene por qué exigir completar peso y medidas. Antes el
// frontend lo hacía con un PUT del producto entero, que ahora sí valida.
router.patch('/:id/active', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { active: Boolean(req.body.active) },
      include: { category: true, subcategory: true, variants: true },
    })
    res.json(product)
  } catch {
    res.status(500).json({ error: 'Error al cambiar la visibilidad del producto' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, categoryId, subcategoryId, images, basePrice, weightGrams, lengthCm, widthCm, heightCm, photoFormat, featured, active, variants } = req.body

    const packageProblem = packageError(req.body)
    if (packageProblem) { res.status(400).json({ error: packageProblem }); return }

    await prisma.productVariant.deleteMany({ where: { productId: req.params.id } })

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name, description, categoryId,
        subcategoryId: subcategoryId || null,
        images: JSON.stringify(images || []),
        basePrice: Number(basePrice),
        weightGrams: toIntOrNull(weightGrams),
        lengthCm: toIntOrNull(lengthCm),
        widthCm: toIntOrNull(widthCm),
        heightCm: toIntOrNull(heightCm),
        photoFormat: typeof photoFormat === 'string' && photoFormat ? photoFormat.slice(0, 30) : null,
        featured: Boolean(featured),
        active: Boolean(active),
        variants: variants?.length ? {
          create: variants.map(mapVariant)
        } : undefined,
      },
      include: { category: true, subcategory: true, variants: true },
    })
    res.json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } })
    res.json({ message: 'Producto desactivado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar producto' })
  }
})

export { router as adminProductRoutes }
