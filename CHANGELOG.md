# Registro de cambios — In Print

Qué se cambió en la tienda, cuándo y por qué. Lo más nuevo va arriba.

Cada entrada indica dónde está el cambio:

- **Código**: se publica con un push a `main` (el backend lo despliega Railway y el frontend, Vercel). Entre corchetes va el commit.
- **Base de datos**: cambio hecho directamente en la base de producción. **No queda en git**, por eso se anota acá.
- **Migración**: cambio en la estructura de la base. El archivo `.sql` está en `backend/prisma/` y se corre en producción **antes** de publicar el backend que lo usa.

---

## 2026-10-04

### Botón flotante de WhatsApp
- **Código** [`48cb9fb`, `3925e1a`, `2ba10d7`]: hay un botón verde abajo a la derecha en todas las páginas de la tienda (no en el admin). Usa el mismo número del pie de página (`frontend/src/config.ts`).
- El mensaje ya viene escrito: *"Hola, mi nombre es [nombre], quiero hacer una consulta"*. Desde la página de un producto agrega *"sobre este producto: (link)"*.
- Cuando se abre el carrito, el buscador o la ventana de recorte, el botón queda detrás.

### Favicon nuevo
- **Código** [`351380b`]: el ícono de la pestaña es un "IN" negro sobre fondo blanco. Antes la página apuntaba a un `icon.svg` que no existía, así que se veía el ícono genérico del navegador.
- Se agregaron versiones para iPhone (`apple-touch-icon.png`), Android (`icon-192/512.png` + `site.webmanifest`) y navegadores viejos (`favicon.ico`).
- El "IN" es relleno, no en contorno como el logo, para que se lea a 16 px.

### Recorte según la medida, vertical u horizontal (Clásicas y Pósters)
- **Código** [`7b428d0`]: formato nuevo, "Según la medida de cada opción". La proporción del recorte sale del campo *Tamaño* de la opción elegida (10x15, 13x18, 21x29,7…). En la ventana de recorte el cliente elige **Vertical** u **Horizontal**.
  - Al subir una foto, se detecta sola si es vertical o apaisada.
  - Si el cliente cambia de medida con las fotos ya cargadas, se vuelven a recortar.
- **Base de datos**: Clásicas y Pósters → formato `print`.
- De paso se arregló el nombre de archivo de los recortes automáticos: llegaban como `foto.jpg-recorte.jpg`.

### Fotos según la cantidad de copias
- **Código** [`416a8fb`]: con "Cantidad de pedidos" mayor a 1, el cliente puede subir las mismas fotos para todas las copias **o** fotos distintas para cada una. Por ejemplo:
  - Clásicas ×2: 1 foto o 2.
  - Polaroid de 5 ×2: 5 fotos o 10.
  - Otras cantidades no se aceptan, para que no quede en duda qué foto repetir.
- La cantidad pasó arriba de la carga de fotos.
- En el carrito no se puede cambiar la cantidad de una línea con fotos distintas por copia.
- El admin de pedidos aclara cómo imprimir: *"imprimir una de cada foto"* o *"imprimir cada foto ×N"*.
- Límite de fotos por línea del pedido: de 200 a 1000.

### Formato de recorte por producto y marco Polaroid/Instax
- **Código** [`ab3a3bf`]: cada producto tiene el campo **"Formato de la foto del cliente"** en el admin. Las opciones son Libre, Polaroid, Instax mini, Cuadrada, Vertical 2:3, Horizontal 3:2 y Según la medida.
  - Con un formato fijo, el recorte queda bloqueado en esa proporción.
  - En los packs, cada foto se recorta sola al centro y se puede ajustar.
  - Polaroid e Instax muestran la foto con el **marco blanco real** (Polaroid 88×107 mm con foto de 79×79; Instax mini 54×86 mm con foto de 46×62). El marco es **solo una vista previa**: no se agrega al archivo que se sube.
- Se arregló un error: "Usar esta foto" sin mover el recuadro no hacía nada.
- **Migración**: `migration_product_photo_format.sql` (columna `Product.photoFormat`).
- **Base de datos**: Polaroid → `polaroid`; Instax, Instax Fotografías Souvenir Cumpleaños x25u y Llavero instax → `instax`.

### Arreglos del catálogo
- **Código** [`5a49919`]: el botón "2" de la paginación no funcionaba. Guardaba la página y en la línea siguiente la borraba. Ahora cambia de página y vuelve arriba.
- **Código** [`803aebf`]: el buscador distinguía mayúsculas: "taza" no encontraba "Tazas", y parecía que no funcionaba. Ahora:
  - ignora mayúsculas y acentos;
  - entiende plurales simples ("fotos" encuentra "Fotografías");
  - busca también en la descripción, la categoría y las opciones;
  - muestra primero lo que coincide en el nombre.

