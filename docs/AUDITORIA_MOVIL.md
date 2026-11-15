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

`cspViolations` registra eventos reales `securitypolicyviolation` desde antes de los scripts de página: directiva efectiva, disposición y tipo de recurso (`inline`, `eval`, `same-origin`, esquema u origen HTTP externo). No conserva rutas de recursos, parámetros, texto bloqueado ni política completa. Complementa el contador de errores de consola, que no explica qué se bloqueó. La regresión CSP sirve una política local que rechaza tres scripts (inline, local y externo), verifica que no se ejecutan y que el informe omite los datos excluidos. Es un diagnóstico; no cambia ni relaja la CSP de la web.

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

Para comprobar novedades sin servicios externos, `tests/news-mobile.browser.test.mjs` sirve el `<main>` real de ambas páginas, sus estilos locales y el renderer actual con tres entradas sintéticas. Recorre filtros, agrupación semanal, expansión/contracción, traducciones, enlaces y texto HTML tratado como datos a 375/393/412 px. Solo permite GET/HEAD al servidor local y nunca abre el enlace de fuente. Se ejecuta con `PLAYWRIGHT_MODULE` y `build_seguro.sh` como la regresión anterior; sin esa variable se omite explícitamente. `AUDIT_ARTIFACT_DIR` permite guardar capturas de la fixture fuera de Git. Estas pruebas no acreditan el feed público, fuentes externas ni la página completa.

