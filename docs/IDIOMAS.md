# Idioma de las páginas

`scripts/site.js` y su copia `web/scripts/site.js` conservan el idioma declarado
por el HTML. El selector abre páginas nativas y no carga Google Translate en
ningún idioma; funciona con la CSP existente, sin proveedores externos. Las
páginas `lang="en"` (incluido `en-US`) conservan su idioma y no muestran el aviso.

En páginas españolas se mantiene el aviso para navegadores de otros idiomas;
su botón abre la versión inglesa. La preferencia antigua de inglés, guardada en
localStorage o cookie, redirige a la página nativa y elimina las cookies del
traductor. El HTML español conserva `lang="es"` mientras navega. Volver a español
borra la preferencia y ambas cookies, y abre la página española correspondiente.
Las rutas especiales incluyen `guia`/`guide`, `eventos`/`events` y `votar`/`vote`.
Si no hay equivalente conocido, el selector abre la portada del idioma elegido.
Los pares conocidos conservan la consulta y el fragmento; el retorno de respaldo
a la portada los descarta. No se traducen dinámicamente páginas sin equivalente.

`npm run check` ejecuta las regresiones sin red de ambas copias del script.
Para comprobar el menú móvil real con Chromium instalado y Playwright disponible:

```sh
node scripts/check-language-browser.mjs
PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs node --test tests/language-csp.browser.test.mjs
# Si Playwright está instalado fuera del proyecto:
PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs node scripts/check-language-browser.mjs
```

El ensayo sirve los HTML y recursos locales en una dirección de loopback efímera,
bloquea servicios externos y scripts ajenos a `site.js`, y comprueba el idioma,
la ausencia de traductor en inglés y el regreso a español con el botón real a
375, 393 y 412 px. Guarda el resultado en `/tmp/drakescraft-language-browser.json`
(o en `LANGUAGE_REPORT`). No acredita traducción externa, la auditoría visual
completa ni cambios en producción. La prueba `language-csp.browser.test.mjs`
añade el flujo del aviso, regreso ES, migración de cookie/localStorage y navegador
español a 375, 393 y 412 px para ambas copias de `site.js`; usa la CSP extraída de
`server.js`, documentos reales de Temporada 2 y recursos locales. Exige cero
peticiones al traductor, violaciones CSP y errores JavaScript en el flujo inglés.
