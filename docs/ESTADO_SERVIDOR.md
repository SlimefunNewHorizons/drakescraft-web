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
