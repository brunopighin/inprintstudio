-- Migración manual: cotización real de envío (Andreani / Correo Argentino)
-- Ejecutar contra la base PostgreSQL de producción/staging antes de desplegar
-- el nuevo backend, o bien correr `npx prisma db push` (que aplica el mismo
-- cambio de esquema automáticamente a partir de prisma/schema.prisma).

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locality" TEXT,
  ADD COLUMN IF NOT EXISTS "province" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryReference" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCarrier" TEXT;

ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "weightGrams" INTEGER DEFAULT 500;
