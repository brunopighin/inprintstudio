-- Migración manual: peso y medidas por producto/variante para calcular el
-- paquete real de cada pedido en vez de usar un tamaño fijo para todos los
-- envíos. Ejecutar contra la base de producción/staging, o correr
-- `npx prisma db push`.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "weightGrams" INTEGER,
  ADD COLUMN IF NOT EXISTS "lengthCm" INTEGER,
  ADD COLUMN IF NOT EXISTS "widthCm" INTEGER,
  ADD COLUMN IF NOT EXISTS "heightCm" INTEGER;

ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "lengthCm" INTEGER,
  ADD COLUMN IF NOT EXISTS "widthCm" INTEGER,
  ADD COLUMN IF NOT EXISTS "heightCm" INTEGER;
