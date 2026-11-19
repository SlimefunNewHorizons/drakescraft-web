# Distintivo de eventos en móvil (#914)

El distintivo de la caja del evento de hoy ocupa una fila propia antes del
título. Su ancho se limita al contenedor y el margen inferior separa ambos
textos. Se aplica a `eventos.html`, `events-en.html` y sus copias en `web/`.
El cambio CSS se extrae de `b18edd7` sobre `main`, sin incorporar otras PR.

La regresión conserva el documento completo y las hojas locales, retirando
JavaScript y fuentes remotas. Comprueba los cuatro documentos a 375, 393, 412
y 1280 px, con título cancelado y título sintético largo, y tamaño de texto
100/200%. Exige separación y contención del distintivo; al 100% también exige
ausencia de desborde horizontal del documento.

```sh
PLAYWRIGHT_MODULE=/ruta/externa/playwright/index.mjs \
  AUDIT_ARTIFACT_DIR=/tmp/eventos-movil \
  bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
  node --test tests/events-heading.browser.test.mjs
```

Sin `PLAYWRIGHT_MODULE` se omite explícitamente. Se detiene tras dos casos
fallidos. No acredita APIs, fuentes públicas, scripts globales, teléfono físico
ni zoom real del navegador. La separación al 200% no certifica la contención
del documento completo a ese tamaño. Las capturas opcionales son de fixture.

El job `events-mobile` de CI instala Playwright 1.58.2 y Chromium únicamente
en el directorio temporal del runner, y ejecuta la misma regresión contra la
candidata. No añade dependencias a la imagen de producción.

Reversión: revertir el commit CSS. El desplegador web exige una copia limpia
en `main`; los cambios locales de tienda no deben sobrescribirse ni incluirse
en este arreglo. La integración Git por sí sola no demuestra un despliegue.
