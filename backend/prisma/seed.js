"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Users
    const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
    const userPassword = await bcryptjs_1.default.hash('user123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@inprint.com' },
        update: {},
        create: {
            email: 'admin@inprint.com',
            password: adminPassword,
            name: 'Administrador',
            phone: '+54 9 221 000-0000',
            role: 'ADMIN',
        },
    });
    const user1 = await prisma.user.upsert({
        where: { email: 'cliente@ejemplo.com' },
        update: {},
        create: {
            email: 'cliente@ejemplo.com',
            password: userPassword,
            name: 'María González',
            phone: '+54 9 221 123-4567',
            role: 'CUSTOMER',
        },
    });
    const user2 = await prisma.user.upsert({
        where: { email: 'juan@ejemplo.com' },
        update: {},
        create: {
            email: 'juan@ejemplo.com',
            password: userPassword,
            name: 'Juan Pérez',
            phone: '+54 9 221 987-6543',
            role: 'CUSTOMER',
        },
    });
    // Categories
    const catFotos = await prisma.category.upsert({
        where: { slug: 'fotos-impresas' },
        update: {},
        create: {
            name: 'Fotos Impresas',
            slug: 'fotos-impresas',
            description: 'Impresiones fotográficas de alta calidad en distintos tamaños y papeles.',
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
            displayOrder: 1,
        },
    });
    const catFotolibros = await prisma.category.upsert({
        where: { slug: 'fotolibros' },
        update: {},
        create: {
            name: 'Fotolibros',
            slug: 'fotolibros',
            description: 'Fotolibros profesionales con tapa dura o blanda, ideales para momentos especiales.',
            image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80',
            displayOrder: 2,
        },
    });
    const catCuadros = await prisma.category.upsert({
        where: { slug: 'cuadros' },
        update: {},
        create: {
            name: 'Cuadros',
            slug: 'cuadros',
            description: 'Cuadros decorativos con tus fotos favoritas. Canvas, acrílico y más.',
            image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=80',
            displayOrder: 3,
        },
    });
    const catImanes = await prisma.category.upsert({
        where: { slug: 'imanes' },
        update: {},
        create: {
            name: 'Imanes',
            slug: 'imanes',
            description: 'Imanes personalizados con tus fotos. Perfectos para la heladera.',
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
            displayOrder: 4,
        },
    });
    const catStickers = await prisma.category.upsert({
        where: { slug: 'stickers' },
        update: {},
        create: {
            name: 'Stickers',
            slug: 'stickers',
            description: 'Stickers personalizados para decorar lo que quieras.',
            image: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=80',
            displayOrder: 5,
        },
    });
    const catKits = await prisma.category.upsert({
        where: { slug: 'kits-de-regalo' },
        update: {},
        create: {
            name: 'Kits de Regalo',
            slug: 'kits-de-regalo',
            description: 'Kits de regalo personalizados con una combinación de productos únicos.',
            image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600&q=80',
            displayOrder: 6,
        },
    });
    // Subcategories
    const subFotosEstandar = await prisma.subcategory.create({
        data: { name: 'Estándar', slug: 'estandar', categoryId: catFotos.id },
    }).catch(() => prisma.subcategory.findFirst({ where: { slug: 'estandar', categoryId: catFotos.id } }));
    const subFotosPanoramica = await prisma.subcategory.create({
        data: { name: 'Panorámica', slug: 'panoramica', categoryId: catFotos.id },
    }).catch(() => prisma.subcategory.findFirst({ where: { slug: 'panoramica', categoryId: catFotos.id } }));
    const subFotolibrosA4 = await prisma.subcategory.create({
        data: { name: 'Tamaño A4', slug: 'tamano-a4', categoryId: catFotolibros.id },
    }).catch(() => prisma.subcategory.findFirst({ where: { slug: 'tamano-a4', categoryId: catFotolibros.id } }));
    const subFotolibros20x20 = await prisma.subcategory.create({
        data: { name: '20x20 cm', slug: '20x20-cm', categoryId: catFotolibros.id },
    }).catch(() => prisma.subcategory.findFirst({ where: { slug: '20x20-cm', categoryId: catFotolibros.id } }));
    const subCuadrosCanvas = await prisma.subcategory.create({
        data: { name: 'Canvas', slug: 'canvas', categoryId: catCuadros.id },
    }).catch(() => prisma.subcategory.findFirst({ where: { slug: 'canvas', categoryId: catCuadros.id } }));
    const subCuadrosAcrilico = await prisma.subcategory.create({
        data: { name: 'Acrílico', slug: 'acrilico', categoryId: catCuadros.id },
    }).catch(() => prisma.subcategory.findFirst({ where: { slug: 'acrilico', categoryId: catCuadros.id } }));
    // Products - Fotos Impresas
    const prodFoto10x15 = await prisma.product.upsert({
        where: { slug: 'foto-impresa-10x15' },
        update: {},
        create: {
            name: 'Foto Impresa 10×15',
            slug: 'foto-impresa-10x15',
            description: 'La clásica foto de 10×15 cm en papel fotográfico profesional. Disponible en papel brillante, mate y satinado.',
            categoryId: catFotos.id,
            subcategoryId: subFotosEstandar.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
                'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
            ]),
            basePrice: 150,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodFoto10x15.id, label: 'x10 — Brillante', quantity: 10, paperType: 'Brillante', price: 150 },
            { productId: prodFoto10x15.id, label: 'x20 — Brillante', quantity: 20, paperType: 'Brillante', price: 280 },
            { productId: prodFoto10x15.id, label: 'x50 — Brillante', quantity: 50, paperType: 'Brillante', price: 650 },
            { productId: prodFoto10x15.id, label: 'x10 — Mate', quantity: 10, paperType: 'Mate', price: 160 },
            { productId: prodFoto10x15.id, label: 'x20 — Mate', quantity: 20, paperType: 'Mate', price: 300 },
            { productId: prodFoto10x15.id, label: 'x50 — Mate', quantity: 50, paperType: 'Mate', price: 700 },
        ],
    });
    const prodFoto13x18 = await prisma.product.upsert({
        where: { slug: 'foto-impresa-13x18' },
        update: {},
        create: {
            name: 'Foto Impresa 13×18',
            slug: 'foto-impresa-13x18',
            description: 'Foto 13×18 cm, el tamaño perfecto para enmarcar. Alta resolución y colores fieles.',
            categoryId: catFotos.id,
            subcategoryId: subFotosEstandar.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80',
            ]),
            basePrice: 200,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodFoto13x18.id, label: 'x10 — Brillante', quantity: 10, paperType: 'Brillante', price: 200 },
            { productId: prodFoto13x18.id, label: 'x20 — Brillante', quantity: 20, paperType: 'Brillante', price: 380 },
            { productId: prodFoto13x18.id, label: 'x10 — Mate', quantity: 10, paperType: 'Mate', price: 220 },
        ],
    });
    const prodFoto20x30 = await prisma.product.upsert({
        where: { slug: 'foto-impresa-20x30' },
        update: {},
        create: {
            name: 'Foto Impresa 20×30',
            slug: 'foto-impresa-20x30',
            description: 'Gran formato para tus mejores momentos. Ideal para enmarcar y decorar.',
            categoryId: catFotos.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
            ]),
            basePrice: 450,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodFoto20x30.id, label: 'x1 — Brillante', quantity: 1, paperType: 'Brillante', price: 450 },
            { productId: prodFoto20x30.id, label: 'x5 — Brillante', quantity: 5, paperType: 'Brillante', price: 2000 },
            { productId: prodFoto20x30.id, label: 'x1 — Mate', quantity: 1, paperType: 'Mate', price: 480 },
        ],
    });
    const prodFotoPano = await prisma.product.upsert({
        where: { slug: 'foto-panoramica-30x90' },
        update: {},
        create: {
            name: 'Foto Panorámica 30×90',
            slug: 'foto-panoramica-30x90',
            description: 'Fotos panorámicas de gran impacto. Perfectas para paisajes y grupos grandes.',
            categoryId: catFotos.id,
            subcategoryId: subFotosPanoramica.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
            ]),
            basePrice: 1200,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodFotoPano.id, label: 'x1 — Brillante', quantity: 1, paperType: 'Brillante', price: 1200 },
            { productId: prodFotoPano.id, label: 'x1 — Mate', quantity: 1, paperType: 'Mate', price: 1350 },
        ],
    });
    // Products - Fotolibros
    const prodFotolibro20 = await prisma.product.upsert({
        where: { slug: 'fotolibro-a4-tapa-dura-20-paginas' },
        update: {},
        create: {
            name: 'Fotolibro A4 Tapa Dura — 20 páginas',
            slug: 'fotolibro-a4-tapa-dura-20-paginas',
            description: 'Fotolibro profesional tamaño A4 con tapa dura. Papel couché 170g, impresión a doble página.',
            categoryId: catFotolibros.id,
            subcategoryId: subFotolibrosA4.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
            ]),
            basePrice: 4500,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodFotolibro20.id, label: '20 páginas', quantity: 20, price: 4500 },
            { productId: prodFotolibro20.id, label: '30 páginas', quantity: 30, price: 5800 },
            { productId: prodFotolibro20.id, label: '40 páginas', quantity: 40, price: 7000 },
        ],
    });
    const prodFotolibro2020 = await prisma.product.upsert({
        where: { slug: 'fotolibro-20x20-tapa-blanda' },
        update: {},
        create: {
            name: 'Fotolibro 20×20 Tapa Blanda',
            slug: 'fotolibro-20x20-tapa-blanda',
            description: 'Fotolibro cuadrado 20×20 cm con tapa blanda. El formato más popular para bodas y eventos.',
            categoryId: catFotolibros.id,
            subcategoryId: subFotolibros20x20.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
            ]),
            basePrice: 3200,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodFotolibro2020.id, label: '20 páginas', quantity: 20, price: 3200 },
            { productId: prodFotolibro2020.id, label: '30 páginas', quantity: 30, price: 4400 },
        ],
    });
    const prodFotolibro30x30 = await prisma.product.upsert({
        where: { slug: 'fotolibro-30x30-premium' },
        update: {},
        create: {
            name: 'Fotolibro 30×30 Premium',
            slug: 'fotolibro-30x30-premium',
            description: 'El más grande de nuestra línea. Papel fine art, colores vibrantes y duradera encuadernación.',
            categoryId: catFotolibros.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&q=80',
            ]),
            basePrice: 7500,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodFotolibro30x30.id, label: '20 páginas', quantity: 20, price: 7500 },
            { productId: prodFotolibro30x30.id, label: '30 páginas', quantity: 30, price: 9800 },
            { productId: prodFotolibro30x30.id, label: '40 páginas', quantity: 40, price: 12000 },
        ],
    });
    // Products - Cuadros
    const prodCuadroCanvas = await prisma.product.upsert({
        where: { slug: 'cuadro-canvas-30x40' },
        update: {},
        create: {
            name: 'Cuadro Canvas 30×40',
            slug: 'cuadro-canvas-30x40',
            description: 'Impresión sobre tela canvas con bastidor de madera. Efecto pintura, listo para colgar.',
            categoryId: catCuadros.id,
            subcategoryId: subCuadrosCanvas.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
            ]),
            basePrice: 3500,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodCuadroCanvas.id, label: '30×40 cm', size: '30x40', price: 3500 },
            { productId: prodCuadroCanvas.id, label: '40×60 cm', size: '40x60', price: 5500 },
            { productId: prodCuadroCanvas.id, label: '60×90 cm', size: '60x90', price: 9000 },
        ],
    });
    const prodCuadroAcrilico = await prisma.product.upsert({
        where: { slug: 'cuadro-acrilico-30x40' },
        update: {},
        create: {
            name: 'Cuadro Acrílico 30×40',
            slug: 'cuadro-acrilico-30x40',
            description: 'Impresión detrás de acrílico de 4mm. Colores vívidos con efecto de profundidad único.',
            categoryId: catCuadros.id,
            subcategoryId: subCuadrosAcrilico.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&q=80',
            ]),
            basePrice: 5000,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodCuadroAcrilico.id, label: '30×40 cm', size: '30x40', price: 5000 },
            { productId: prodCuadroAcrilico.id, label: '40×60 cm', size: '40x60', price: 8000 },
        ],
    });
    const prodCuadroPolaroid = await prisma.product.upsert({
        where: { slug: 'set-fotos-polaroid-style' },
        update: {},
        create: {
            name: 'Set Fotos Estilo Polaroid',
            slug: 'set-fotos-polaroid-style',
            description: 'Pequeñas fotos con borde blanco estilo Polaroid. Perfectas para decorar paredes.',
            categoryId: catCuadros.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
            ]),
            basePrice: 800,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodCuadroPolaroid.id, label: 'x10 fotos', quantity: 10, price: 800 },
            { productId: prodCuadroPolaroid.id, label: 'x20 fotos', quantity: 20, price: 1500 },
            { productId: prodCuadroPolaroid.id, label: 'x30 fotos', quantity: 30, price: 2100 },
        ],
    });
    // Products - Imanes
    const prodIman5x5 = await prisma.product.upsert({
        where: { slug: 'iman-cuadrado-5x5' },
        update: {},
        create: {
            name: 'Imán Cuadrado 5×5',
            slug: 'iman-cuadrado-5x5',
            description: 'Imanes personalizados 5×5 cm. Resistentes, de alta calidad, con acabado brillante.',
            categoryId: catImanes.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
            ]),
            basePrice: 350,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodIman5x5.id, label: 'x5 imanes', quantity: 5, price: 350 },
            { productId: prodIman5x5.id, label: 'x10 imanes', quantity: 10, price: 650 },
            { productId: prodIman5x5.id, label: 'x20 imanes', quantity: 20, price: 1200 },
        ],
    });
    const prodImanRectangular = await prisma.product.upsert({
        where: { slug: 'iman-rectangular-7x5' },
        update: {},
        create: {
            name: 'Imán Rectangular 7×5',
            slug: 'iman-rectangular-7x5',
            description: 'Imanes rectangulares 7×5 cm. El tamaño ideal para fotos de carnet o retratos.',
            categoryId: catImanes.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
            ]),
            basePrice: 400,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodImanRectangular.id, label: 'x5 imanes', quantity: 5, price: 400 },
            { productId: prodImanRectangular.id, label: 'x10 imanes', quantity: 10, price: 750 },
            { productId: prodImanRectangular.id, label: 'x20 imanes', quantity: 20, price: 1400 },
        ],
    });
    const prodImanCircular = await prisma.product.upsert({
        where: { slug: 'iman-circular-5cm' },
        update: {},
        create: {
            name: 'Imán Circular 5 cm',
            slug: 'iman-circular-5cm',
            description: 'Imanes circulares de 5 cm de diámetro. Originales y llamativos.',
            categoryId: catImanes.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
            ]),
            basePrice: 380,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodImanCircular.id, label: 'x5 imanes', quantity: 5, price: 380 },
            { productId: prodImanCircular.id, label: 'x10 imanes', quantity: 10, price: 700 },
        ],
    });
    // Products - Stickers
    const prodStickerHoja = await prisma.product.upsert({
        where: { slug: 'stickers-hoja-a4' },
        update: {},
        create: {
            name: 'Hoja de Stickers A4',
            slug: 'stickers-hoja-a4',
            description: 'Hoja A4 completa con tus diseños personalizados. Papel adhesivo de alta calidad.',
            categoryId: catStickers.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&q=80',
            ]),
            basePrice: 800,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodStickerHoja.id, label: 'x1 hoja', quantity: 1, price: 800 },
            { productId: prodStickerHoja.id, label: 'x5 hojas', quantity: 5, price: 3500 },
            { productId: prodStickerHoja.id, label: 'x10 hojas', quantity: 10, price: 6500 },
        ],
    });
    const prodStickerTroquelado = await prisma.product.upsert({
        where: { slug: 'sticker-troquelado-personalizado' },
        update: {},
        create: {
            name: 'Sticker Troquelado Personalizado',
            slug: 'sticker-troquelado-personalizado',
            description: 'Stickers troquelados con la forma de tu diseño. Resistentes al agua y rayos UV.',
            categoryId: catStickers.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&q=80',
            ]),
            basePrice: 600,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodStickerTroquelado.id, label: 'x10 stickers', quantity: 10, price: 600 },
            { productId: prodStickerTroquelado.id, label: 'x25 stickers', quantity: 25, price: 1400 },
            { productId: prodStickerTroquelado.id, label: 'x50 stickers', quantity: 50, price: 2500 },
        ],
    });
    const prodStickerCircular = await prisma.product.upsert({
        where: { slug: 'sticker-circular-5cm' },
        update: {},
        create: {
            name: 'Sticker Circular 5 cm',
            slug: 'sticker-circular-5cm',
            description: 'Stickers circulares de 5 cm. Ideales para sellar sobres, decorar regalos y más.',
            categoryId: catStickers.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&q=80',
            ]),
            basePrice: 500,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodStickerCircular.id, label: 'x20 stickers', quantity: 20, price: 500 },
            { productId: prodStickerCircular.id, label: 'x50 stickers', quantity: 50, price: 1100 },
        ],
    });
    // Products - Kits de Regalo
    const prodKitBasico = await prisma.product.upsert({
        where: { slug: 'kit-regalo-basico' },
        update: {},
        create: {
            name: 'Kit Regalo Básico',
            slug: 'kit-regalo-basico',
            description: 'Kit incluye: 10 fotos 10×15, 5 imanes y 1 hoja de stickers. Todo personalizado.',
            categoryId: catKits.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=800&q=80',
            ]),
            basePrice: 2800,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodKitBasico.id, label: 'Kit Básico', price: 2800 },
        ],
    });
    const prodKitPremium = await prisma.product.upsert({
        where: { slug: 'kit-regalo-premium' },
        update: {},
        create: {
            name: 'Kit Regalo Premium',
            slug: 'kit-regalo-premium',
            description: 'Kit incluye: fotolibro 20×20, 10 imanes, hoja de stickers y 5 fotos grandes 20×30.',
            categoryId: catKits.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80',
            ]),
            basePrice: 6500,
            featured: true,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodKitPremium.id, label: 'Kit Premium', price: 6500 },
        ],
    });
    const prodKitBoda = await prisma.product.upsert({
        where: { slug: 'kit-recuerdo-boda' },
        update: {},
        create: {
            name: 'Kit Recuerdo de Boda',
            slug: 'kit-recuerdo-boda',
            description: 'El regalo perfecto para los novios. Incluye fotolibro A4, cuadro canvas 30×40 y 20 imanes.',
            categoryId: catKits.id,
            images: JSON.stringify([
                'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
            ]),
            basePrice: 12000,
        },
    });
    await prisma.productVariant.createMany({
        data: [
            { productId: prodKitBoda.id, label: 'Kit Boda Estándar', price: 12000 },
            { productId: prodKitBoda.id, label: 'Kit Boda Premium (+40 pág)', price: 15000 },
        ],
    });
    // Banners
    await prisma.banner.createMany({
        data: [
            {
                title: 'Tus momentos, para siempre.',
                subtitle: 'Impresión fotográfica profesional con envío a todo el país.',
                image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80',
                link: '/catalogo',
                active: true,
                displayOrder: 1,
            },
            {
                title: 'Kits de regalo únicos',
                subtitle: 'Sorprendé a quien más querés con productos 100% personalizados.',
                image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=1600&q=80',
                link: '/catalogo/kits-de-regalo',
                active: true,
                displayOrder: 2,
            },
            {
                title: 'Fotolibros desde $3.200',
                subtitle: 'Contá tu historia en páginas que duran toda la vida.',
                image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1600&q=80',
                link: '/catalogo/fotolibros',
                active: true,
                displayOrder: 3,
            },
        ],
    });
    // Promotions
    await prisma.promotion.createMany({
        data: [
            { name: 'Descuento bienvenida', code: 'BIENVENIDO10', discount: 10, type: 'percentage', active: true },
            { name: '20% OFF en fotolibros', code: 'LIBRO20', discount: 20, type: 'percentage', active: true },
            { name: 'Envío gratis', code: 'ENVIOGRATIS', discount: 500, type: 'fixed', active: false },
        ],
    });
    // Sample Orders
    const variants = await prisma.productVariant.findMany({ take: 6 });
    await prisma.order.create({
        data: {
            orderNumber: 'IP-001-2024',
            userId: user1.id,
            customerName: 'María González',
            customerEmail: 'cliente@ejemplo.com',
            customerPhone: '+54 9 221 123-4567',
            status: 'DELIVERED',
            subtotal: 4500,
            shippingCost: 0,
            total: 4500,
            shippingMethod: 'pickup',
            paymentMethod: 'transfer',
            notes: 'Retiro en sucursal',
            items: {
                create: [
                    {
                        productId: prodFotolibro20.id,
                        variantId: variants[0]?.id,
                        quantity: 1,
                        price: 4500,
                    },
                ],
            },
        },
    });
    await prisma.order.create({
        data: {
            orderNumber: 'IP-002-2024',
            userId: user2.id,
            customerName: 'Juan Pérez',
            customerEmail: 'juan@ejemplo.com',
            customerPhone: '+54 9 221 987-6543',
            status: 'IN_PRODUCTION',
            subtotal: 2150,
            shippingCost: 800,
            total: 2950,
            shippingMethod: 'shipping',
            paymentMethod: 'mercadopago',
            shippingAddress: 'Av. Siempreviva 742, La Plata, Buenos Aires',
            items: {
                create: [
                    {
                        productId: prodFoto10x15.id,
                        variantId: variants[1]?.id,
                        quantity: 2,
                        price: 280,
                    },
                    {
                        productId: prodCuadroCanvas.id,
                        variantId: variants[2]?.id,
                        quantity: 1,
                        price: 3500,
                    },
                ],
            },
        },
    });
    await prisma.order.create({
        data: {
            orderNumber: 'IP-003-2024',
            customerName: 'Laura Rodríguez',
            customerEmail: 'laura@ejemplo.com',
            status: 'RECEIVED',
            subtotal: 6500,
            shippingCost: 800,
            total: 7300,
            shippingMethod: 'shipping',
            paymentMethod: 'transfer',
            shippingAddress: 'Belgrano 1234, Buenos Aires',
            items: {
                create: [
                    {
                        productId: prodKitPremium.id,
                        variantId: variants[3]?.id,
                        quantity: 1,
                        price: 6500,
                    },
                ],
            },
        },
    });
    await prisma.order.create({
        data: {
            orderNumber: 'IP-004-2024',
            userId: user1.id,
            customerName: 'María González',
            customerEmail: 'cliente@ejemplo.com',
            status: 'READY',
            subtotal: 1400,
            shippingCost: 0,
            total: 1400,
            shippingMethod: 'pickup',
            paymentMethod: 'mercadopago',
            items: {
                create: [
                    {
                        productId: prodStickerTroquelado.id,
                        variantId: variants[4]?.id,
                        quantity: 2,
                        price: 600,
                    },
                    {
                        productId: prodIman5x5.id,
                        variantId: variants[5]?.id,
                        quantity: 1,
                        price: 350,
                    },
                ],
            },
        },
    });
    console.log('✅ Seed completado.');
    console.log('   Admin: admin@inprint.com / admin123');
    console.log('   Cliente: cliente@ejemplo.com / user123');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
