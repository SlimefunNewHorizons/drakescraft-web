import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const source = (name) => readFileSync(new URL(name, root), "utf8");
const pages = readdirSync(root).filter(
  (name) => name.endsWith(".html") && name !== "cultivation_rows.html",
);
const documentIds = (html) =>
  [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);

// These tests inspect source contracts, not browser layout. In particular, they
// prevent old global scripts or broken navigation from returning in an interior.
for (const name of pages) {
  test(`${name}: complete presentation and local references`, () => {
    const html = source(name);
    assert.match(html, /data-design="olympus-3d"/);
    assert.match(html, /vendor\/bootstrap\/bootstrap\.min\.css/);
    assert.match(html, /styles\/olympus\.css/);
    for (const tag of ["head", "body", "main"]) {
      assert.equal(
        [...html.matchAll(new RegExp(`<${tag}(?:\\s|>)`, "g"))].length,
        1,
        `${name}: one ${tag}`,
      );
    }
    const ids = documentIds(html);
    assert.equal(new Set(ids).size, ids.length, `${name}: duplicate IDs`);
    const scripts = [...html.matchAll(/<script\s+[^>]*src="([^"]+)"/g)].map(
      (match) => new URL(match[1], "https://preview.local/").pathname,
    );
    assert.equal(
      new Set(scripts).size,
      scripts.length,
      `${name}: duplicated script`,
    );
    assert.ok(
      !scripts.some((path) => /\/(site|navigation)\.js$/.test(path)),
      `${name}: obsolete navigation`,
    );

    for (const match of html.matchAll(/\b(src|href)="([^"]+)"/g)) {
      const url = new URL(match[2], `https://preview.local/${name}`);
      if (url.origin !== "https://preview.local") continue;
      const path = decodeURIComponent(url.pathname.slice(1)) || "index.html";
      if (path.startsWith("api/") || path.startsWith("packs/")) continue;
      if (path.includes(".")) {
        assert.ok(
          existsSync(new URL(path, root)),
          `${name}: missing ${match[2]}`,
        );
      }
      if (url.hash && pages.includes(path)) {
        assert.ok(
          documentIds(source(path)).includes(
            decodeURIComponent(url.hash.slice(1)),
          ),
          `${name}: missing anchor ${match[2]}`,
        );
      }
    }
  });
}

test("catalog, metrics and Atenea retain their required DOM contracts", () => {
  for (const [page, script] of [
    ["store.html", "scripts/store.js"],
    ["metricas.html", "scripts/metricas.js"],
    ["ojo-de-atenea.html", "scripts/ojo-de-atenea.js"],
  ]) {
    const ids = new Set(documentIds(source(page)));
    for (const match of source(script).matchAll(
      /getElementById\(["']([^"']+)["']\)/g,
    )) {
      assert.ok(
        ids.has(match[1]),
        `${page}: missing #${match[1]} required by ${script}`,
      );
    }
  }
});

test("store retains copy/status hooks and the existing checkout fields", () => {
  const store = source("store.html");
  assert.match(store, /id="server-ip"[^>]*data-copy-ip/);
  assert.match(store, /id="server-state"[^>]*data-live-label/);
  assert.match(store, /id="quote-form"/);
  for (const name of ["nick", "contact", "notes", "website"]) {
    assert.match(store, new RegExp(`name="${name}"`));
  }
  assert.match(store, /id="btn-submit-checkout"/);
  assert.doesNotMatch(source("index.html"), /store\.html\?category=/);
});

test("the hero has a bounded WebGL layer plus the original image fallback", () => {
  const home = source("index.html");
  assert.match(home, /<canvas[^>]*data-emblem/);
  assert.match(home, /class="op-stage__logo"/);
  assert.match(home, /scripts\/emblem\.js/);
  assert.match(
    source("styles/olympus.css"),
    /prefers-reduced-motion:\s*reduce/,
  );
});
