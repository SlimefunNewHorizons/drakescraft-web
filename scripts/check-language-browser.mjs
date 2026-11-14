// Optional browser check: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-language-browser.mjs
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { createServer } from 'node:http';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(fileURLToPath(new URL('../', import.meta.url)), process.env.LANGUAGE_ROOT || '.');
const pages=process.env.LANGUAGE_ALL === '1'
 ? (await Promise.all((await readdir(root)).filter(name=>name.endsWith('.html')).sort().map(async name=>{
    const html=await readFile(resolve(root,name),'utf8');
    return /<html[^>]*lang=["']en\b/i.test(html)&&/<script[^>]*src=["'](?:\.\/)?scripts\/site\.js\b/i.test(html)?name:null;
   }))).filter(Boolean)
 : ['guia-slimefun-en.html'];
assert.ok(pages.length, 'at least one native English page must be checked');
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const path=resolve(root, '.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{const bytes=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;const results=[];let failures=0;
try{
 browser=await chromium.launch({headless:true});
 for(const width of [375,393,412]){
  for(const sourcePage of pages){
  const row={width,page:sourcePage};
  const context=await browser.newContext({viewport:{width,height:850},locale:'en-US',reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.origin!==base||route.request().resourceType()==='media'||(route.request().resourceType()==='script'&&!u.pathname.endsWith('/site.js')))return route.abort();
    return route.continue();
  });
  try{
  const page=await context.newPage();
  const response=await page.goto(base+'/'+sourcePage,{waitUntil:'domcontentloaded',timeout:15000});
  assert.equal(response.status(),200,'English page exists');
  await page.waitForFunction(()=>document.querySelector('#nav-lang-toggle'), null, {timeout:10000});
  let native=await page.evaluate(()=>({lang:document.documentElement.lang,banner:!!document.querySelector('#dk-lang-banner'),loader:!!document.querySelector('#google_translate_element'),subtitle:document.querySelector('.brand__meta span')?.textContent,toggle:document.querySelector('#nav-lang-toggle')?.textContent.trim()}));
  row.native=native;
  assert.equal(native.lang,'en');assert.equal(native.banner,false);assert.equal(native.loader,false);assert.equal(native.toggle.replace('🌐','').trim(),'ES');
  // The legacy web/ mirror has Spanish navigation; this check covers language state only.
  if(!process.env.LANGUAGE_ROOT)assert.equal(native.subtitle,'Season 2 · Purpur 26.2');
  await page.evaluate(()=>{localStorage.setItem('drakes_lang_choice','en');document.cookie='googtrans=/es/en; path=/;';});
  // Mobile navigation is collapsed: open it through the actual control before clicking.
  await page.locator('#nav-toggle').click();
  const target=sourcePage==='guide-en.html'?'guia.html':sourcePage==='events-en.html'?'eventos.html':sourcePage==='vote-en.html'?'votar.html':sourcePage==='index-en.html'?'':sourcePage.replace(/-en\.html$/,'.html');
  const [navigation]=await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:15000}),page.locator('#nav-lang-toggle').click()]);
  row.target=new URL(page.url()).pathname;
  row.status=navigation?.status();
  assert.equal(row.status,200,'Spanish destination exists');
  assert.equal(page.url(),base+'/'+target,'ES button uses the Spanish counterpart');
  await page.waitForLoadState('domcontentloaded');
  const spanish=await page.evaluate(()=>({lang:document.documentElement.lang,choice:localStorage.getItem('drakes_lang_choice'),cookie:document.cookie,banner:!!document.querySelector('#dk-lang-banner')}));
  row.returnToSpanish=spanish;
  assert.equal(spanish.lang,'es');assert.equal(spanish.choice,null);assert.ok(!spanish.cookie.includes('googtrans=/es/en'));
  if(sourcePage==='guia-slimefun-en.html')assert.equal(spanish.banner,false); // Spanish guide uses portal.js.
  }catch(error){row.failure=error.message;failures++;}
  finally{
  results.push(row);
  await writeFile(process.env.LANGUAGE_REPORT || '/tmp/drakescraft-language-browser.json',JSON.stringify({scope:'local HTML and shipped site.js; external scripts blocked; language behavior only',complete:results.length===pages.length*3,failures,results},null,2)+'\n');
  await context.close();
  }
  if(failures>=2)break;
  }
  if(failures>=2)break;
 }
 console.log(JSON.stringify({passed:results.length-failures,failures,attempted:results.length,expected:pages.length*3,widths:[...new Set(results.map(r=>r.width))]}));
 if(failures)process.exitCode=1;
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
