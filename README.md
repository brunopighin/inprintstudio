# In Print — E-commerce de Impresión Fotográfica

Sistema completo de e-commerce para productos de impresión fotográfica y personalizados.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS (puerto 5175)
- **Backend**: Node.js + Express + Prisma ORM + SQLite (puerto 3004)
- **Auth**: JWT con bcrypt
- **Charts**: Recharts (dashboard admin)
- **Icons**: Lucide React

---

## Estructura del proyecto

```
inprint/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Modelos de base de datos
│   │   └── seed.ts          # Datos de prueba
│   └── src/
│       ├── index.ts         # Servidor Express
│       ├── middleware/auth.ts
│       ├── routes/          # Rutas públicas
│       └── routes/admin/    # Rutas del panel admin
└── frontend/
    └── src/
        ├── pages/           # Páginas públicas
        ├── pages/admin/     # Panel de administración
        ├── components/      # Componentes reutilizables
        ├── context/         # CartContext + AuthContext
        ├── services/api.ts  # Cliente Axios
        └── types/index.ts   # TypeScript types
```

---

## Cómo levantar el proyecto

### 1. Instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Inicializar la base de datos

```bash
cd backend
npm run db:generate    # genera el cliente Prisma
npm run db:migrate     # crea las tablas (dev.db)
npm run db:seed        # carga datos de prueba
```

### 3. Levantar los servidores

```bash
# Terminal 1 — Backend (puerto 3004)
cd backend
npm run dev

# Terminal 2 — Frontend (puerto 5175)
cd frontend
npm run dev
```

Abrí el navegador en: **http://localhost:5175**

---

## Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| **Administrador** | admin@inprint.com | admin123 |
| **Cliente** | cliente@ejemplo.com | user123 |
| **Cliente** | juan@ejemplo.com | user123 |

**Panel Admin**: http://localhost:5175/admin/login

---

## Funcionalidades

### Sitio público
- **Home**: Slider de banners, categorías visuales, productos destacados, "cómo funciona"
- **Catálogo**: Listado con filtros por categoría/subcategoría y búsqueda
- **Detalle de producto**: Galería, selector de variantes, carga de foto con preview, carrito
- **Carrito offcanvas**: Panel lateral con cantidades editables y subtotal
- **Checkout**: Flujo en 3 pasos (contacto → envío → pago), confirmación de pedido
- **Mi cuenta**: Login/registro, historial de pedidos propios
- **Contacto**: Formulario y datos de contacto

### Panel Admin (/admin)
- **Dashboard**: KPIs, gráfico de ingresos 7 días, pedidos recientes
- **Pedidos**: Listado con filtros, cambio de estado con un clic, detalle expandible
- **Productos**: CRUD completo con variantes, imágenes, categoría, destacados
- **Categorías**: CRUD de categorías y subcategorías
- **Clientes**: Listado con historial de pedidos por usuario
- **Promociones**: Códigos de descuento (%, monto fijo), activar/desactivar
- **Banners**: Gestión del slider del home, activar/desactivar

---

## Datos de prueba incluidos

**Categorías**: Fotos impresas, Fotolibros, Cuadros, Imanes, Stickers, Kits de regalo

**Productos**: 18 productos con variantes (tamaños, papeles, cantidades)

**Pedidos de ejemplo**:
- IP-001-2024: Entregado (retiro en local, transferencia)
- IP-002-2024: En producción (envío a domicilio, MercadoPago)
- IP-003-2024: Recibido (envío, transferencia)
- IP-004-2024: Listo para retirar

---

## Migrar a PostgreSQL

1. Cambiar el `provider` en `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Actualizar `DATABASE_URL` en `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/inprint"
   ```

3. Correr las migraciones:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

---

## Variables de entorno

### Backend (`.env`)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="tu_secreto_seguro_aqui"
PORT=3004
NODE_ENV=development
```
