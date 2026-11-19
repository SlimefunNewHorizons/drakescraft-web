# Listados de votos y errores HTTP (#912)

`votar.html` y `vote-en.html` rechazan respuestas HTTP fallidas antes de leer
el JSON. Conservan el estado de indisponibilidad existente y no ofrecen enlaces
del cuerpo de error. Una respuesta HTTP200 mantiene los botones, el nick local
y los contadores; no se cambian premios, destinos ni tiempos de espera.

La prueba Chromium utiliza HTML, CSS y renderer reales con un catálogo ficticio.
Recorre ES/EN a375/393/412px: HTTP404/429/500/503 con JSON válido, JSON inválido,
fallo de red y HTTP503 con HTML. También comprueba nick persistente, expiración
y decremento del contador, enlaces deshabilitados y nombres tratados como texto.
Solo permite GET locales; no abre votos ni comprueba Votifier o premios reales.

```sh
PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs node --test tests/votes-mobile.browser.test.mjs
```

CI ejecuta la regresión junto con la prueba de títulos de eventos, usando
Playwright1.58.2/Chromium en Ubuntu24.04 fuera de las dependencias de producción.
Resultado local de esta integración:24/24pruebas entre ambos archivos, sin
fallos ni omisiones. `npm run check`:24/24 y50productos válidos. Conservados los dos listeners y tres funciones por página,
identificadores y CRLF. Tienda, checkout y dependencias sin cambios.

La integración se prepara sobre main sin incorporar el resto de PR20/PR12.
No implica despliegue: el árbol productivo sigue bloqueado por #922.
Reversión de fuente mediante revert del commit de integración.
