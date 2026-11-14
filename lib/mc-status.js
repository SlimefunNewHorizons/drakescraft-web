
function extraerMotd(desc) {
  if (!desc) return 'DrakesCraft · Servidor Oficial';
  if (typeof desc === 'string') return desc.replace(/§[0-9a-fk-or]/gi, '').trim();
  let res = typeof desc.text === 'string' ? desc.text : '';
  if (Array.isArray(desc.extra)) {
    for (const part of desc.extra) {
      if (typeof part === 'string') res += part;
      else if (part && typeof part.text === 'string') res += part.text;
    }
  }
  const limpio = res.replace(/§[0-9a-fk-or]/gi, '').trim();
  return limpio || 'DrakesCraft · Servidor Oficial';
}

import net from 'node:net';

/**
 * Consulta el estado del servidor de Minecraft.
 *
 * 1. Primero intenta Server List Ping nativo por socket TCP directo (rápido y sin terceros).
 * 2. Si el socket directo falla o no resuelve DNS localmente, consulta la API de respaldo (mcsrvstat).
 * 3. Cachea los datos durante 30 segundos para evitar saturación de conexiones.
 */

const TIEMPO_LIMITE_MS = 3500;
const LIMITE_RESPUESTA_BYTES = 1024 * 1024;
const CACHE_MS = 30000;

let cache = { host: null, puerto: null, momento: 0, datos: null };

/** Escribe un entero en el formato VarInt del protocolo de Minecraft. */
function varInt(valor) {
  const bytes = [];
  let resto = valor;
  do {
    let byte = resto & 0x7f;
    resto >>>= 7;
    if (resto !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (resto !== 0);
  return Buffer.from(bytes);
}

/** Lee un VarInt de hasta 32 bits y cinco bytes; espera o rechaza con null. */
function leerVarInt(buffer, desde = 0) {
  let valor = 0;
  let desplazamiento = 0;
  let leidos = 0;
  while (true) {
    if (desde + leidos >= buffer.length) return null;
    const byte = buffer[desde + leidos];
    if (leidos === 4 && (byte & 0xf0) !== 0) return null;
    valor |= (byte & 0x7f) << desplazamiento;
    leidos += 1;
    if ((byte & 0x80) === 0) break;
    desplazamiento += 7;
    if (desplazamiento >= 35) return null;
  }
  return { valor, leidos };
}

/** Empaqueta un paquete con su longitud por delante, como exige el protocolo. */
function paquete(...partes) {
  const cuerpo = Buffer.concat(partes);
  return Buffer.concat([varInt(cuerpo.length), cuerpo]);
}

function cadena(texto) {
  const datos = Buffer.from(texto, 'utf8');
  return Buffer.concat([varInt(datos.length), datos]);
}

/**
 * Pide el estado al servidor por TCP directo.
 */
function consultarTCP(host, puerto) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: puerto });
    let recibido = Buffer.alloc(0);
    let resuelto = false;

    const terminar = (resultado) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(plazo);
      socket.destroy();
      resolve(resultado);
    };

    const plazo = setTimeout(() => terminar(null), TIEMPO_LIMITE_MS);
    socket.setTimeout(TIEMPO_LIMITE_MS);
    socket.on('timeout', () => terminar(null));
    socket.on('error', () => terminar(null));
    socket.on('close', () => terminar(null));

    socket.on('connect', () => {
      const puertoBuffer = Buffer.alloc(2);
      puertoBuffer.writeUInt16BE(puerto);
      socket.write(paquete(varInt(0x00), varInt(-1), cadena(host), puertoBuffer, varInt(1)));
      socket.write(paquete(varInt(0x00)));
    });

    socket.on('data', (trozo) => {
      if (trozo.length > LIMITE_RESPUESTA_BYTES - recibido.length) return terminar(null);
      recibido = Buffer.concat([recibido, trozo]);

      const longitud = leerVarInt(recibido, 0);
      if (!longitud) return;
      if (longitud.valor < 2) return terminar(null);
      const total = longitud.leidos + longitud.valor;
      if (total > LIMITE_RESPUESTA_BYTES) return terminar(null);
      if (recibido.length < total) return;

      const id = leerVarInt(recibido, longitud.leidos);
      if (!id || id.valor !== 0) return terminar(null);
      const cadenaJson = leerVarInt(recibido, longitud.leidos + id.leidos);
      if (!cadenaJson) return terminar(null);

      const inicio = longitud.leidos + id.leidos + cadenaJson.leidos;
      if (cadenaJson.valor < 0 || inicio + cadenaJson.valor !== total) return terminar(null);
      try {
        terminar(JSON.parse(recibido.subarray(inicio, inicio + cadenaJson.valor).toString('utf8')));
      } catch {
        terminar(null);
      }
    });
  });
}

/** Solo publicar conteos medidos como enteros no negativos. */
function jugadoresValidos(players) {
  return players && Number.isSafeInteger(players.online) && players.online >= 0
    && Number.isSafeInteger(players.max) && players.max >= 0;
}

/**
 * Consulta de respaldo vía HTTP API (mcsrvstat) si la conexión TCP directa no está disponible.
 */
async function consultarHTTP(host, puerto) {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${host}:${puerto}`, {
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS)
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.online !== true || !jugadoresValidos(json.players)) return null;
    return {
      enLinea: true,
      jugadores: json.players?.online ?? 0,
      maximo: json.players?.max ?? 0,
      maximoFuente: 'mcsrvstat',
      version: json.version ?? null,
      motd: Array.isArray(json.motd?.clean) ? json.motd.clean.join(' ') : (json.motd?.clean || 'DrakesCraft · Servidor Oficial')
    };
  } catch {
    return null;
  }
}

/**
 * Estado del servidor, cacheado medio minuto.
 */
export async function estadoServidor(host, puerto) {
  const ahora = Date.now();
  if (cache.host === host && cache.puerto === puerto && cache.datos && ahora - cache.momento < CACHE_MS) return cache.datos;

  // 1. Intentar TCP nativo
  let datos = null;
  const bruto = await consultarTCP(host, puerto);
  if (jugadoresValidos(bruto?.players)) {
    datos = {
      enLinea: true,
      jugadores: bruto.players?.online ?? 0,
      maximo: bruto.players?.max ?? 0,
      maximoFuente: 'server-list-ping',
      version: bruto.version?.name ?? null,
      motd: extraerMotd(bruto.description),
    };
  }

  // 2. Si falló TCP, intentar fallback HTTP
  if (!datos) {
    datos = await consultarHTTP(host, puerto);
  }

  // 3. Si ambos fallaron
  if (!datos) {
    datos = { enLinea: false, jugadores: 0, maximo: 0, maximoFuente: null, version: null };
  }

  cache = { host, puerto, momento: ahora, datos };
  return datos;
}