### Varias fotos por pedido (packs de 5, 10, 16…)
- **Código** [`e88762c`]: la página del producto pide tantas fotos como indique la opción elegida, con contador, recorte opcional por foto, reintento y quitar.
  - Las fotos se suben al servidor apenas se eligen (`POST /api/uploads/photo`, carpeta `uploads/clientes/` del volumen de Railway). El pedido solo guarda los links. Antes la única foto viajaba dentro del pedido como texto, y con muchas fotos no entraba.
  - En el carrito, dos packs del mismo producto con fotos distintas van en líneas separadas.
  - En el admin de pedidos se ven las miniaturas y hay un botón para descargar todas las fotos, con nombres ordenados (`IP-2610-1234-polaroid-01.jpg`).
- En el admin, el campo "Cantidad" de cada opción pasó a llamarse **"Fotos que sube el cliente"** (vacío = 1).
- **Migración**: `migration_order_item_photos.sql` (columna `OrderItem.photoUrls`).
- **Base de datos**: cantidad de fotos de Polaroid (5/10/16) e Instax (5/10/20/40/100). Antes estaban mal cargadas, por ejemplo "10 Fotografías" tenía 8.

### Descripciones con párrafos
- **Código** [`cfbd516`]: la página del producto respeta los párrafos (línea en blanco), las listas (líneas que empiezan con • o -) y los títulos (línea corta que termina en ":"). Antes se mostraba todo junto. Aplica a todos los productos, también a los nuevos.
- El cuadro de descripción del admin es más alto y explica cómo dar formato.

---

## 2026-09-29

- **Código** [`8b2227a`]: precio por opción claro en el admin.
  - Cada campo de la opción tiene título.
  - Con opciones, se oculta el "precio base" y la lista muestra el rango de precios.
  - Borrar el precio de una opción ya no la elimina sin avisar.
  - Los errores al guardar se muestran en el formulario.
  - Las opciones con precio $0 se pueden guardar.
- **Código** [`17101bd`, `ef6a6b0`]: en el admin se pueden subir varias imágenes de producto a la vez y reordenarlas arrastrando o con flechas. La primera es la portada del catálogo.
- **Código** [`dfdbf9d`]: las opciones con el mismo precio se muestran en el orden en que se cargaron.
- **Base de datos**: Clásicas recibió tres opciones (10x15, 13x18 y 15x21 cm), con precio $0 hasta que la dueña lo defina.

## 2026-09-28

- **Código** [`45fa822`]: las fotos de cada producto se pasan deslizando, en la tarjeta del catálogo y en la página del producto.
- **Base de datos**: se unificaron los productos duplicados. El import del catálogo había creado **un producto por foto** ("Cuaderno de notas 1", "2", "3"…). Se juntaron en uno solo con todas sus fotos y se pasó de 45 a 19 productos. Ninguno de los duplicados borrados tenía pedidos, precio, peso ni opciones. Hay un respaldo de los 45 originales fuera del repo.

## 2026-09-27

- **Código** [`f4f2619`]: envío a domicilio y a sucursal (Correo Argentino Clásico); se cobra el que elige el cliente.
- **Código** [`ca2e333`]: el admin exige peso y medidas del paquete para guardar un producto. Sin esos datos el envío se cotiza con un paquete estimado.
- **Código** [`d80e667`]: arreglos del checkout: opciones de envío visibles, código postal, WhatsApp y teléfono.
- **Código** [`87f8965`, `3d90691`]: se pueden eliminar pedidos y clientes desde el admin.

## 2026-09-11 a 2026-09-20

- Cotización real de envíos con Correo Argentino (MiCorreo), con generación del envío y elección de sucursal. OCA y Andreani quedaron programados pero desactivados.
- Peso y medidas por producto para cotizar envíos.
- Medios de pago configurables: MercadoPago (con recargo) y transferencia (con descuento). Se corrigió que MercadoPago usaba la URL de pruebas.
- El cliente puede subir y recortar su foto. El admin la ve y la descarga.
- Pantalla de configuración del admin: credenciales de envío, prueba de conexión con MiCorreo y cambio de contraseña.
- El admin puede poner cualquier estado a un pedido.
- Datos de contacto reales: Instagram y WhatsApp. Se sacaron Facebook y la dirección y horarios de ejemplo.

## 2026-07-18 a 2026-08-16

- Primera versión de la tienda y puesta en producción: backend en Railway y frontend en Vercel.
- Costo de envío por código postal, seguimiento de envíos e integración con MercadoPago Checkout Pro.
- Pantalla de carga, arreglos de scroll al abrir páginas y validación del email en el checkout.
- Script de importación del catálogo con fotos.
- Admin: desactivar categorías en vez de borrarlas, activar productos en lote y subcategorías anidadas en el catálogo.
