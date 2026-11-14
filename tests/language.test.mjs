import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

// Execute the shipped script in isolation; expose its private language entry
// points at the first IIFE boundary without changing the production interface.
function loadSite(file, { lang = 'es', choice, cookie = '', browser = 'en-US', path = '/guia.html' } = {}) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const nodes = [];
  const storage = new Map(choice ? [['drakes_lang_choice', choice]] : []);
  const cookieWrites = [];
  const location = { hostname: 'web.drakescraft.cl', pathname: path, reloads: 0, reload() { this.reloads++; } };
  const document = {
    documentElement: { lang }, readyState: 'loading',
    body: { appendChild(node) { nodes.push(node); } },
    createElement(tagName) { return { tagName, style: {}, setAttribute() {}, addEventListener() {} }; },
    getElementById(id) { return nodes.find(node => node.id === id); },
    querySelector() { return null; }, addEventListener() {},
    get cookie() { return cookie; },
    set cookie(value) { cookieWrites.push(value); cookie = value.split(';')[0]; },
  };
  const context = {
    document, navigator: { language: browser }, window: { location },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  };
  const boundary = /\r?\n\}\(\)\);/;
  assert.match(source, boundary);
  runInNewContext(source.replace(boundary, '\nglobalThis.language = { initBilingualSystem, resetGoogleTranslate, isEnglishSelected };\n}());'), context);
  return { ...context, nodes, storage, cookieWrites, location };
}

for (const file of ['scripts/site.js', 'web/scripts/site.js']) {
  for (const options of [{}, { choice: 'en', cookie: 'googtrans=/es/en' }, { choice: 'es' }, { lang: 'en-US' }]) {
    test(`${file}: native English stays native ${JSON.stringify(options)}`, () => {
      const site = loadSite(file, { lang: 'en', ...options });
      site.language.initBilingualSystem();
      assert.equal(site.document.documentElement.lang, options.lang || 'en');
      assert.equal(site.language.isEnglishSelected(), true);
      assert.equal(site.nodes.length, 0, 'no translation loader, container or banner');
      assert.deepEqual(site.cookieWrites, [], 'native English does not create a translation cookie');
    });
  }

  test(`${file}: Spanish page still offers English to an English browser`, () => {
    const site = loadSite(file);
    site.language.initBilingualSystem();
    assert.equal(site.document.documentElement.lang, 'es');
    assert.ok(site.nodes.some(node => node.id === 'dk-lang-banner'));
    assert.equal(site.cookieWrites.length, 0);
  });

  test(`${file}: Spanish browser receives no language banner`, () => {
    const site = loadSite(file, { browser: 'es-CL' });
    site.language.initBilingualSystem();
    assert.equal(site.document.documentElement.lang, 'es');
    assert.ok(!site.nodes.some(node => node.id === 'dk-lang-banner'));
  });

  for (const options of [{ choice: 'en' }, { cookie: 'googtrans=/es/en' }]) {
    test(`${file}: Spanish page preserves manual English ${JSON.stringify(options)}`, () => {
      const site = loadSite(file, options);
      site.language.initBilingualSystem();
      assert.equal(site.document.documentElement.lang, 'en');
      assert.ok(site.nodes.some(node => node.src?.includes('translate.google.com')));
      assert.ok(!site.nodes.some(node => node.id === 'dk-lang-banner'));
      assert.ok(site.document.cookie.includes('googtrans=/es/en'));
    });
  }

  for (const [path, target] of [['/guide-en.html', '/guia.html'], ['/events-en.html', '/eventos.html'], ['/index-en.html', '/'], ['/guia-slimefun-en.html', '/guia-slimefun.html']]) {
    test(`${file}: return from ${path} clears translation before navigation`, () => {
      const site = loadSite(file, { lang: 'en', path, choice: 'en', cookie: 'googtrans=/es/en' });
      site.language.resetGoogleTranslate();
      assert.equal(site.location.href, target);
      assert.equal(site.location.reloads, 0);
      assert.equal(site.storage.has('drakes_lang_choice'), false);
      assert.equal(site.cookieWrites.length, 2);
      assert.ok(site.cookieWrites.every(value => value.includes('expires=Thu, 01 Jan 1970')));
    });
  }

  test(`${file}: repeated init does not mistake translated Spanish for native English`, () => {
    const site = loadSite(file, { choice: 'en' });
    site.language.initBilingualSystem();
    site.language.initBilingualSystem();
    site.language.resetGoogleTranslate();
    assert.equal(site.location.reloads, 1);
    assert.equal(site.location.href, undefined);
  });

  test(`${file}: Spanish original resets translation with one reload`, () => {
    const site = loadSite(file, { choice: 'en', cookie: 'googtrans=/es/en' });
    site.language.initBilingualSystem();
    site.language.resetGoogleTranslate();
    assert.equal(site.location.reloads, 1);
    assert.equal(site.location.href, undefined);
    assert.equal(site.storage.has('drakes_lang_choice'), false);
  });
}
