# Rediseño del portal · revisión local

## Alcance y separación

Rama de revisión: `feat/full-rebuild-bootstrap-3d`. El objetivo es reconstruir la presentación de todas las páginas, conservando los textos, imágenes y funcionalidades existentes. No desplegar esta rama ni fusionarla en `main` sin la revisión de Jack.

La nueva capa visual carga Bootstrap 5.3.8 desde `vendor/bootstrap/` y `styles/olympus.css`; las hojas de la presentación anterior no se cargan. Atenea conserva su hoja especializada para el visor y usa las nuevas reglas para integrarse en el portal.

| Vista                                      | Presentación                                                                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio                                     | Cabecera dividida, emblema modelado en Three.js, fotografías originales en planos con perspectiva, modalidades, historia, comunidad, tienda y equipo |
| Guías general, comandos, rangos y Slimefun | Cabecera, índice lateral, buscador y filtros originales, acordeones y tablas desplazables                                                            |
| Cultivation                                | Vista pública para el fragmento de recetas existente; el fragmento sigue siendo la fuente única                                                      |
| Tienda                                     | Categorías laterales, catálogo, carrito y formulario existentes                                                                                      |
| Métricas                                   | Resumen y paneles de actividad, países y jugadores; datos de la API existente, sin simulación                                                        |
| Apoyar                                     | Presentación de aportes y colaboradores originales                                                                                                   |
| Discord                                    | Información comunitaria original y accesos al Discord, reportes y ayuda                                                                              |
| Soporte y términos                         | Listas de ayuda, contenido legal conservado e índice de lectura                                                                                      |
| Atenea                                     | Visor existente dentro de la navegación nueva; no se modifican sus comandos                                                                          |
| 404, 500 y mantenimiento                   | Estados de error integrados en el mismo portal                                                                                                       |

`scripts/experience.js` solo se encarga de copiar la IP, el estado consultado y el índice de lectura. Reemplaza la navegación anterior; no cargar simultáneamente `scripts/site.js` ni el borrador `navigation.js` en estas páginas.

`scripts/emblem.js` añade el emblema 3D. Mantiene un único ciclo a un máximo aproximado de 30 fps, limita la densidad de píxeles, se detiene fuera de la cabecera o con la pestaña oculta, respeta movimiento reducido y permite pausar manualmente. Ante fallo de textura, contexto o render conserva el logo original. Las páginas de lectura no cargan el emblema.

## Pagos

No se modifica `scripts/store.js`, `catalog/store-catalog.js`, la autenticación, el cálculo de importes, el POST de checkout, Tebex ni los webhooks. Se conservan los IDs del catálogo, carrito, modal y formulario, los nombres de los campos y sus restricciones. Los cambios de `server.js` son las rutas públicas de presentación y la opción de enlazar el preview solo a loopback.

No realizar una compra real para validar el rediseño. La prueba local se limita al código, los contratos de presentación y peticiones GET. Sin credenciales ni datos de producción, algunas métricas mostrarán su estado vacío o no disponible: no confundirlo con una caída de Star.

## Arranque aislado

```bash
npm ci
npm run check
WEB_BIND_HOST=127.0.0.1 PORT=8083 DATA_DIR=/tmp/drakescraft-web-preview npm start
```

Usar un directorio de datos temporal propio para el preview. No copiar `.env`, compras, registros privados ni claves del servidor. El valor predeterminado de `WEB_BIND_HOST` no cambia el enlace del servicio de producción.

## Verificación

`npm run check` comprueba sintaxis, las 33 entradas del catálogo y las regresiones de presentación. Las pruebas revisan las 16 páginas públicas, referencias locales, anclas, IDs únicos, scripts duplicados y contratos de tienda, métricas y Atenea.

Además se contrastó el contenido de las cuatro guías y los términos contra la revisión base: 793 filas, entradas y bloques legales conservados. Los atributos funcionales del formulario de pago permanecen iguales.

Las pruebas automatizadas de fuente no equivalen a una revisión visual en un navegador. El preview queda para revisar apariencia e interacción antes de autorizar producción. No se ha reiniciado Star ni Minecraft como parte de este rediseño.
