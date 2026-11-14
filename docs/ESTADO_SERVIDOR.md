# Máximo anunciado del servidor

`GET /api/server-status` conserva `maximo` para los clientes existentes.
Es el máximo anunciado en la lista de servidores, modificable por plugins;
no acredita `server.properties`, plazas disponibles ni capacidad medida.
`maximoFuente` identifica `server-list-ping`, `mcsrvstat` o `null` sin datos.
El visor de grafos lo presenta como «máximo anunciado» en español e inglés,
igual que el bot de Discord.

Diagnóstico local del 13-nov-2026: el respaldo
`~/backups/minimotd-main-20261112.conf` contiene
`max-players-enabled=true`, `max-players=2027` y
`fake-players-enabled=false`. SHA-256 del respaldo:
`3e7596cfffeb5aa17841563fb129e773ec97171e3b2d990e1f7582781bc30183`.
Esto explica el 2027 observado previamente: MiniMOTD sustituye el máximo
anunciado, sin que esa opción falsifique los jugadores conectados.
El respaldo no certifica la configuración actual de Dallas; esta entrega
no consulta ni modifica producción.

Validación sin Dallas: `node --test tests/mc-status.test.mjs` cubre ping TCP
local (0/2027), caché, respaldo HTTP simulado y ambas fuentes ausentes para
las dos copias del módulo de estado.

La caché de 30 segundos solo se reutiliza para el mismo host y puerto.
Cambiar de destino obliga a consultar su estado: no hereda jugadores,
máximo anunciado, versión ni disponibilidad del servidor anterior.
La regresión de dos destinos usa puertos TCP loopback distintos (2027/100)
y comprueba que las consultas repetidas al mismo destino usan la caché.

Si el servidor cierra TCP sin entregar un estado completo, la consulta pasa
al respaldo HTTP. El timeout de inactividad del socket no cubre un socket
ya cerrado: se atiende también `close` para evitar peticiones pendientes.
Cuatro regresiones loopback cubren cierres sin bytes y paquetes truncados
en ambas copias del módulo, sin consultar producción.

El paquete TCP debe tener ID de respuesta de estado (`0`) y la longitud del
JSON debe coincidir con el final del paquete declarado. Un ID distinto, un
JSON que exceda el paquete o bytes sobrantes dentro de este activan el
respaldo HTTP; no se presentan como una medición válida del ping. Seis
regresiones loopback verifican estos casos en ambas copias del módulo.

Los conteos de jugadores y máximo anunciado deben existir y ser enteros
seguros no negativos, tanto en TCP como en el respaldo HTTP. Un ping con
conteos ausentes, negativos, fraccionarios o de texto pasa al respaldo. Si
este también es inválido se devuelve el estado sin medición. El respaldo
requiere `online: true` booleano; `"false"` no acredita disponibilidad. Se
permite cero y no se compara conectados con máximo, porque este es anunciado.
Un MOTD con `text` de otro tipo se ignora, conservando los componentes de
texto válidos y sin interrumpir la consulta de estado.

Los VarInt del paquete TCP admiten como máximo cinco bytes y 32 bits.
Se rechazan desbordamientos del quinto byte y codificaciones de seis bytes:
no pueden convertirse por truncamiento en un ID o una longitud válidos.
Ocho regresiones cubren longitudes de paquete/JSON e ID malformados en ambas
copias; dos controles conservan longitudes válidas de dos bytes.

La consulta TCP tiene también un plazo total de 3500 ms desde la apertura
del socket, incluido el establecimiento de conexión. Recibir bytes no
reinicia ese plazo: una respuesta incompleta con tráfico continuo pasa al
respaldo HTTP al vencer. El temporizador se cancela al resolver la consulta.
Dos regresiones loopback envían bytes cada 60 ms y comprueban el respaldo
sin esperar al timeout de inactividad. El respaldo conserva su propio plazo.
