# Fotos del lobby T2 ("Olimpo en colapso")

`temporada-2.html` y `temporada-2-en.html` tienen 8 huecos listos. Sin foto muestran un grabado de línea, así que nunca hay imagen rota. No usar renders: solo fotos con shader tomadas en juego.

## Insertar una foto
1. Convierte a WebP, 1600 px de ancho (`cwebp -q 82 entrada.png -o salida.webp`) y déjala en `assets/lobby/` con el nombre de la tabla.
2. En el bloque inicial de `styles/t2-olimpo.css`, cambia `--photo: none` por `--photo: url("../assets/lobby/<archivo>")` en esa línea.
3. Sube `V` en `scripts/build-t2-paginas.py` y ejecuta `python3 -I scripts/build-t2-paginas.py`.
4. `npm run check`, smoke tests y despliegue normal.

No hay que tocar el HTML: el texto alternativo ya está en cada `aria-label`.

## Huecos
| Clase | Archivo | Proporción | Qué fotografiar |
|---|---|---|---|
| `ol-plate--olimpo` | `olimpo.webp` | 21:9 (cabecera) | Panorámica de la isla flotante con nubes de oro y púrpura |
| `ol-plate--grieta` | `grieta.webp` | 16:10 | La Grieta rompiendo el prado hasta el templo mayor, con agujas del End |
| `ol-plate--atlas` | `atlas.webp` | 16:10 | Atlas de cuerpo entero sosteniendo la luna rota |
| `ol-plate--anticitera` | `anticitera.webp` | 16:10 | Anillos de la Anticitera desde la fuente, en contrapicado |
| `ol-plate--duga` | `duga.webp` | 16:10 | Muro de antenas tipo Duga y parábolas en el prado este |
| `ol-plate--wither` | `wither.webp` | 16:10 | Wither Storm; si no hay foto, puede quedar con el grabado |
| `ol-plate--coliseo` | `coliseo.webp` | 16:10 | Coliseo PvP con la corona rota |
| `ol-plate--islas` | `islas.webp` | 16:10 | Islas de warps a la deriva (Protecciones, Crates, Votar, Tienda) |

La imagen se recorta con `cover` y queda centrada: deja el motivo en el centro y evita texto en los bordes. El pie de foto va abajo a la izquierda.
