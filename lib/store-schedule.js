import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scheduleFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'catalog', 'store-schedule.json');
const TZ = 'America/Santiago';

// Fecha de apertura: STORE_OPENS_AT (env) > catalog/store-schedule.json > sin cierre.
export function storeOpensAt({ env = process.env, file = scheduleFile } = {}) {
  let raw = env.STORE_OPENS_AT;
  if (!raw) {
    try { raw = JSON.parse(fsSync.readFileSync(file, 'utf8')).opensAt; } catch { raw = null; }
  }
  const ms = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) ? new Date(ms) : null;
}

// Se evalua en cada llamada: la tienda abre sola al llegar la fecha, sin redeploy.
export function storeStatus(now = new Date(), opts) {
  const opensAt = storeOpensAt(opts);
  const open = !opensAt || now.getTime() >= opensAt.getTime();
  return { open, opensAt: opensAt ? opensAt.toISOString() : null, msUntilOpen: open || !opensAt ? 0 : opensAt.getTime() - now.getTime() };
}

export function closedMessage(opensAtIso, lang = 'es') {
  if (!opensAtIso) return '';
  const d = new Date(opensAtIso);
  const text = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-CL', { timeZone: TZ, day: 'numeric', month: 'long' }).format(d);
  return lang === 'en' ? `The store opens on ${text}` : `La tienda abre el ${text.replace(/^(\d+) de /, '$1 de ')}`;
}
