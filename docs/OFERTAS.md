# Tienda: apertura y ofertas automáticas

## Apertura de la tienda
- `catalog/store-schedule.json` → `opensAt` (hoy `2026-11-18T00:00:00-03:00`). La variable de entorno `STORE_OPENS_AT` tiene prioridad.
- Antes de esa fecha: `/api/store` marca todo `purchaseAvailable=false` (con `storeClosed=true`), `/api/store/tebex/checkout` responde 403 `{code:'store_closed'}` y `store.html`/`store-en.html` muestran banner con cuenta atrás. Se evalúa en cada petición: abre sola, sin redeploy. Sin fecha o con fecha pasada = abierta.

## Calendario (`catalog/offers.json`)
Se genera con `node tools/gen_offers.mjs` (reglas, no fechas a mano; descarta lo que termina antes de la apertura). Para añadir una oferta: edita las reglas del script (o el JSON) y vuelve a generar. `npm run check` valida (ids únicos, start<end, nombres es/en, sin solape de ofertas de carrito, regalos 100 % con límite por cliente).

Campos: `id`, `kind` (`discount`|`gift`), `name`/`description`/`banner` {es,en}, `discount` {type `percentage`|`value`, value}, `start`/`end` (ISO con offset de America/Santiago), `scope` {type `cart`|`category`|`package`, ids (ids web), excludeIds}, `minimum`, `limits` {total, perCustomer}, `active`, `priority`.

Regla: una sola oferta de carrito a la vez (mayor `priority`, luego mayor descuento); los regalos son aparte. Nunca ofrecer productos de staff ni `/ultragod` (usa `excludeIds`).

Calendario: Black Friday = primera semana completa lun-dom de noviembre (25 %; en 2026 cae antes de la apertura y se omite), cumpleaños del owner 29-nov (15 % + regalo), Navidad 19-26 dic, Año Nuevo 28 dic-2 ene, regreso a clases 1-7 mar, vacaciones de invierno (1.er lunes de julio, 7 días), Fiestas Patrias 17-19 sep. 15 % salvo BF.

## Regalo de cumpleaños
`cumple-<año>-regalo`: Pack +5 Homes (`homes-pack-5`) 100 % el 29-nov, 1 por jugador (ledger `offer-claims.jsonl` en `DATA_DIR`, por nick; Tebex no admite límite por usuario por API) y 100 en total (`expire_limit` en Tebex). El jugador agrega el pack al carrito con su nick y el regalo se aplica solo.

## Planificador (server.js + lib/offers-sync.js)
Cada `OFFERS_SYNC_MS` (10 min) con `TEBEX_PLUGIN_SECRET`: lista `GET /coupons`; para cada oferta viva crea `DRK-<ID>` (idempotente, nota `auto-oferta <id>`, paquetes explícitos); borra los `DRK-*` auto-generados que ya no corresponden a una oferta viva; no toca cupones ajenos. Si Tebex falla, la oferta queda `applied:false`: no se muestra con precio ni se aplica, y se registra en el log. `OFFERS_SYNC_DISABLED=1` lo apaga.

## Checkout y precios
`/api/store` añade `offerUsd`/`offerId` por producto y `offers`; el checkout aplica los cupones (`POST /api/accounts/{pub}/baskets/{ident}/coupons`) y devuelve el total real de Tebex; si difiere del mostrado queda un warning. Si un cupón no se puede aplicar se aborta el checkout (no cobrar de más). `/offers.json` es público y sin códigos ni secretos.

## Secreto
`TEBEX_PLUGIN_SECRET` (secret-key del plugin) vive en `/opt/stacks/drakescraft-web/.env` (600). No se commitea ni se imprime.

## Pruebas
`npm run check` (unitarias del calendario/planificador), `node scripts/smoke-tests.js` (tienda cerrada/abierta con `STORE_OPENS_AT` inyectado), `docker exec drakescraft-web node scripts/offers-live-test.mjs` (cupón TEST-* real, 15 % sobre un basket sin pagar, y lo borra).
