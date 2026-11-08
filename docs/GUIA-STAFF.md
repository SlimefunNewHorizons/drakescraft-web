# 🛡️ Guía del Staff — DrakesCraft

> Cada bloque cabe en un mensaje de Discord (límite de 2000 caracteres).
> Publícalos por separado, en orden.

## SII: contención en preparación (#690/#691, todavía sin desplegar)

El candidato de Odysseia reinicia las muestras de patrimonio al cambiar de
modalidad. Una fiscalización queda vinculada a su modalidad original y se pausa
fuera de ella; no crea una segunda fiscalización para el mismo jugador.
`/odysseia sii liberar|confiscar|congelar <jugador>` rechaza operar una retención
existente si el jugador está desconectado, está en otra modalidad o el registro
antiguo no indica modalidad. Esos registros se conservan para revisión manual.
Un abono rechazado conserva la retención; vencer el plazo tampoco la elimina
si queda dinero pendiente. `/odysseia sii estado` incluye la modalidad.

El candidato #691 guarda una intención durable antes de cada débito o abono.
Si una caída o un fallo deja el resultado incierto, `/odysseia sii estado` indica
que el movimiento requiere conciliación. La cuenta conserva el registro y
rechaza liberar, confiscar, congelar o retener nuevamente; no repite el movimiento
al arrancar. Esto también se aplica al rechazo de persistencia de sBank.
Un archivo ilegible o un fallo de escritura detiene los movimientos del SII.

No se han activado estas guardas en Dallas. Faltan el ensayo en servidor,
respaldo y hashes remotos. Una intención pendiente no demuestra por sí sola que
el dinero se haya movido: contrastar con el proveedor original antes de resolver
el caso. No borrar el marcador, restaurar una copia antigua del registro ni
realizar compensaciones para probarlo.

---

## MENSAJE 1 — Cómo se hereda el rango

**🛡️ GUÍA DEL STAFF — DrakesCraft**

Los rangos heredan hacia arriba: cada uno tiene **todo lo del anterior** más lo suyo.

**Rama de moderación**
`Jugador` → **Helper** → **Mod** → **Admin** → **Owner**

**Rama técnica**
`Jugador` → **Builder** → **Dev** → **Jefe de Desarrollo**

Si un comando no te funciona, no es un bug: es que corresponde a un rango por encima del tuyo. Pídelo en el canal de staff antes de insistir.

⚠️ **Regla de oro:** todo lo que hagas queda registrado. CoreProtect guarda cada bloque y cada cofre; la consola guarda cada comando. No es desconfianza, es cómo se resuelven las acusaciones injustas.

---

## MENSAJE 2 — Helper

**🟢 HELPER — atención y soporte**

**Ver qué pasó**
`/co inspect` — activa el modo inspección; pega a un bloque y te dice quién lo puso o lo rompió (atajo: `/co i`)
`/co lookup u:<jugador> t:3d` — historial de un jugador en los últimos 3 días
`/co lookup r:10 t:1h` — todo lo ocurrido en 10 bloques a la redonda en la última hora

**Atender jugadores**
`/helpop <texto>` — responde a las peticiones de ayuda
`/seen <jugador>` — última conexión y tiempo jugado
`/whois <jugador>` — ficha completa: IP, ubicación, gamemode
`/socialspy` — ver los mensajes privados de todos
`/tp <jugador>` — teletransportarte a alguien

**Moderación de chat**
`/dwarn <jugador> <motivo>` — advertencia formal del filtro de chat (alias: `/drakeswarn`)

**Extra**
`/lenador [nivel]` — invoca al Leñador Loco en silencio, para eventos

---

## MENSAJE 3 — Mod

**🔵 MOD — sanciones**

*Incluye todo lo de Helper.*

**Sancionar**
`/mute <jugador> [motivo]` · `/tempmute <jugador> <tiempo> [motivo]`
`/kick <jugador> [motivo]`
`/tempban <jugador> <tiempo> [motivo]` — usa este por defecto
`/ban <jugador> [motivo]` — permanente, solo para casos graves
`/unban <jugador>` · `/unmute <jugador>`
`/jail <jugador> <carcel>` · `/unjail <jugador>`

**Investigar**
`/invsee <jugador>` — mirar su inventario
`/clearinventory <jugador>` — vaciarlo (con captura previa, siempre)

