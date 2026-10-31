#!/usr/bin/env node

/**
 * Smoke tests: validar rutas HTTP, HTML válido y enlaces internos
 * Ejecutar: PORT=8080 node scripts/smoke-tests.js
 */

import http from 'http';
import url from 'url';

const PORT = process.env.PORT || 8081;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Rutas principales a probar
const ROUTES = [
  '/',
  '/index.html',
  '/index-en.html',
  '/guia.html',
  '/guide-en.html',
  '/guia-comandos.html',
  '/guia-comandos-en.html',
  '/guia-plugins.html',
  '/guia-rangos.html',
  '/guia-slimefun.html',
  '/apoya.html',
  '/apoya-en.html',
  '/store.html',
  '/store-en.html',
  '/terms.html',
  '/terms-en.html',
  '/privacidad.html',
  '/privacidad-en.html',
  '/support.html',
  '/support-en.html',
  '/metricas.html',
  '/metricas-en.html',
  '/404.html',
  '/404-en.html',
  '/500.html',
  '/500-en.html',
  '/maintenance.html',
];

// Rutas con redirects esperados
const EXPECTED_REDIRECTS = new Set([
  '/dioses.html',
  '/slimefun.html',
]);

let errors = [];
let passed = 0;

async function fetch(urlStr, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const reqUrl = new url.URL(urlStr);
    const options = {
      hostname: reqUrl.hostname,
      port: reqUrl.port,
      path: reqUrl.pathname + reqUrl.search,
      method,
      headers: { ...headers },
      timeout: 5000,
    };
    if (body) {
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

function validateHtml(html) {
  const issues = [];

  // Validar DOCTYPE
  if (!html.trim().toLowerCase().startsWith('<!doctype html')) {
    issues.push('Missing or invalid DOCTYPE');
  }

  // Validar que tenga <title>
  if (!html.match(/<title[^>]*>/i)) {
    issues.push('Missing <title> tag');
  }

  // Validar que no esté vacío
  if (html.trim().length < 100) {
    issues.push('HTML too short (< 100 chars)');
  }

  // Validar estructura básica
  if (!html.match(/<html/i) || !html.match(/<\/html>/i)) {
    issues.push('Missing <html> tags');
  }

  return issues;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let href = match[1];
    // Ignorar links externos, anchors y especiales
    if (!href.startsWith('http') && !href.startsWith('//') && !href.startsWith('mailto:') && !href.startsWith('#')) {
      // Resolver ruta relativa
      try {
        const absolute = new url.URL(href, baseUrl).pathname;
        if (!links.includes(absolute)) {
          links.push(absolute);
        }
      } catch (e) {
        // Ignorar URLs malformadas
      }
    }
  }
  return links;
}

async function testRoute(route) {
  try {
    const response = await fetch(`${BASE_URL}${route}`);

    // Validar status code
    if (EXPECTED_REDIRECTS.has(route)) {
      // Se espera un redirect (301/302)
      if (response.status >= 300 && response.status < 400) {
        passed++;
        console.log(`✓ ${route} (redirect ${response.status})`);
        return;
      }
    }

    if (response.status !== 200) {
      errors.push(`${route}: HTTP ${response.status}`);
      return;
    }

    // Validar HTML
    const htmlIssues = validateHtml(response.body);
    if (route === '/metricas-en.html' && (!response.body.includes('<html lang="en">') || !response.body.includes('Live Telemetry') || !response.body.includes('Players online today'))) {
      errors.push(`${route}: missing English language metadata or translated metrics content`);
      return;
    }
    if (route === '/500-en.html' && (!response.body.includes('<html lang="en">') || !response.body.includes('Scheduled'))) {
      errors.push(`${route}: missing English language metadata or translated content`);
      return;
    }
    if (route === '/support-en.html' && (!response.body.includes('<html lang="en">') || !response.body.includes('Support &amp;') || !response.body.includes('Security Protocol'))) {
      errors.push(`${route}: missing English language metadata or translated content`);
      return;
    }
    if (route === '/privacidad-en.html' && (!response.body.includes('<html lang="en">') || !response.body.includes('Privacy &amp; Cookies Policy') || !response.body.includes('Merchant of Record'))) {
      errors.push(`${route}: missing English language metadata or translated content`);
      return;
    }
    if (route === '/404-en.html' && (!response.body.includes('<html lang="en">') || !response.body.includes('Dimension Not Found'))) {
      errors.push(`${route}: missing English language metadata or translated content`);
      return;
    }
    if (htmlIssues.length > 0) {
      errors.push(`${route}: ${htmlIssues.join('; ')}`);
      return;
    }

    const ACCESSIBLE_KEYBOARD_ROUTES = [
      '/',
      '/index.html',
      '/guia.html',
      '/guide-en.html',
      '/guia-comandos.html',
      '/guia-comandos-en.html',
      '/guia-plugins.html',
      '/guia-rangos.html',
      '/guia-slimefun.html',
      '/apoya.html',
      '/store.html',
      '/terms.html',
      '/privacidad.html',
      '/privacidad-en.html',
      '/support.html',
      '/support-en.html',
      '/metricas.html',
      '/metricas-en.html',
      '/404.html',
      '/404-en.html',
      '/500.html',
      '/500-en.html',
      '/maintenance.html'
    ];

    if (ACCESSIBLE_KEYBOARD_ROUTES.includes(route) &&
        (!response.body.includes('class="skip-link" href="#main-content"') ||
         !response.body.includes('<main id="main-content"'))) {
      errors.push(`${route}: missing keyboard skip link or main-content target`);
      return;
    }

    passed++;
    console.log(`✓ ${route}`);
  } catch (err) {
    errors.push(`${route}: ${err.message}`);
  }
}

async function testLinks() {
  console.log('\n📋 Testing internal links...');
  const allLinks = new Set();

  // Recopilar todos los links de todas las rutas
  for (const route of ROUTES) {
    try {
      const response = await fetch(`${BASE_URL}${route}`);
      if (response.status === 200) {
        const links = extractLinks(response.body, `${BASE_URL}${route}`);
        links.forEach((link) => allLinks.add(link));
      }
    } catch (e) {
      // Ignorar errores en extracción
    }
  }

  // Probar que los links internos existan
  let linksPassed = 0;
  for (const link of allLinks) {
    try {
      const response = await fetch(`${BASE_URL}${link}`);
      if (response.status === 200) {
        linksPassed++;
      } else {
        errors.push(`Link broken: ${link} (HTTP ${response.status})`);
      }
    } catch (err) {
      errors.push(`Link error: ${link} - ${err.message}`);
    }
  }

  console.log(`✓ ${linksPassed}/${allLinks.size} internal links valid`);
}

async function testStoreApi() {
  console.log('\n🛒 Testing Store & Checkout API...');

  // 1. GET /api/store catalog
  try {
    const res = await fetch(`${BASE_URL}/api/store`);
    if (res.status !== 200) {
      errors.push(`/api/store: HTTP ${res.status}`);
    } else {
      const data = JSON.parse(res.body);
      if (!Array.isArray(data.products) || data.products.length < 50) {
        errors.push(`/api/store: expected at least 50 products, got ${data.products?.length}`);
      } else {
        passed++;
        console.log(`✓ /api/store (${data.products.length} products verified)`);
      }
    }
  } catch (err) {
    errors.push(`/api/store: ${err.message}`);
  }

  // 2. POST /api/store/tebex/checkout validation: empty items
  try {
    const res = await fetch(`${BASE_URL}/api/store/tebex/checkout`, {
      method: 'POST',
      headers: { 'cf-connecting-ip': '127.0.1.1' },
      body: JSON.stringify({})
    });
    if (res.status !== 400) {
      errors.push(`/api/store/tebex/checkout empty: expected HTTP 400, got ${res.status}`);
    } else {
      const data = JSON.parse(res.body);
      if (data.error !== 'Selecciona al menos un producto.') {
        errors.push(`/api/store/tebex/checkout empty: unexpected error message "${data.error}"`);
      } else {
        passed++;
        console.log('✓ /api/store/tebex/checkout validates empty items');
      }
    }
  } catch (err) {
    errors.push(`/api/store/tebex/checkout empty: ${err.message}`);
  }

  // 3. POST /api/store/tebex/checkout validation: invalid nick
  try {
    const res = await fetch(`${BASE_URL}/api/store/tebex/checkout`, {
      method: 'POST',
      headers: { 'cf-connecting-ip': '127.0.1.2' },
      body: JSON.stringify({ items: ['hercules'], nick: '!' })
    });
    if (res.status !== 400) {
      errors.push(`/api/store/tebex/checkout invalid nick: expected HTTP 400, got ${res.status}`);
    } else {
      const data = JSON.parse(res.body);
      if (!data.error || !data.error.includes('Escribe un nick válido')) {
        errors.push(`/api/store/tebex/checkout invalid nick: unexpected error message "${data.error}"`);
      } else {
        passed++;
        console.log('✓ /api/store/tebex/checkout validates Minecraft username regex');
      }
    }
  } catch (err) {
    errors.push(`/api/store/tebex/checkout invalid nick: ${err.message}`);
  }

  // 4. POST /api/store/tebex/checkout validation: honeypot bot trap
  try {
    const res = await fetch(`${BASE_URL}/api/store/tebex/checkout`, {
      method: 'POST',
      headers: { 'cf-connecting-ip': '127.0.1.3' },
      body: JSON.stringify({ items: ['hercules'], nick: 'JackPlayer', website: 'spam.org' })
    });
    if (res.status !== 204) {
      errors.push(`/api/store/tebex/checkout honeypot: expected HTTP 204, got ${res.status}`);
    } else {
      passed++;
      console.log('✓ /api/store/tebex/checkout blocks bots via honeypot (HTTP 204)');
    }
  } catch (err) {
    errors.push(`/api/store/tebex/checkout honeypot: ${err.message}`);
  }

  // 5. POST /api/store/tebex/checkout rate-limit protection (5 attempts allowed, 6th blocked)
  try {
    const rateLimitIp = '127.0.1.99';
    let lastStatus = 0;
    let lastBody = '';
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${BASE_URL}/api/store/tebex/checkout`, {
        method: 'POST',
        headers: { 'cf-connecting-ip': rateLimitIp },
        body: JSON.stringify({})
      });
      lastStatus = res.status;
      lastBody = res.body;
    }
    if (lastStatus !== 429) {
      errors.push(`/api/store/tebex/checkout rate-limit: expected HTTP 429, got ${lastStatus}`);
    } else {
      const data = JSON.parse(lastBody);
      if (!data.error || !data.error.includes('Demasiados intentos')) {
        errors.push(`/api/store/tebex/checkout rate-limit: unexpected error "${data.error}"`);
      } else {
        passed++;
        console.log('✓ /api/store/tebex/checkout rate-limit activates (HTTP 429 Retry-After)');
      }
    }
  } catch (err) {
    errors.push(`/api/store/tebex/checkout rate-limit: ${err.message}`);
  }

  // 6. POST /api/store/checkout (legacy payment retired)
  try {
    const res = await fetch(`${BASE_URL}/api/store/checkout`, {
      method: 'POST',
      body: JSON.stringify({ items: ['hercules'], nick: 'JackPlayer' })
    });
    if (res.status !== 410) {
      errors.push(`/api/store/checkout legacy: expected HTTP 410, got ${res.status}`);
    } else {
      passed++;
      console.log('✓ /api/store/checkout legacy gateway retired (HTTP 410 Gone)');
    }
  } catch (err) {
    errors.push(`/api/store/checkout legacy: ${err.message}`);
  }

  // 7. POST /api/store/paypal/checkout (legacy payment retired)
  try {
    const res = await fetch(`${BASE_URL}/api/store/paypal/checkout`, {
      method: 'POST',
      body: JSON.stringify({ items: ['hercules'], nick: 'JackPlayer' })
    });
    if (res.status !== 410) {
      errors.push(`/api/store/paypal/checkout legacy: expected HTTP 410, got ${res.status}`);
    } else {
      passed++;
      console.log('✓ /api/store/paypal/checkout legacy gateway retired (HTTP 410 Gone)');
    }
  } catch (err) {
    errors.push(`/api/store/paypal/checkout legacy: ${err.message}`);
  }
}

async function main() {
  console.log(`🔍 Smoke tests starting on ${BASE_URL}\n`);

  // Test main routes
  console.log('📄 Testing main routes:');
  for (const route of ROUTES) {
    await testRoute(route);
  }

  // Test internal links
  await testLinks();

  // Test Store & Checkout API
  await testStoreApi();

  // Resumen
  console.log(`\n📊 Results: ${passed} checks passed`);

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} error(s) found:\n`);
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