Las capturas de viewport y de documento completo son modalidades distintas de la [API de Playwright](https://playwright.dev/docs/screenshots).

## Métricas con datos sintéticos

`tests/metrics-mobile.browser.test.mjs` sirve el documento, estilos locales y renderer reales de métricas ES/EN, retirando fuentes remotas y scripts ajenos a métricas. Chromium procesa el HTML original sin extraer ni reconstruir `<main>`: la página inglesa carece actualmente de su cierre explícito. La API local devuelve 27 perfiles ficticios: comprueba las 24 barras horarias, días, nombres HTML tratados como texto, expansión de 25 a 27 filas y vuelta a 25, contención del documento y desplazamiento horizontal propio de la tabla. Después responde HTTP503 y exige el estado sin datos, sin conservar filas anteriores.

```sh
PLAYWRIGHT_MODULE=/tmp/drakes-mobile/node_modules/playwright/index.mjs \
  AUDIT_ARTIFACT_DIR=/tmp/drakes-metrics-results \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node --test tests/metrics-mobile.browser.test.mjs
```

Recorre375/393/412px en ambos idiomas, bloquea servicios externos y métodos distintos de GET/HEAD, y se detiene tras dos casos fallidos. Las capturas opcionales muestran la zona de la tabla después de contraerla; no son capturas de la web publicada. No acredita datos públicos, fuentes remotas, navegación global, CSP ni teléfono físico. Sin `PLAYWRIGHT_MODULE` la prueba se omite explícitamente.

## Wiki con datos sintéticos

`tests/wiki-mobile.browser.test.mjs` sirve los documentos ES/EN y estilos locales reales con `scripts/sfwiki.js` y dos addons ficticios. Recorre375/393/412px: filtro de addons, búsqueda sin distinción de acentos, paginación48→51, exclusión del segundo addon al filtrar y paginar48→50, filtros por categoría, búsqueda vacía de resultados y navegación de receta a ingrediente y vuelta al addon. Comprueba hojas CSS locales cargadas con reglas, nueve casillas, cantidades, texto HTML inerte y contención horizontal del documento en la receta.

```sh
PLAYWRIGHT_MODULE=/tmp/drakes-mobile/node_modules/playwright/index.mjs \
  AUDIT_ARTIFACT_DIR=/tmp/drakes-wiki-results \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node --test tests/wiki-mobile.browser.test.mjs
```

Retira scripts globales del documento para aislar el renderer; conserva HTML y CSS locales. Solo permite GET/HEAD al servidor local. Sin `PLAYWRIGHT_MODULE` se omite explícitamente; para tras dos casos fallidos. Las capturas opcionales muestran la receta ficticia, no el catálogo público ni su CSP. No acredita un teléfono físico, fuentes externas o interacción entre scripts globales.

## Eventos cancelados y calendario sintético

`tests/events-mobile.browser.test.mjs` sirve el `<main>`, estilos locales (incluido el bloque CSS inline) y renderer inline reales de `eventos.html` y `events-en.html`. A375/393/412px comprueba cuatro respuestas: cancelación con eventos presentes en el JSON, HTTP503 con `ok:false`, JSON inválido y calendario activo ficticio. Los tres primeros mantienen ocultos los cinco nodos de programación, sin tarjetas ni sustitución del título de cancelación. El activo comprueba traducciones, evento del día, seis tarjetas, cinco tipos de distintivo y clases de día actual/cumpleaños/gala. Todas las hojas locales deben cargar con reglas; se mide el ancho global en24 navegaciones.

```sh
PLAYWRIGHT_MODULE=/tmp/drakes-mobile/node_modules/playwright/index.mjs \
  AUDIT_ARTIFACT_DIR=/tmp/drakes-events-results \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node --test tests/events-mobile.browser.test.mjs
```

Solo permite GET al servidor efímero local y sustituye la API con datos ficticios. Retira navbar/footer y scripts ajenos al renderer; no prueba programación real, premios, comandos, fuentes remotas, CSP ni teléfono físico. HTTP503 se prueba junto a `ok:false`: no acredita el rechazo HTTP independiente del cuerpo. Sin `PLAYWRIGHT_MODULE` se omite explícitamente. Para tras dos casos fallidos. Las doce capturas opcionales son de viewport, cancelado/activo; no muestran todas las tarjetas.

`events-report.json` registra por estado el ancho y el área de intersección entre el rectángulo del título y el distintivo `::before` de la caja de hoy (píxeles cuadrados CSS). La medida contempla bordes y `box-sizing`; no analiza los glifos. Es diagnóstico de la fixture, sin aserción de separación: retirar fuentes y scripts globales puede cambiar tipografía y saltos de línea. Un solape local debe contrastarse con capturas públicas antes de abrir un defecto. Las pruebas de calendario por sí solas no certifican ausencia de solapes en la página completa.

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

## Votos con datos sintéticos

`tests/votes-mobile.browser.test.mjs` sirve el `<main>`, CSS local y renderer inline originales de `votar.html` y `vote-en.html`. Recorre375/393/412px con cinco listados ficticios: dos activos, uno deshabilitado, uno provisional y uno sin URL. Comprueba nombres HTML inertes, enlaces y `noopener`, estados traducidos, persistencia local del nick, contención horizontal y botones de al menos44px de alto. Un reloj simulado comprueba decremento y expiración del cooldown de dos horas, además del estado de24horas tras el listener de clic y una recarga.

```sh
PLAYWRIGHT_MODULE=/tmp/drakes-mobile/node_modules/playwright/index.mjs \
  AUDIT_ARTIFACT_DIR=/tmp/drakes-votes-results \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node --test tests/votes-mobile.browser.test.mjs
```

Solo permite GET al servidor local. El clic es un evento sintético sin navegación: no abre listados ni emite votos. JSON inválido, error de red y HTTP503 con cuerpo HTML terminan sin tarjetas; el último caso prueba error de parseo, no validación del estado HTTP independientemente del cuerpo. No acredita entrega de premios, Votifier, CSP pública, fuentes remotas, cabecera/pie ni interacción táctil real. Sin `PLAYWRIGHT_MODULE` se omite explícitamente; para tras dos casos fallidos. Las seis capturas opcionales y `votes-report.json` son de la fixture, con nombres ficticios, fuera de Git.
