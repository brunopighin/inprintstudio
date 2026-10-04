-- Migración manual: varias fotos por ítem del pedido (packs de 5, 10, 16... fotos).
-- Las fotos se suben al volumen de uploads y acá se guarda la lista de URLs como JSON.
-- photoUrl queda para los pedidos viejos, que guardaban una sola foto como data URL.
-- Ejecutar contra la base de producción ANTES de desplegar el nuevo backend.

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "photoUrls" TEXT NOT NULL DEFAULT '[]';
