import {storeCatalog as c} from '/tmp/claude-1000/w/web/catalog/store-catalog.js';
for(const p of c.products.filter(p=>['monthly','titans'].includes(p.category))){
 const t=p.includes.join(' | ');
 const g=(r)=>{const m=t.match(r);return m?m[1]:'?'};
 console.log(p.name.padEnd(14),p.usd,'pv',g(/(\d+) B[óo]vedas/i),'prot',g(/(\d{3,4}x\d{3,4})/),'homes',g(/(\d+) homes/),'tiendas',g(/(\d+) tiendas/),'fly',/\/fly/.test(t),'isla',g(/Isla de (\d+)/));
}
