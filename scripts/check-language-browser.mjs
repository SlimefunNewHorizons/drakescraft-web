// Optional browser check: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-language-browser.mjs
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const server=createServer(async(req,res)=>{
  const path=resolve(root, '.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{const bytes=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;const results=[];
try{
 browser=await chromium.launch({headless:true});
 for(const width of [375,393,412]){
  const context=await browser.newContext({viewport:{width,height:850},locale:'en-US',reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.origin!==base||route.request().resourceType()==='media'||(route.request().resourceType()==='script'&&!u.pathname.endsWith('/site.js')))return route.abort();
    return route.continue();
  });
  const page=await context.newPage();
  await page.goto(base+'/guia-slimefun-en.html',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>document.querySelector('#nav-lang-toggle'), null, {timeout:10000});
  let native=await page.evaluate(()=>({lang:document.documentElement.lang,banner:!!document.querySelector('#dk-lang-banner'),loader:!!document.querySelector('#google_translate_element'),subtitle:document.querySelector('.brand__meta span')?.textContent,toggle:document.querySelector('#nav-lang-toggle')?.textContent.trim()}));
  assert.equal(native.lang,'en');assert.equal(native.banner,false);assert.equal(native.loader,false);assert.equal(native.toggle,'ES');assert.equal(native.subtitle,'Season 2 · Purpur 26.2');
  await page.evaluate(()=>{localStorage.setItem('drakes_lang_choice','en');document.cookie='googtrans=/es/en; path=/;';});
  // Mobile navigation is collapsed: open it through the actual control before clicking.
  await page.locator('#nav-toggle').click();
  await Promise.all([page.waitForURL(base+'/guia-slimefun.html'),page.locator('#nav-lang-toggle').click()]);
  await page.waitForLoadState('domcontentloaded');
  const spanish=await page.evaluate(()=>({lang:document.documentElement.lang,choice:localStorage.getItem('drakes_lang_choice'),cookie:document.cookie,banner:!!document.querySelector('#dk-lang-banner')}));
  assert.equal(spanish.lang,'es');assert.equal(spanish.choice,null);assert.ok(!spanish.cookie.includes('googtrans=/es/en'));assert.equal(spanish.banner,false); // The current Spanish guide uses portal.js, not site.js.
  results.push({width,native,returnToSpanish:spanish});
  await context.close();
 }
 await writeFile(process.env.LANGUAGE_REPORT || '/tmp/drakescraft-language-browser.json',JSON.stringify({scope:'local HTML and shipped site.js; external scripts blocked; language behavior only',results},null,2)+'\n');
 console.log(JSON.stringify({passed:results.length,widths:results.map(r=>r.width)}));
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
