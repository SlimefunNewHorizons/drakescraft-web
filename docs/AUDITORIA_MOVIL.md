# Auditoría móvil reproducible

`scripts/audit-mobile.mjs` inspecciona la web publicada o un servidor HTTP local con Chromium a 375, 393 y 412 × 844 píxeles. Playwright se instala fuera de la imagen de producción:

```sh
npm install --prefix /tmp/drakes-mobile playwright@1.58.2 --no-audit --no-fund
/tmp/drakes-mobile/node_modules/.bin/playwright install chromium
PLAYWRIGHT_MODULE=/tmp/drakes-mobile/node_modules/playwright/index.mjs \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node scripts/audit-mobile.mjs https://web.drakescraft.cl /tmp/drakes-mobile-results
```

En un host sin las bibliotecas de Chromium, instalar primero sus dependencias de sistema mediante el administrador del host. No instalar este navegador dentro del contenedor web.

El recorrido abre 30 páginas por ancho, incluidas novedades y el alias de grafos, y bloquea métodos HTTP distintos de GET/HEAD. No hace clic, envía formularios ni interactúa con pagos. La tienda se inspecciona como documento público; no se modifica su código.

Para separar mediciones de DOM y capturas, usar `AUDIT_SCREENSHOTS=0`. Para repetir casos concretos, `AUDIT_PAGES=store,index-en AUDIT_WIDTHS=393,412`. Solo se aceptan las páginas del recorrido y los tres anchos previstos. Una ejecución sin capturas no acredita revisión visual.

Cada resultado incluye estado HTTP, ancho real del documento, hasta 25 selectores fuera del viewport, número total y una muestra de textos menores de 12 px, errores JavaScript/CSP y dimensiones de canvas. También cuenta tarjetas de novedades, contenedores de grafos y la presencia del hero solar, idioma declarado y aviso de idioma. Cada página usa un contexto nuevo, sin cookies ni almacenamiento heredados de la anterior; se cierra al terminar, incluso si falla la medición. Los errores guardados se copian para conservar la evidencia anterior. Las capturas muestran el viewport; las medidas abarcan todo el documento. Salida `1` indica desborde horizontal, errores de carga/JavaScript/CSP o fallo de captura. Los textos pequeños son candidatos a revisión visual y no provocan por sí solos ese código.

La navegación espera `DOMContentLoaded`, después fuentes cargadas (máximo 10 s) y 800 ms de estabilización. Una imagen pendiente ya no bloquea las medidas esperando `load`. `readyState` deja constancia del estado medido; no acredita que todas las imágenes, peticiones o escenas asíncronas hayan terminado. La regresión con dos páginas, una imagen que nunca responde y almacenamiento local verifica ambos límites sin red externa:

```sh
PLAYWRIGHT_MODULE=/tmp/drakes-mobile/node_modules/playwright/index.mjs \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node --test tests/mobile-audit.browser.test.mjs
```

`report.json` y los PNG quedan en el directorio indicado, fuera de Git. El informe no copia textos de la página, respuestas API ni parámetros de URL. Solo se usa contenido público y no se inicia sesión.

`report.json` se guarda antes de cada captura y al terminar cada página: conserva medidas aunque la captura se bloquee. `complete=false` distingue los informes parciales; los filtros delimitan qué recorrido puede considerarse completo. `phase`, `failurePhase` y `timings` indican la fase actual, la fase fallida y tiempos acumulados en milisegundos desde la navegación. `captureLog` conserva únicamente marcadores conocidos de Playwright, sin URLs ni mensajes de la página. El recorrido se detiene tras dos excepciones.

La captura tiene un presupuesto de 45 s. En el ensayo instrumentado de `guia-slimefun-en` a 375 px, las fuentes ya estaban listas y Playwright volvió a comprobarlas en menos de 0,1 s; la operación de captura consumió 12,7 s, cerca del presupuesto anterior de 15 s. Esto localiza la demora después de las fuentes, sin demostrar qué parte interna del render la causa. Para obtener los marcadores de diagnóstico, ejecutar un caso con `DEBUG=pw:api` y guardar su salida fuera de Git; revisar y sanear antes de compartirla.

Límites: emulación de Chromium con movimiento reducido y WebGL por software; no acredita Safari, Firefox, un teléfono físico, contraste, objetivos táctiles ni la interacción completa de los grafos. La existencia de un canvas no demuestra que su escena se haya dibujado. Repetir los casos relevantes con movimiento normal y revisar capturas antes de cerrar un hallazgo.

Las capturas de viewport y de documento completo son modalidades distintas de la [API de Playwright](https://playwright.dev/docs/screenshots).

## Render e interacción WebGL

`scripts/audit-graphs-browser.mjs` comprueba `/saori.html` a los tres anchos con contextos separados, WebGL por software y peticiones GET/HEAD. Intercepta las llamadas de dibujo únicamente en el navegador de prueba: toma una muestra central de 32 × 32 píxeles inmediatamente después de `drawArrays`, cuenta colores y errores GL, y comprueba cambios de proyección al arrastrar y usar la rueda. También prueba el control de aristas, la pestaña Galaxia y el botón de centrar. Guarda checkpoints JSON y capturas del canvas fuera del repositorio; se detiene tras dos fallos. Los errores JavaScript se registran por tipo y ubicación de fuente pública, sin copiar mensajes de página.

```sh
PLAYWRIGHT_MODULE=/tmp/drakes-mobile/node_modules/playwright/index.mjs \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node scripts/audit-graphs-browser.mjs https://web.drakescraft.cl /tmp/drakes-graphs-results

PLAYWRIGHT_MODULE=/tmp/drakes-mobile/node_modules/playwright/index.mjs \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node --test tests/graphs-picking.browser.test.mjs
```

La regresión local sirve el renderer real con dos nodos sintéticos DGR1 y comprueba hover, selección e inspector persistente a375/393/412px, sin red externa. No acredita rendimiento con grafos masivos. La sonda pública exige WebGL disponible; no acredita pinch táctil, GPU física ni navegación completa con lector de pantalla. `complete` describe el recorrido, mientras que errores CSP o JavaScript también producen salida1.
