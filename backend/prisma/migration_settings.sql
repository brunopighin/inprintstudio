-- Migración manual: tabla genérica de configuración (clave/valor) para poder
-- editar credenciales de envío desde el admin en vez de variables de entorno.
-- Ejecutar contra la base de producción/staging, o correr `npx prisma db push`.

CREATE TABLE IF NOT EXISTS "Setting" (
  "key"   TEXT PRIMARY KEY,
  "value" TEXT NOT NULL
);
