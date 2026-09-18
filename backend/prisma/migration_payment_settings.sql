-- Migración manual: columna para el ajuste (recargo o descuento) aplicado
-- según el medio de pago elegido, más las claves de configuración en Setting
-- para medios de pago dinámicos (activar/desactivar, % y datos de transferencia).
-- Ejecutar contra la base de producción/staging, o correr `npx prisma db push`.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0;
