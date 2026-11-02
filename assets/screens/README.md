# Galería de Capturas Oficiales (`assets/screens/`)

Esta carpeta aloja los **6 slots oficiales de capturas 16:9** mostrados en la portada (`index.html` / `index-en.html`) y enlazables desde la guía. Cuando Jack envíe capturas nuevas del servidor (con o sin shaders), basta con convertirlas a WebP reemplazando el nombre exacto de cada slot.

## Nombres y tamaños esperados

Cada slot tiene **dos variantes WebP (`16:9`)**:
- `*-1600.webp` → **1600 × 900 px** (escritorio, calidad `80`, ideal `< 180 KB`)
- `*-960.webp` → **960 × 540 px** (móvil/tablet, calidad `78`, ideal `< 85 KB`)

| Slot | Archivo base | Qué captura colocar aquí |
|---|---|---|
| **01** | `slot-01-spawn-end` | Spawn / Lobby central o portal hacia la infección del End |
| **02** | `slot-02-slimefun-quantum` | Base industrial de Slimefun, reactores o redes de Networks |
| **03** | `slot-03-stellarity-end` | Biomas/altares de Stellarity en el End o Incendium en el Nether |
| **04** | `slot-04-modalidades-islas` | Islas de SkyBlock, OneBlock o columna de OneChunk |
| **05** | `slot-05-bosses-olimpo` | Combate contra jefes míticos, santuarios de dioses o Yggdrasil |
| **06** | `slot-06-comunidad-imperio` | Jugadores Java + Bedrock o megaconstrucción comunitaria |

## Comando rápido para reemplazar una captura

```bash
SRC=/ruta/a/captura_jack.png
SLOT=slot-01-spawn-end

ffmpeg -y -i "$SRC" -vf "scale=1600:900:force_original_aspect_ratio=increase,crop=1600:900" -c:v libwebp -quality 80 "assets/screens/${SLOT}-1600.webp"
ffmpeg -y -i "$SRC" -vf "scale=960:540:force_original_aspect_ratio=increase,crop=960:540" -c:v libwebp -quality 78 "assets/screens/${SLOT}-960.webp"
```

Los textos alternativos (`alt`) bilingües ES/EN están catalogados en `MANIFEST.json` y sincronizados en `index.html` e `index-en.html`.
