import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const offersFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'catalog', 'offers.json');
export const TZ = 'America/Santiago';

export function loadOffers(file = offersFile) {
  try {
    const data = JSON.parse(fsSync.readFileSync(file, 'utf8'));
    return (Array.isArray(data.offers) ? data.offers : []).filter((o) => o && o.id && o.start && o.end);
  } catch {
    return [];
  }
}

export const offerCode = (offer) => `DRK-${String(offer.id).toUpperCase()}`;
const ms = (iso) => Date.parse(iso);
export const isLive = (offer, now = new Date()) =>
  offer.active !== false && now.getTime() >= ms(offer.start) && now.getTime() < ms(offer.end);

export const liveOffers = (offers, now = new Date()) => offers.filter((o) => isLive(o, now));

// Regla de prioridad: una sola oferta de carrito ('discount') a la vez; gana la de mayor
// `priority` y, a igualdad, el mayor descuento. Los regalos ('gift') son independientes.
export function pickCartOffer(offers, now = new Date()) {
  const live = liveOffers(offers, now).filter((o) => o.kind === 'discount');
  live.sort((a, b) => (b.priority || 0) - (a.priority || 0) || (b.discount?.value || 0) - (a.discount?.value || 0));
  return live[0] || null;
}
export const liveGifts = (offers, now = new Date()) => liveOffers(offers, now).filter((o) => o.kind === 'gift');

// Productos que cubre una oferta. `products` = [{ id, category, usd, tebexPackageId, sellable }].
export function offerProducts(offer, products) {
  const sellable = products.filter((p) => p.sellable && Number.isFinite(p.usd));
  const ids = new Set(offer.scope?.ids || []);
  const excluded = new Set(offer.scope?.excludeIds || []);
  let list;
  if (offer.scope?.type === 'package') list = sellable.filter((p) => ids.has(p.id));
  else if (offer.scope?.type === 'category') list = sellable.filter((p) => ids.has(p.category));
  else list = sellable;
  return list.filter((p) => !excluded.has(p.id));
}

const cents = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
// Mismo redondeo que Tebex: 3.99 con 15 % -> 3.39.
export function discountedUsd(usd, offer) {
  const d = offer.discount || {};
  if (d.type === 'value') return Math.max(0, cents(usd - d.value));
  return Math.max(0, cents(usd * (1 - d.value / 100)));
}

export function priceFor(product, { cartOffer, giftOffers = [], claimedGiftIds = new Set(), products }) {
  for (const g of giftOffers) {
    if (!claimedGiftIds.has(g.id) && offerProducts(g, products).some((p) => p.id === product.id)) {
      return { usd: 0, offerId: g.id, kind: 'gift' };
    }
  }
  if (cartOffer && offerProducts(cartOffer, products).some((p) => p.id === product.id)) {
    return { usd: discountedUsd(product.usd, cartOffer), offerId: cartOffer.id, kind: 'discount' };
  }
  return null;
}

// Vista publica: sin codigos de cupon ni datos internos.
export function publicOffer(offer, state) {
  return {
    id: offer.id, kind: offer.kind, name: offer.name, description: offer.description,
    banner: offer.banner, discount: offer.discount, start: offer.start, end: offer.end,
    scope: { type: offer.scope?.type, ids: offer.scope?.ids || [] },
    minimum: offer.minimum || 0, limits: offer.limits || {},
    applied: state?.status === 'ok'
  };
}

export function validateCalendar(offers) {
  const errors = [];
  const seen = new Set();
  for (const o of offers) {
    if (seen.has(o.id)) errors.push(`id duplicado ${o.id}`);
    seen.add(o.id);
    if (!(ms(o.start) < ms(o.end))) errors.push(`${o.id}: start >= end`);
    if (!['discount', 'gift'].includes(o.kind)) errors.push(`${o.id}: kind invalido`);
    if (!o.name?.es || !o.name?.en) errors.push(`${o.id}: falta nombre es/en`);
    const v = o.discount?.value;
    if (!(v > 0) || (o.discount?.type === 'percentage' && v > 100)) errors.push(`${o.id}: descuento invalido`);
    if (o.kind === 'gift' && (o.discount?.value !== 100 || o.scope?.type !== 'package' || !o.limits?.perCustomer)) {
      errors.push(`${o.id}: un regalo debe ser 100 % sobre un paquete con perCustomer`);
    }
  }
  const carts = offers.filter((o) => o.kind === 'discount' && o.active !== false).sort((a, b) => ms(a.start) - ms(b.start));
  for (let i = 1; i < carts.length; i++) {
    if (ms(carts[i].start) < ms(carts[i - 1].end)) errors.push(`solape de ofertas de carrito: ${carts[i - 1].id} / ${carts[i].id}`);
  }
  return errors;
}

// Hora de pared de Santiago -> ISO con el offset (-03:00 / -04:00) correcto para esa fecha.
function tzOffsetMin(utcMs) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(utcMs / 1000) * 1000) / 60000);
}
export function santiagoIso(y, m, d, h = 0, mi = 0, s = 0) {
  const wall = Date.UTC(y, m - 1, d, h, mi, s);
  let off = tzOffsetMin(wall);
  off = tzOffsetMin(wall - off * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  const w = new Date(wall);
  const sign = off <= 0 ? '-' : '+';
  const a = Math.abs(off);
  return `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(w.getUTCDate())}T${pad(w.getUTCHours())}:${pad(w.getUTCMinutes())}:${pad(w.getUTCSeconds())}${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}
