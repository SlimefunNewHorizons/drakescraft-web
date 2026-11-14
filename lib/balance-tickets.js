// Canalizador de reportes de balance de Temporada 2 (economía, encantamientos y jugabilidad)
// desde el portal web hacia la cola local y el intake de tickets de SAORI.
// No almacena IPs en texto plano ni credenciales (política Zero-Trust).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createLimiter } from './launcher-reports.js';

export const BALANCE_AXES = Object.freeze(['economia', 'encantamientos', 'jugabilidad']);
export const BALANCE_MODALITIES = Object.freeze([
  'survival',
  'clasico',
  'skyblock',
  'oneblock',
  'onechunk',
  'laboratorio'
]);

const AXIS_ALIASES = Object.freeze({
  economia: 'economia',
  economy: 'economia',
  dracmas: 'economia',
  tienda: 'economia',
  encantamientos: 'encantamientos',
  enchantments: 'encantamientos',
  enchants: 'encantamientos',
  jugabilidad: 'jugabilidad',
  gameplay: 'jugabilidad',
  pvp: 'jugabilidad',
  combate: 'jugabilidad'
});

const MINECRAFT_NICK_REGEX = /^\.?[A-Za-z0-9_]{3,16}$/;
const SENSITIVE_INPUT_REGEX = /(\bpassword\b|\bcontrase(?:n|ñ)a\b|\/login\s+\S+|\b(?:\d{4}[\s-]?){3}\d{4}\b|\bghp_[A-Za-z0-9]{20,}|\bsk-[A-Za-z0-9]{20,})/i;

export const BALANCE_MAX_PER_HOUR = 4;

export function createBalanceLimiter(perHour = BALANCE_MAX_PER_HOUR, now = () => Date.now()) {
  return createLimiter(perHour, now);
}

export function normalizeAxes(raw) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[,\s]+/)
      : [];
  const found = new Set();
  for (const item of list) {
    const key = String(item || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const mapped = AXIS_ALIASES[key];
    if (mapped) found.add(mapped);
  }
  return BALANCE_AXES.filter((axis) => found.has(axis));
}

export function validateBalanceTicket(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Solicitud de reporte inválida.' };
  }

  if (String(body.website || '').trim() !== '') {
    return { ok: true, honeypot: true };
  }

  const nick = String(body.nick || '').trim().slice(0, 17);
  if (!MINECRAFT_NICK_REGEX.test(nick)) {
    return {
      ok: false,
      error: 'Escribe un nick válido: 3 a 16 letras, números o guiones bajos; Bedrock puede comenzar con punto.'
    };
  }

  const axes = normalizeAxes(body.axes ?? body.axis ?? body.ejes ?? body.eje);
  if (axes.length === 0) {
    return {
      ok: false,
      error: 'Selecciona al menos un eje de balance (economía, encantamientos o jugabilidad).'
    };
  }

  const rawModality = String(body.modality ?? body.modalidad ?? 'survival')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!BALANCE_MODALITIES.includes(rawModality)) {
    return {
      ok: false,
      error: 'Selecciona una modalidad válida del servidor.'
    };
  }

  const rawDesc = String(body.description ?? body.descripcion ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();

  if (rawDesc.length < 15 || rawDesc.length > 1200) {
    return {
      ok: false,
      error: 'Describe el desbalance con entre 15 y 1200 caracteres.'
    };
  }

  if (SENSITIVE_INPUT_REGEX.test(rawDesc)) {
    return {
      ok: false,
      error: 'Por seguridad (Zero-Trust), no incluyas contraseñas, tokens ni datos de pago en el reporte.'
    };
  }

  return {
    ok: true,
    honeypot: false,
    value: {
      nick,
      axes,
      modality: rawModality,
      description: rawDesc
    }
  };
}

export function buildSaoriTicketPayload({ nick, axes, modality, description }) {
  const canonicalAxes = BALANCE_AXES.filter((a) => axes.includes(a));
  const finalAxes = canonicalAxes.length ? canonicalAxes : ['jugabilidad'];
  const channel = `web:balance-${finalAxes.join('-')}`;
  const title = `[Balance T2 · ${finalAxes.join(', ')}] ${modality} — ${nick}`;
  const desc = `[WEB] Modalidad: ${modality} | Ejes: ${finalAxes.join(', ')}\n${description}`;
  return {
    title,
    desc,
    author: nick,
    channel,
    axes: finalAxes,
    modality,
    origin: 'web'
  };
}

export async function saveBalanceTicket(filePath, value, { now = new Date(), forwardFn = null } = {}) {
  const payload = buildSaoriTicketPayload(value);
  const id = `bt-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let saoriTicketId = null;

  if (typeof forwardFn === 'function') {
    try {
      saoriTicketId = (await forwardFn(payload)) || null;
    } catch {
      saoriTicketId = null;
    }
  }

  const record = {
    id,
    createdAt: now.toISOString(),
    origin: 'web',
    nick: value.nick,
    modality: payload.modality,
    axes: payload.axes,
    channel: payload.channel,
    description: value.description,
    saoriTicketId
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');

  return {
    id,
    channel: payload.channel,
    axes: payload.axes,
    modality: payload.modality,
    saoriTicketId
  };
}
