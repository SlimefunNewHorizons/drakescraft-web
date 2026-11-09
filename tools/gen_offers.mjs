// Genera catalog/offers.json (calendario 2026-2028). Reproducible: `node tools/gen_offers.mjs`.
// Reglas, no fechas a mano. Se descartan ofertas que terminan antes de la apertura de la tienda.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { santiagoIso, validateCalendar } from '../lib/offers.js';
import { storeOpensAt } from '../lib/store-schedule.js';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'catalog', 'offers.json');
const YEARS = [2026, 2027, 2028];
const GIFT_PRODUCT = 'homes-pack-5'; // utilidad pequena, sin ventaja competitiva ni de staff
const GIFT_TOTAL = 100;

const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=dom
const addDays = (y, m, d, n) => { const t = new Date(Date.UTC(y, m - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
const firstMonday = (y, m) => { for (let d = 1; d <= 7; d++) if (dow(y, m, d) === 1) return d; };
const span = ([y1, m1, d1], [y2, m2, d2]) => ({ start: santiagoIso(y1, m1, d1), end: santiagoIso(y2, m2, d2, 23, 59, 59) });

function discount(id, name, description, pct, range, banner, extra = {}) {
  return {
    id, kind: 'discount', name, description,
    discount: { type: 'percentage', value: pct }, ...range,
    scope: { type: 'cart', ids: [], excludeIds: [] }, minimum: 0, limits: { total: 0, perCustomer: 0 },
    banner, active: true, priority: 10, ...extra
  };
}
const b = (es, en, accent) => ({ es, en, accent });

const offers = [];
for (const y of YEARS) {
  if (y >= 2027) {
    offers.push(discount(`clases-${y}`,
      { es: 'Regreso a clases', en: 'Back to school' },
      { es: '15 % en toda la tienda para empezar el año escolar.', en: '15% off the whole store to start the school year.' },
      15, span([y, 3, 1], [y, 3, 7]), b('Regreso a clases: 15 % de descuento', 'Back to school: 15% off', 'cyan')));
    const jm = firstMonday(y, 7);
    offers.push(discount(`invierno-${y}`,
      { es: 'Vacaciones de invierno', en: 'Winter break' },
      { es: '15 % en toda la tienda durante una semana de vacaciones.', en: '15% off the whole store for a week of winter break.' },
      15, span([y, 7, jm], addDays(y, 7, jm, 6)), b('Vacaciones de invierno: 15 % de descuento', 'Winter break: 15% off', 'cyan')));
    offers.push(discount(`patrias-${y}`,
      { es: 'Fiestas Patrias', en: 'Chilean National Holidays' },
      { es: '15 % en toda la tienda del 17 al 19 de septiembre.', en: '15% off the whole store, September 17-19.' },
      15, span([y, 9, 17], [y, 9, 19]), b('Fiestas Patrias: 15 % de descuento', 'National Holidays: 15% off', 'rose')));
    const bf = firstMonday(y, 11); // primera semana completa (lunes a domingo) de noviembre
    offers.push(discount(`bf-${y}`,
      { es: 'Black Friday (semana completa)', en: 'Black Friday (full week)' },
      { es: '25 % en toda la tienda, de lunes a domingo, la primera semana completa de noviembre.', en: '25% off the whole store, Monday to Sunday, first full week of November.' },
      25, span([y, 11, bf], addDays(y, 11, bf, 6)), b('Black Friday: 25 % de descuento toda la semana', 'Black Friday: 25% off all week', 'gold'), { priority: 20 }));
  }
  const cumpleRange = span([y, 11, 29], [y, 11, 29]);
  offers.push(discount(`cumple-${y}`,
    { es: 'Cumpleaños del dueño', en: "Owner's birthday" },
    { es: '15 % en toda la tienda el 29 de noviembre, cumpleaños de JackStar.', en: "15% off the whole store on November 29, JackStar's birthday." },
    15, cumpleRange, b('Cumpleaños de JackStar: 15 % de descuento hoy', "JackStar's birthday: 15% off today", 'violet'), { priority: 15 }));
  offers.push({
    id: `cumple-${y}-regalo`, kind: 'gift',
    name: { es: 'Regalo de cumpleaños', en: 'Birthday gift' },
    description: {
      es: 'Un Pack +5 Homes gratis por jugador el 29 de noviembre: agrégalo al carrito con tu nick y el regalo se aplica solo.',
      en: 'One free +5 Homes Pack per player on November 29: add it to your cart with your nick and the gift applies automatically.'
    },
    discount: { type: 'percentage', value: 100 }, ...cumpleRange,
    scope: { type: 'package', ids: [GIFT_PRODUCT], excludeIds: [] }, minimum: 0,
    limits: { total: GIFT_TOTAL, perCustomer: 1 },
    banner: b('Regalo de cumpleaños: Pack +5 Homes gratis (1 por jugador)', 'Birthday gift: free +5 Homes Pack (1 per player)', 'violet'),
    active: true, priority: 0, giftProductId: GIFT_PRODUCT
  });
  const nr = addDays(y, 12, 19, 0);
  offers.push(discount(`navidad-${y}`,
    { es: 'Navidad', en: 'Christmas' },
    { es: '15 % en toda la tienda del 19 al 26 de diciembre.', en: '15% off the whole store, December 19-26.' },
    15, span(nr, [y, 12, 26]), b('Navidad: 15 % de descuento', 'Christmas: 15% off', 'cyan')));
  offers.push(discount(`ano-nuevo-${y}`,
    { es: 'Año Nuevo', en: 'New Year' },
    { es: '15 % en toda la tienda del 28 de diciembre al 2 de enero.', en: '15% off the whole store, December 28 to January 2.' },
    15, span([y, 12, 28], [y + 1, 1, 2]), b('Año Nuevo: 15 % de descuento', 'New Year: 15% off', 'gold')));
}

const opens = storeOpensAt();
const kept = offers.filter((o) => !opens || Date.parse(o.end) > opens.getTime()).sort((a, c) => Date.parse(a.start) - Date.parse(c.start));
const errors = validateCalendar(kept);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
fs.writeFileSync(out, `${JSON.stringify({ version: 1, timezone: 'America/Santiago', generatedBy: 'tools/gen_offers.mjs', offers: kept }, null, 2)}\n`);
console.log(`${kept.length} ofertas -> catalog/offers.json`);
for (const o of kept) console.log(o.id.padEnd(22), o.kind.padEnd(8), o.start, '->', o.end);
