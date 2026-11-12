// Recolector de reportes de error del launcher DrakeStar.
//
// El launcher envia (solo si el jugador no lo desactivo) un .zip con los registros recientes ya sin datos personales
// (rutas, correos, IPs y tokens tachados en el cliente). Aqui solo se valida, se limita la frecuencia y se guarda en
// `<DATA_DIR>/launcher-reports/`. No se guarda la IP ni ningun identificador salvo el ID anonimo del equipo.
import fs from 'node:fs/promises';
import path from 'node:path';

export const REPORT_MAX_BYTES = 6 * 1024 * 1024;
const HOUR_MS = 60 * 60 * 1000;
const PER_HOUR = 6;
const MAX_FILES = 2000;
const KEEP_DAYS = 30;
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export const isZip = (body) => Buffer.isBuffer(body) && body.length >= 22 && body.subarray(0, 4).equals(ZIP_MAGIC);
export const cleanDevice = (value) => (/^[0-9a-f]{8,64}$/i.test(String(value || '')) ? String(value).toLowerCase() : 'anon');
export const cleanVersion = (value) => (/^[0-9A-Za-z.+-]{1,24}$/.test(String(value || '')) ? String(value) : 'x');

// Limite por clave (IP): devuelve false cuando se pasa de `perHour` en la ultima hora.
export function createLimiter(perHour = PER_HOUR, now = () => Date.now()) {
  const buckets = new Map();
  return (key) => {
    const t = now();
    const hits = (buckets.get(key) || []).filter((x) => t - x < HOUR_MS);
    if (hits.length >= perHour) {
      buckets.set(key, hits);
      return false;
    }
    hits.push(t);
    buckets.set(key, hits);
    if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((x) => t - x < HOUR_MS)) buckets.delete(k);
    return true;
  };
}

export async function saveReport(dir, body, { device, version }, when = new Date()) {
  await fs.mkdir(dir, { recursive: true });
  const stamp = when.toISOString().replace(/[:.]/g, '-');
  const name = `${stamp}_${device.slice(0, 12)}_v${version}.zip`;
  await fs.writeFile(path.join(dir, name), body, { flag: 'wx', mode: 0o640 });
  await prune(dir);
  return name;
}

// Conserva 30 dias y, como maximo, los 2000 reportes mas recientes.
export async function prune(dir, now = Date.now()) {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.zip')).sort();
  const doomed = new Set(files.slice(0, Math.max(0, files.length - MAX_FILES)));
  for (const f of files) {
    const st = await fs.stat(path.join(dir, f)).catch(() => null);
    if (st && now - st.mtimeMs > KEEP_DAYS * 24 * HOUR_MS) doomed.add(f);
  }
  for (const f of doomed) await fs.rm(path.join(dir, f), { force: true });
  return doomed.size;
}
