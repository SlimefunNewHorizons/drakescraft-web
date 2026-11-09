// Prueba real minima contra Tebex (NO paga nada): crea cupones TEST-*, los aplica a un basket
// y verifica el total; al final borra los cupones y confirma que no queda ninguno.
// Uso (necesita TEBEX_PLUGIN_SECRET, TEBEX_PUBLIC_TOKEN, TEBEX_PRIVATE_KEY):
//   docker exec drakescraft-web node scripts/offers-live-test.mjs
import { pluginApi } from '../lib/offers-sync.js';
import { discountedUsd } from '../lib/offers.js';

const { TEBEX_PLUGIN_SECRET: secret, TEBEX_PUBLIC_TOKEN: pub, TEBEX_PRIVATE_KEY: priv } = process.env;
if (!secret || !pub || !priv) { console.error('faltan credenciales Tebex en el entorno'); process.exit(2); }
const api = pluginApi(secret);
const auth = `Basic ${Buffer.from(`${pub}:${priv}`).toString('base64')}`;
const head = async (path, method = 'GET', body) => {
  const r = await fetch(`https://headless.tebex.io${path}`, { method, headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};
const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
const today = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const tag = Math.random().toString(36).slice(2, 7).toUpperCase();
const PROT = 7510370; // protection-177
const HOMES = 7697425; // homes-pack-5
const made = [];
const mk = async (code, packages, pct) => {
  await api.createCoupon({ code, effective_on: 'package', packages, discount_type: 'percentage', discount_amount: 0, discount_percentage: pct, redeem_unlimited: true, expire_never: false, expire_limit: 0, start_date: today, expire_date: tomorrow, basket_type: 'single', minimum: 0, discount_application_method: 0, note: 'auto-oferta-test' });
  const c = (await api.listCoupons()).find((x) => x.code === code);
  if (!c) throw new Error(`cupon ${code} no aparece en GET /coupons`);
  made.push(c.id);
  return c;
};
let ok = true;
const check = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) ok = false; };
try {
  const info = await api.info();
  check(!!info?.account, 'GET /information responde');
  const c15 = await mk(`TEST-${tag}-15`, [PROT], 15);
  console.log('  campos devueltos por GET /coupons:', Object.keys(c15).join(','));
  const basket = await head(`/api/accounts/${pub}/baskets`, 'POST', { username: 'JugadorDrakes', complete_url: 'https://web.drakescraft.cl/store.html', cancel_url: 'https://web.drakescraft.cl/store.html' });
  const ident = basket.data.ident;
  let b = await head(`/api/baskets/${ident}/packages`, 'POST', { package_id: PROT, quantity: 1 });
  const list = Number(b.data.total_price);
  await head(`/api/accounts/${pub}/baskets/${ident}/coupons`, 'POST', { coupon_code: c15.code });
  b = await head(`/api/accounts/${pub}/baskets/${ident}`);
  const got = Number(b.data.total_price);
  const want = discountedUsd(list, { discount: { type: 'percentage', value: 15 } });
  check(got === want, `15 % sobre ${list}: Tebex ${got} == web ${want}`);

  // Dos cupones a la vez (descuento de carrito + regalo 100 %) sobre un basket con ambos paquetes.
  const gift = await mk(`TEST-${tag}-G`, [HOMES], 100);
  const cart = await mk(`TEST-${tag}-C`, [PROT, HOMES], 15);
  const b2 = (await head(`/api/accounts/${pub}/baskets`, 'POST', { username: 'JugadorDrakes', complete_url: 'https://web.drakescraft.cl/store.html', cancel_url: 'https://web.drakescraft.cl/store.html' })).data.ident;
  await head(`/api/baskets/${b2}/packages`, 'POST', { package_id: PROT, quantity: 1 });
  let bb = await head(`/api/baskets/${b2}/packages`, 'POST', { package_id: HOMES, quantity: 1 });
  const listBoth = Number(bb.data.total_price);
  const prices = Object.fromEntries(bb.data.packages.map((p) => [p.id, Number(p.in_basket?.price ?? p.base_price)]));
  await head(`/api/accounts/${pub}/baskets/${b2}/coupons`, 'POST', { coupon_code: cart.code });
  await head(`/api/accounts/${pub}/baskets/${b2}/coupons`, 'POST', { coupon_code: gift.code });
  bb = await head(`/api/accounts/${pub}/baskets/${b2}`);
  const wantBoth = discountedUsd(prices[PROT] ?? 0, { discount: { type: 'percentage', value: 15 } });
  check(Number(bb.data.total_price) === wantBoth, `carrito + regalo: Tebex ${bb.data.total_price} == esperado ${wantBoth} (lista ${listBoth})`);
} catch (e) {
  ok = false; console.error('✗ error:', e.message);
} finally {
  for (const id of made) { try { await api.deleteCoupon(id); } catch (e) { console.error('no se pudo borrar', id, e.message); ok = false; } }
  const left = (await api.listCoupons()).filter((c) => String(c.code).startsWith('TEST-'));
  check(left.length === 0, `no quedan cupones TEST-* (${left.length})`);
}
process.exit(ok ? 0 : 1);
