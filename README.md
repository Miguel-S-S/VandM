# V&M Artículos Deportivos — Etapa 1

PWA de catálogo y carrito (React + Vite + Supabase), lista para desplegar en Vercel y empaquetar como APK.

## Qué incluye la etapa 1
- Tienda con categorías (Tobilleras, Sandbags, Corebags, Gusanos); cada producto tiene variantes de peso (1 kg … 8 kg) con precio y stock propios.
- Detalle de producto, carrito y envío del pedido por WhatsApp.
- Secciones Actividades (enlaza a la categoría del producto recomendado) y Noticias (contenido de ejemplo).
- Panel (administrador y dueña): ABM de productos con fotos, generador de pesos 1–8 kg, apariencia configurable (colores, fuentes, redes, WhatsApp, tiempo de entrega) y auditoría de precio/stock.
- 3 perfiles: administrador, dueña y cliente (visitante sin cuenta puede comprar/ver).
- PWA instalable. Sin Supabase configurado corre en MODO DEMO (selector "Ver como" para probar los perfiles).

## Puesta en marcha
1. `npm install`
2. Supabase: crear proyecto → SQL Editor → pegar y ejecutar `supabase/schema.sql`.
3. Copiar `.env.example` a `.env.local` y completar URL y anon key.
4. `npm run dev`
5. Registrate en la app y luego, en el SQL Editor:
   `update public.profiles set role = 'admin' where email = 'tu@mail.com';`
   (para la dueña: `role = 'duena'`).
6. Vercel: importar el repo, agregar las 2 variables `VITE_SUPABASE_*`, deploy.

## APK de Android
Una vez desplegada en Vercel con HTTPS: entrar a https://www.pwabuilder.com, pegar la URL y elegir
"Android" → descarga un paquete (TWA) con APK/AAB firmable. Alternativa: Bubblewrap CLI.
Para que no aparezca la barra del navegador hay que publicar `/.well-known/assetlinks.json`
con la huella SHA-256 de la firma (PWABuilder indica cómo).

## Próximas etapas sugeridas
2. Pedidos con estados + calendario de producción + aviso automático por WhatsApp (Cloud API / Edge Function).
3. Materia prima (arena, tela, hilo, cierres), costos y recetas por producto.
4. Contabilidad: ingresos, gastos, ganancia.
5. Tablero: más vendidos, clientes, promociones, rankings.
6. ABM de noticias y actividades.
