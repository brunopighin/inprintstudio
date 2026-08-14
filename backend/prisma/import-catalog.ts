import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

const API_BASE = process.env.IMPORT_API_BASE || 'https://backend-production-67618.up.railway.app'
const ADMIN_EMAIL = process.env.IMPORT_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.IMPORT_ADMIN_PASSWORD
const IMAGES_ROOT = process.env.IMPORT_IMAGES_ROOT
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set IMPORT_ADMIN_EMAIL and IMPORT_ADMIN_PASSWORD')
if (!IMAGES_ROOT) throw new Error('Set IMPORT_IMAGES_ROOT to the extracted product-photos folder')

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login falló: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { token: string }
  return data.token
}

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

async function uploadImage(token: string, filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath)
  const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
  const form = new FormData()
  form.append('image', new Blob([buffer], { type: mimeType }), path.basename(filePath))
  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Upload falló para ${filePath}: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { url: string }
  return data.url.replace(/^http:\/\//, 'https://')
}

function listImages(folder: string): string[] {
  return fs
    .readdirSync(folder)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(folder, f))
}

interface ProductDef {
  name: string
  description: string
  folder: string // relative to IMAGES_ROOT
  subcategoryName?: string
}

interface CategoryDef {
  name: string
  products: ProductDef[]
}

const CATALOG: CategoryDef[] = [
  {
    name: 'Elevá tu marca',
    products: [
      { name: 'Cuaderno de notas', description: 'Cuaderno personalizado ideal para tu marca, oficina o uso diario.', folder: 'Elevá tu marca/Cuaderno de notas' },
      { name: 'Folletos', description: 'Folletos impresos a color en distintos tamaños, perfectos para promocionar tu negocio.', folder: 'Elevá tu marca/Folletos' },
      { name: 'Libros para Mecánicos', description: 'Libros y manuales personalizados para talleres mecánicos.', folder: 'Elevá tu marca/Libros para Mecánicos' },
      { name: 'Tarjetas personales', description: 'Tarjetas personales o de presentación impresas a doble faz.', folder: 'Elevá tu marca/Tarjetas personales' },
    ],
  },
  {
    name: 'Estampados',
    products: [
      { name: 'Botellas', description: 'Botellas personalizadas con tu diseño o foto favorita.', folder: 'Estampados/Botellas' },
      { name: 'Gorras', description: 'Gorras estampadas con el diseño que elijas.', folder: 'Estampados/Gorras' },
      { name: 'Mates', description: 'Mates personalizados con tu foto o diseño favorito.', folder: 'Estampados/Mates' },
      { name: 'Remeras', description: 'Remeras estampadas con el diseño que elijas.', folder: 'Estampados/Remeras' },
      { name: 'Rompecabezas', description: 'Rompecabezas personalizado con tu foto favorita.', folder: 'Estampados/Rompecabezas' },
      { name: 'Tazas Cerámica', description: 'Taza de cerámica personalizada con tu foto o diseño.', folder: 'Estampados/Tazas/Cerámica', subcategoryName: 'Tazas Cerámica' },
      { name: 'Tazas Plástico', description: 'Taza de plástico personalizada con tu foto o diseño.', folder: 'Estampados/Tazas/Plástico', subcategoryName: 'Tazas Plástico' },
    ],
  },
  {
    name: 'Fechas especiales',
    products: [
      { name: 'Toppers baby shower', description: 'Toppers personalizados para baby shower y otras celebraciones.', folder: 'Fechas especiales/Toppers baby shower' },
    ],
  },
  {
    name: 'Fotografías',
    products: [
      { name: 'Clásicas', description: 'Fotos impresas en tamaños clásicos, ideales para álbumes y marcos.', folder: 'Fotografías/Clásicas' },
      { name: 'Instax', description: 'Fotos con estilo Instax, perfectas para recuerdos y decoración.', folder: 'Fotografías/Instax' },
      { name: 'Polaroid', description: 'Fotos estilo Polaroid, ideales para regalar o decorar.', folder: 'Fotografías/Polaroid' },
    ],
  },
  {
    name: 'Fotolibros - Álbumes',
    products: [
      { name: 'Fotolibro / Álbum', description: 'Fotolibro personalizado para conservar tus mejores recuerdos.', folder: 'Fotolibros - Álbumes' },
    ],
  },
  {
    name: 'Llaveros',
    products: [
      { name: 'Llavero instax', description: 'Llavero personalizado con tu foto estilo Instax.', folder: 'Llaveros/Llavero instax' },
    ],
  },
  {
    name: 'Pósters',
    products: [
      { name: 'Póster', description: 'Póster impreso en alta calidad con tu imagen o diseño favorito.', folder: 'Pósters' },
    ],
  },
  {
    name: 'Souvenirs',
    products: [
      { name: 'Souvenir', description: 'Souvenir personalizado, ideal como recuerdo o regalo.', folder: 'Souvenirs' },
    ],
  },
]

async function main() {
  console.log('1) Desactivando categorías y productos actuales (se conservan por el historial de pedidos)...')
  await prisma.product.updateMany({ data: { active: false } })
  await prisma.category.updateMany({ data: { active: false } })

  console.log('2) Iniciando sesión como admin en la API de producción...')
  const token = await login()

  let displayOrder = 0
  for (const catDef of CATALOG) {
    displayOrder += 1
    console.log(`\n=== Categoría: ${catDef.name} ===`)

    let categoryImage: string | undefined
    const uploadedByProduct: { def: ProductDef; urls: string[] }[] = []

    for (const prodDef of catDef.products) {
      const folder = path.join(IMAGES_ROOT!, prodDef.folder)
      const files = listImages(folder)
      if (files.length === 0) {
        console.warn(`  ! Sin imágenes en ${folder}, se omite`)
        continue
      }
      console.log(`  Subiendo ${files.length} imagen(es) para "${prodDef.name}"...`)
      const urls: string[] = []
      for (const file of files) {
        const url = await uploadImage(token, file)
        urls.push(url)
      }
      uploadedByProduct.push({ def: prodDef, urls })
      if (!categoryImage) categoryImage = urls[0]
    }

    const category = await prisma.category.create({
      data: {
        name: catDef.name,
        slug: slugify(catDef.name),
        image: categoryImage,
        displayOrder,
        active: true,
      },
    })

    const subcategoryCache = new Map<string, string>()

    for (const { def, urls } of uploadedByProduct) {
      let subcategoryId: string | undefined
      if (def.subcategoryName) {
        if (!subcategoryCache.has(def.subcategoryName)) {
          const sub = await prisma.subcategory.create({
            data: {
              name: def.subcategoryName,
              slug: slugify(def.subcategoryName),
              categoryId: category.id,
            },
          })
          subcategoryCache.set(def.subcategoryName, sub.id)
        }
        subcategoryId = subcategoryCache.get(def.subcategoryName)
      }

      await prisma.product.create({
        data: {
          name: def.name,
          slug: slugify(def.name),
          description: def.description,
          categoryId: category.id,
          subcategoryId,
          images: JSON.stringify(urls),
          basePrice: 0,
          active: false,
        },
      })
      console.log(`  ✓ Producto creado (inactivo, precio pendiente): ${def.name}`)
    }
  }

  console.log('\nListo. Los productos nuevos quedaron cargados como INACTIVOS (precio $0 placeholder).')
  console.log('Entrá al panel admin, cargá los precios reales y activá cada producto/categoría para publicarlos.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
