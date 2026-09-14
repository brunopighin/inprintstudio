-- Migración manual: generación de envío / selección de sucursal / estado del
-- envío en Correo Argentino. Ejecutar contra la base de producción/staging
-- antes de desplegar el nuevo backend, o correr `npx prisma db push`.

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingBranchCode" TEXT,
  ADD COLUMN IF NOT EXISTS "shipmentStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "shipmentError" TEXT;
