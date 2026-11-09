import { offerCode, offerProducts, liveOffers, TZ } from './offers.js';

const PLUGIN = 'https://plugin.tebex.io';
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const addDays = (iso, n) => ymd(new Date(Date.parse(iso) + n * 86400000));

// Cliente minimo de la Plugin API de Tebex (cupones). El secreto nunca se registra.
export function pluginApi(secret, fetchImpl = fetch) {
  async function call(pathname, { method = 'GET', body } = {}) {
    const res = await fetchImpl(`${PLUGIN}${pathname}`, {
      method,
      headers: { 'X-Tebex-Secret': secret, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    if (!res.ok) throw new Error(`Tebex plugin ${method} ${pathname} -> ${res.status} ${typeof json === 'string' ? json.slice(0, 200) : JSON.stringify(json).slice(0, 300)}`);
    return json;
  }
  return {
    info: () => call('/information'),
    async listCoupons() {
      const out = [];
      for (let page = 1; page <= 20; page++) {
        const r = await call(`/coupons?page=${page}`);
        out.push(...(r?.data || []));
        if (!r?.pagination || page >= (r.pagination.lastPage || 1)) break;
      }
      return out;
    },
    createCoupon: (body) => call('/coupons', { method: 'POST', body }),
    deleteCoupon: (id) => call(`/coupons/${id}`, { method: 'DELETE' })
  };
}

export function couponBody(offer, products) {
  const pkgs = offerProducts(offer, products).map((p) => p.tebexPackageId).filter(Boolean);
  const d = offer.discount;
  const total = offer.limits?.total || 0;
  return {
    code: offerCode(offer),
    effective_on: 'package',
    packages: pkgs,
    discount_type: d.type === 'value' ? 'value' : 'percentage',
    discount_amount: d.type === 'value' ? d.value : 0,
    ...(d.type === 'value' ? {} : { discount_percentage: d.value }),
    redeem_unlimited: !total,
    expire_never: false,
    expire_limit: total || 0,
    start_date: addDays(offer.start, -1),
    expire_date: addDays(offer.end, 1),
    basket_type: 'single',
    minimum: offer.minimum || 0,
    discount_application_method: 0,
    note: `auto-oferta ${offer.id}`
  };
}

const isAuto = (c) => String(c.code || '').startsWith('DRK-') && (c.note == null || String(c.note).startsWith('auto-oferta'));

// Idempotente. Solo crea cupones de ofertas vivas del calendario; borra los DRK-* auto-generados
// que ya no corresponden a una oferta viva. Si listar falla, no toca nada.
export async function syncOffers({ offers, products, api, state, now = new Date(), log = () => {} }) {
  let existing;
  try {
    existing = await api.listCoupons();
  } catch (err) {
    log('warn', `ofertas: no se pudo listar cupones: ${err.message}`);
    for (const o of liveOffers(offers, now)) if (!state.has(o.id)) state.set(o.id, { status: 'error', error: 'list' });
    return;
  }
  const live = liveOffers(offers, now);
  const wanted = new Map(live.map((o) => [offerCode(o), o]));
  for (const o of live) {
    const code = offerCode(o);
    const found = existing.find((c) => c.code === code);
    if (found) { state.set(o.id, { status: 'ok', code, tebexId: found.id }); continue; }
    try {
      const body = couponBody(o, products);
      if (!body.packages.length) throw new Error('sin paquetes elegibles');
      await api.createCoupon(body);
      const after = (await api.listCoupons()).find((c) => c.code === code);
      if (!after) throw new Error('cupon creado pero no aparece en GET /coupons');
      state.set(o.id, { status: 'ok', code, tebexId: after.id });
      log('info', `ofertas: cupon ${code} creado`);
    } catch (err) {
      state.set(o.id, { status: 'error', error: err.message.slice(0, 300) });
      log('error', `ofertas: fallo al crear ${code}: ${err.message}`);
    }
  }
  for (const id of [...state.keys()]) if (!live.some((o) => o.id === id)) state.delete(id);
  for (const c of existing) {
    if (!isAuto(c) || wanted.has(c.code)) continue;
    try { await api.deleteCoupon(c.id); log('info', `ofertas: cupon ${c.code} borrado (fuera de calendario o vencido)`); }
    catch (err) { log('error', `ofertas: no se pudo borrar ${c.code}: ${err.message}`); }
  }
}
