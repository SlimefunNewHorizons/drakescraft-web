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
  '/guia.html',
  '/guia-comandos.html',
  '/guia-plugins.html',
  '/guia-rangos.html',
  '/guia-slimefun.html',
  '/apoya.html',
  '/store.html',
  '/terms.html',
  '/privacidad.html',
  '/support.html',
  '/metricas.html',
  '/404.html',
  '/500.html',
];

// Rutas con redirects esperados
const EXPECTED_REDIRECTS = new Set([
  '/dioses.html',
  '/slimefun.html',
]);

let errors = [];
let passed = 0;

async function fetch(urlStr) {
  return new Promise((resolve, reject) => {
    const reqUrl = new url.URL(urlStr);
    const options = {
      hostname: reqUrl.hostname,
      port: reqUrl.port,
      path: reqUrl.pathname + reqUrl.search,
      method: 'GET',
      timeout: 5000,
    };

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
    if (htmlIssues.length > 0) {
      errors.push(`${route}: ${htmlIssues.join('; ')}`);
      return;
    }

    const ACCESSIBLE_KEYBOARD_ROUTES = [
      '/',
      '/index.html',
      '/guia.html',
      '/guia-comandos.html',
      '/guia-plugins.html',
      '/guia-rangos.html',
      '/guia-slimefun.html',
      '/apoya.html',
      '/store.html',
      '/terms.html',
      '/privacidad.html',
      '/support.html',
      '/metricas.html'
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

async function main() {
  console.log(`🔍 Smoke tests starting on ${BASE_URL}\n`);

  // Test main routes
  console.log('📄 Testing main routes:');
  for (const route of ROUTES) {
    await testRoute(route);
  }

  // Test internal links
  await testLinks();

  // Resumen
  console.log(`\n📊 Results: ${passed}/${ROUTES.length} routes passed`);

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