**Moverte**
`/tphere <jugador>` — traerlo hacia ti
`/vani` — vanish de Odysseia; los demás dejan de verte
`/rtp <jugador>` — reubicarlo al azar en el mundo principal

**Eventos**
`/bloodmoon <start|stop|status>` — Luna de Sangre
`/niebla <on|off|toggle> [jugador|all]` — niebla densa de terror
`/troll <subcomando> <jugador>` — trolleos inofensivos
`/meteorito <pequeno|pesado|void|lluvia> [cantidad] [radio]` — meteoritos, **nunca dentro de protecciones**

⚠️ Antes de un `/ban` permanente: pruebas en el canal de staff. Sin pruebas, `/tempban`.

---

## MENSAJE 4 — Admin

**🟠 ADMIN — servidor y tienda**

*Incluye todo lo de Mod.*

**Jugadores**
`/gamemode <modo> [jugador]` · `/god` · `/heal` · `/feed`
`/fly [jugador]` · `/speed <fly|walk> <1-10> [jugador]`
`/nick <jugador> <apodo>` · `/sudo <jugador> <comando>`
`/invsee <jugador>` — aquí sí puedes **modificar** el inventario
`/broadcast <texto>` — anuncio a todo el servidor

**Tienda y compras**
`/odysseiapurchase status` — estado del motor de entregas
`/odysseiapurchase pending` — compras sin entregar
`/odysseiapurchase retry <id>` — reintentar una entrega fallida
`/odysseiapurchase history <jugador>` — historial de compras
`/odysseiaannounce <nick> <producto>` — anuncio público de una compra
`/odysseiapendingkit <jugador> <kit>` — encolar rango y kit
`/kitgive <jugador> <kit>` — entregar solo los ítems, para pruebas

**Mantenimiento**
`/odysseia reload` — recarga config, catálogo y servicios **sin reiniciar**
`/odysseia status` — productos cargados e instancia
`/restart30 [segundos] [motivo]` — reinicio avisado (cancelar: `/restart30 cancelar`)

**Permisos y regiones**
`/lp user <jugador> parent add <grupo>` — dar un rango
`/lp user <jugador> parent switchprimarygroup <grupo>` — cambiar el principal
`/lp user <jugador> permission set <nodo> true` — permiso suelto
`/rg info` · `/rg flag <region> <flag> <valor>` — regiones de WorldGuard

⚠️ `/lp` es la sintaxis correcta: **`switchprimarygroup`**, no `setprimarygroup`.

---

## MENSAJE 5 — Builder / Dev

**🟣 BUILDER · DEV — construcción y desarrollo**

**Builder**
`/gamemode creative` · `/gamemode survival` · `/fly`
`//wand` — hacha de selección de WorldEdit
`//set <bloque>` · `//replace <de> <a>` · `//copy` · `//paste`
`//undo` · `//redo` — **siempre disponible, úsalo antes de dudar**
`/rg <subcomando>` — regiones de WorldGuard

**Dev (además de lo anterior)**
`/item <material> [cantidad]` · `/more` · `/repair`
`/workbench` · `/enderchest`
`/god [jugador]` · `/heal [jugador]`

⚠️ **WorldEdit en producción:** haz `//count` antes de un `//set` masivo. Una operación de un millón de bloques congela el servidor para todos.

---

## MENSAJE 6 — Reglas de conducta

**📜 CÓMO SE TRABAJA AQUÍ**

**1. Todo queda grabado.** CoreProtect registra bloques y cofres; la consola, cada comando. Esto te protege a ti tanto como al servidor.

**2. Sanción proporcional.** Primero avisas, luego `/tempmute` o `/tempban`. El ban permanente es el último recurso y necesita pruebas.

**3. Captura antes de tocar.** Antes de `/clearinventory` o de retirar ítems duplicados, foto del inventario al canal de staff.

**4. Nunca te des ítems ni rangos a ti mismo.** Si necesitas algo para probar, pídelo y que quede escrito.

**5. Los bugs se reportan, no se usan.** Si encuentras un dupe: captura, canal de staff, y no lo toques. Ya hemos cerrado varios así, gracias a reportes.

**6. Vanish no es para espiar amigos.** Se usa para moderar, no para curiosear.

**7. Ante la duda, pregunta.** Nadie se ha metido en un lío por preguntar antes. Al revés, sí.

**Si algo se rompe:** avisa en staff con la hora exacta y lo que estabas haciendo. Los logs se revisan por marca de tiempo, y "hace un rato" no sirve.
