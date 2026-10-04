-- Migración manual: formato del recorte de la foto del cliente por producto
-- (polaroid, instax, square, vertical, horizontal; NULL = el cliente elige).
-- Ejecutar contra la base de producción ANTES de desplegar el nuevo backend:
-- Prisma lee todas las columnas del producto, así que sin esta columna se cae el catálogo.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "photoFormat" TEXT;
