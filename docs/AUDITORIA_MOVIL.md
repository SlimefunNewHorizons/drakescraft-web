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

El recorrido abre 26 páginas por ancho y bloquea métodos HTTP distintos de GET/HEAD. No hace clic, envía formularios ni interactúa con pagos. La tienda se inspecciona como documento público; no se modifica su código.

Cada resultado incluye estado HTTP, ancho real del documento, hasta 25 selectores fuera del viewport, número total y una muestra de textos menores de 12 px, errores JavaScript/CSP y dimensiones de canvas. Las capturas muestran el viewport; las medidas abarcan todo el documento. Salida `1` indica desborde horizontal, errores de carga/JavaScript/CSP o fallo de captura. Los textos pequeños son candidatos a revisión visual y no provocan por sí solos ese código.

`report.json` y los PNG quedan en el directorio indicado, fuera de Git. El informe no copia textos de la página, respuestas API ni parámetros de URL. Solo se usa contenido público y no se inicia sesión.

El JSON final se escribe al terminar el recorrido. Si se interrumpe el proceso, conservar la salida JSON por línea como evidencia parcial: esta salida no contiene todos los campos del informe final y no acredita las rutas restantes.

Límites: emulación de Chromium con movimiento reducido y WebGL por software; no acredita Safari, Firefox, un teléfono físico, contraste, objetivos táctiles ni la interacción completa de los grafos. La existencia de un canvas no demuestra que su escena se haya dibujado. Repetir los casos relevantes con movimiento normal y revisar capturas antes de cerrar un hallazgo.

Las capturas de viewport y de documento completo son modalidades distintas de la [API de Playwright](https://playwright.dev/docs/screenshots).
