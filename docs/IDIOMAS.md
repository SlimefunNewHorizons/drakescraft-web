# Idioma de las páginas

`scripts/site.js` y su copia `web/scripts/site.js` conservan el idioma declarado
por el HTML antes de inicializar traducciones. Las páginas nativas `lang="en"`
(incluido `en-US`) no cargan Google Translate ni muestran el aviso para traducir
al inglés. La navegación conserva el subtítulo inglés.

En páginas españolas se mantienen la preferencia manual de inglés y el aviso
para navegadores de otros idiomas. Volver a español borra la preferencia y ambas
cookies de traducción; desde una página inglesa navega a su equivalente español,
y desde una página española traducida recarga el original.

`npm run check` ejecuta las regresiones sin red de ambas copias del script.
Para comprobar el menú móvil real con Chromium instalado y Playwright disponible:

```sh
node scripts/check-language-browser.mjs
# Si Playwright está instalado fuera del proyecto:
PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs node scripts/check-language-browser.mjs
```

El ensayo sirve los HTML y recursos locales en una dirección de loopback efímera,
bloquea servicios externos y scripts ajenos a `site.js`, y comprueba el idioma,
la ausencia de traductor en inglés y el regreso a español con el botón real a
375, 393 y 412 px. Guarda el resultado en `/tmp/drakescraft-language-browser.json`
(o en `LANGUAGE_REPORT`). No acredita traducción externa, la auditoría visual
completa ni cambios en producción.
