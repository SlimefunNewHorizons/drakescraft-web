import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOffers, validateCalendar, pickCartOffer, liveGifts, discountedUsd, santiagoIso } from '../lib/offers.js';
import { storeStatus } from '../lib/store-schedule.js';
import { couponBody, syncOffers } from '../lib/offers-sync.js';

const offers = loadOffers();
const get = (id) => offers.find((o) => o.id === id);
const day = (iso) => iso.slice(0, 10);

test('calendario valido y sin solapes de carrito', () => {
  assert.ok(offers.length > 10);
  assert.deepEqual(validateCalendar(offers), []);
});

test('Black Friday = primera semana completa lun-dom de noviembre', () => {
  assert.equal(day(get('bf-2027').start), '2027-11-01'); // 1-nov-2027 es lunes
  assert.equal(day(get('bf-2027').end), '2027-11-07');
  assert.equal(day(get('bf-2028').start), '2028-11-06'); // 1-nov-2028 es miercoles
  assert.equal(day(get('bf-2028').end), '2028-11-12');
  for (const id of ['bf-2027', 'bf-2028']) {
    assert.equal(new Date(day(get(id).start)).getUTCDay(), 1);
    assert.equal(new Date(day(get(id).end)).getUTCDay(), 0);
  }
  assert.equal(get('bf-2026'), undefined); // terminaria antes de la apertura (18-nov-2026)
});

test('cumpleanos del dueno el 29-nov con regalo 100 % limitado', () => {
  for (const y of [2026, 2027, 2028]) {
    assert.equal(day(get(`cumple-${y}`).start), `${y}-11-29`);
    const g = get(`cumple-${y}-regalo`);
    assert.equal(g.kind, 'gift');
    assert.equal(g.discount.value, 100);
    assert.equal(g.limits.perCustomer, 1);
    assert.ok(g.limits.total > 0);
  }
});

test('offset horario de Santiago (verano -03, invierno -04)', () => {
  assert.ok(santiagoIso(2027, 1, 10).endsWith('-03:00'));
  assert.ok(santiagoIso(2027, 7, 10).endsWith('-04:00'));
});

test('prioridad: una sola oferta de carrito a la vez', () => {
  const t = new Date('2027-11-03T12:00:00-03:00');
  assert.equal(pickCartOffer(offers, t).id, 'bf-2027');
  assert.equal(pickCartOffer(offers, new Date('2027-11-10T12:00:00-03:00')), null);
  assert.equal(liveGifts(offers, new Date('2027-11-29T12:00:00-03:00')).length, 1);
});

test('descuento redondea como Tebex (3.99 con 15 % = 3.39)', () => {
  assert.equal(discountedUsd(3.99, { discount: { type: 'percentage', value: 15 } }), 3.39);
});

test('tienda cerrada antes de la fecha y abierta despues (fecha inyectada)', () => {
  const env = { STORE_OPENS_AT: '2026-11-18T00:00:00-03:00' };
  assert.equal(storeStatus(new Date('2026-11-17T23:59:59-03:00'), { env }).open, false);
  assert.equal(storeStatus(new Date('2026-11-18T00:00:00-03:00'), { env }).open, true);
  assert.equal(storeStatus(new Date('2030-01-01T00:00:00Z'), { env: {}, file: '/nonexistent' }).open, true);
});

test('planificador idempotente: crea una vez, borra vencidos, no toca ajenos', async () => {
  const created = []; const deleted = [];
  let coupons = [
    { id: 1, code: 'DRK-OLD-2020', note: 'auto-oferta old-2020' },
    { id: 2, code: 'MANUAL', note: 'jack' }
  ];
  const api = {
    listCoupons: async () => coupons,
    createCoupon: async (b) => { created.push(b); coupons = [...coupons, { id: 9, code: b.code, note: b.note }]; },
    deleteCoupon: async (id) => { deleted.push(id); coupons = coupons.filter((c) => c.id !== id); }
  };
  const products = [{ id: 'hercules', category: 'monthly', usd: 4.99, tebexPackageId: 7510343, sellable: true }];
  const state = new Map();
  const now = new Date('2027-11-03T12:00:00-03:00');
  await syncOffers({ offers, products, api, state, now });
  await syncOffers({ offers, products, api, state, now });
  assert.equal(created.length, 1);
  assert.equal(created[0].code, 'DRK-BF-2027');
  assert.equal(created[0].discount_percentage, 25);
  assert.deepEqual(deleted, [1]);
  assert.equal(state.get('bf-2027').status, 'ok');
  assert.ok(coupons.some((c) => c.code === 'MANUAL'));
  // fuera de oferta: se borra y no se crea nada
  await syncOffers({ offers, products, api, state, now: new Date('2027-11-10T12:00:00-03:00') });
  assert.deepEqual(deleted, [1, 9]);
  assert.equal(created.length, 1);
});

test('fallo de Tebex no rompe y deja la oferta sin aplicar', async () => {
  const api = { listCoupons: async () => [], createCoupon: async () => { throw new Error('boom'); }, deleteCoupon: async () => {} };
  const state = new Map();
  await syncOffers({ offers, products: [{ id: 'hercules', category: 'monthly', usd: 4.99, tebexPackageId: 1, sellable: true }], api, state, now: new Date('2027-11-03T12:00:00-03:00'), log: () => {} });
  assert.equal(state.get('bf-2027').status, 'error');
});

test('cupon de regalo: 100 %, un paquete, limite total', () => {
  const g = get('cumple-2026-regalo');
  const b = couponBody(g, [{ id: 'homes-pack-5', category: 'utility', usd: 2, tebexPackageId: 7697425, sellable: true }]);
  assert.deepEqual(b.packages, [7697425]);
  assert.equal(b.discount_percentage, 100);
  assert.equal(b.redeem_unlimited, false);
  assert.equal(b.expire_limit, g.limits.total);
});
