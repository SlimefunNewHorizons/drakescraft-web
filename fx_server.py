f='/tmp/claude-1000/w/web/server.js'; s=open(f,encoding='utf8').read()
block = r'''// --- Tipos de cambio de referencia (el cobro real es siempre en USD) ---
// El cliente solo habla con /fx-rates.json; las APIs publicas se consultan aqui, con cache.
const FX_CODES = ['CLP', 'ARS', 'MXN', 'COP', 'PEN', 'UYU', 'BOB', 'BRL', 'EUR', 'GBP', 'CAD'];
const FX_TTL_MS = 12 * 60 * 60 * 1000;
const FX_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const FX_SOURCES = [
  { url: 'https://open.er-api.com/v6/latest/USD', pick: (j) => (j?.result === 'success' ? j.rates : null) },
  { url: 'https://api.frankfurter.dev/v1/latest?base=USD', pick: (j) => j?.rates }
];
const fxFile = path.join(dataDir, 'fx-rates.json');
let fxCache = null;
let fxInflight = null;

function cleanFxRates(raw) {
  const rates = {};
  for (const code of FX_CODES) {
    const value = Number(raw?.[code]);
    if (Number.isFinite(value) && value > 0 && value < 1e7) rates[code] = value;
  }
  return Object.keys(rates).length ? rates : null;
}

async function fetchFxRates() {
  for (const source of FX_SOURCES) {
    try {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) continue;
      const rates = cleanFxRates(source.pick(await response.json()));
      if (rates) return { rates, updated: new Date().toISOString(), source: new URL(source.url).host };
    } catch (error) {
      app.log.warn({ err: error.message, source: source.url }, 'fx source failed');
    }
  }
  return null;
}

async function getFxRates() {
  const now = Date.now();
  if (!fxCache) {
    try { fxCache = JSON.parse(await fs.readFile(fxFile, 'utf8')); } catch { fxCache = { fetchedAt: 0 }; }
  }
  if (fxCache.rates && now - fxCache.fetchedAt < FX_TTL_MS) return fxCache;
  fxInflight ||= (async () => {
    const fresh = await fetchFxRates();
    if (fresh) {
      fxCache = { ...fresh, fetchedAt: Date.now() };
      try {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(fxFile, JSON.stringify(fxCache), 'utf8');
      } catch { /* cache en disco opcional */ }
    } else if (!fxCache.rates) {
      fxCache = { fetchedAt: Date.now() - FX_TTL_MS + 5 * 60 * 1000 };
    } else {
      fxCache = { ...fxCache, fetchedAt: Date.now() - FX_TTL_MS + 30 * 60 * 1000 };
    }
    return fxCache;
  })().finally(() => { fxInflight = null; });
  return fxInflight;
}

app.get('/fx-rates.json', async (_request, reply) => {
  reply.header('Cache-Control', 'public, max-age=600');
  let data = null;
  try { data = await getFxRates(); } catch { data = null; }
  const usable = data?.rates && data.updated && now_ok(data.updated);
  if (!usable) return { available: false, base: 'USD', rates: null };
  return { available: true, base: 'USD', updated: data.updated, rates: data.rates };
});

function now_ok(updated) {
  const t = Date.parse(updated);
  return Number.isFinite(t) && Date.now() - t < FX_MAX_STALE_MS;
}

'''
marker="app.get('/api/store', async () => {"
assert marker in s
s=s.replace(marker, block+marker,1)
a="const unavailableTebexProductIds = new Set();"
assert a in s
s=s.replace(a,"const unavailableTebexProductIds = new Set(['protection-481']);",1)
s=s.replace("// protection-481 fue verificada contra el alias vipzeus de ProtectionStones.","// protection-481 fue verificada contra el alias vipzeus de ProtectionStones y se mantiene fuera de venta\n// (el rango Zeus ya la entrega). Si reaparece en Tebex, no se puede comprar desde la web.",1)
open(f,'w',encoding='utf8').write(s)
