# Hero solar de la portada inglesa (#807)

`index-en.html` carga el mismo renderer `scripts/hero-orbit.js` que la portada
española, con su canvas y emblema dentro de la columna visual existente. Conserva
los botones, enlaces y panel de estado de la portada inglesa. Las reglas de
disposición añadidas en `styles/hero-orbit.css` están acotadas a su hero; los nombres
Classic y Laboratory se traducen según el idioma del documento.

La regresión `tests/hero-mobile.browser.test.mjs` recorre ES/EN a375/393/412px,
con movimiento normal y reducido. Sirve el header y CSS locales reales, permite
solo GET al servidor efímero y retira scripts ajenos al hero y fuentes remotas.
Exige canvas visible y pintado, cambios entre cuadros solo con movimiento normal,
controles accesibles al hit-test, ausencia de desborde, errores JS y recursos
locales fallidos. No basta con contar un canvas. El presupuesto global es150s
para los doce escenarios y sus capturas opcionales; las esperas locales conservan
sus límites de5s/10s.

```sh
PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs \
AUDIT_ARTIFACT_DIR=/tmp/drakes-hero-results \
bash ~/ai-hub/scripts/build_seguro.sh 21 "$PWD" \
node --test tests/hero-mobile.browser.test.mjs
npm run check
```

Sin `PLAYWRIGHT_MODULE`, la prueba queda omitida explícitamente. JSON y capturas
son artefactos locales, fuera de Git. La fixture aísla el hero: no acredita la
página pública, scripts globales, estado real del servidor, portapapeles,
servicios externos, escritorio, teléfono físico ni otros navegadores.

La entrega se publica como candidata; desplegar requiere integrar su rama y la
base de auditoría móvil, reconstruir la imagen y comprobar la web servida. No se
anuncia como activa mientras ese paso siga pendiente. La reversión consiste en
revertir el commit de #807; antes de publicar se conservó un mini-respaldo local
de los tres recursos de producto modificados.
