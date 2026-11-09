import {storeCatalog as c} from '/tmp/claude-1000/w/web/catalog/store-catalog.js';
const ids=process.argv.slice(2);
for(const p of c.products){ if(ids.length&&!ids.some(i=>p.id.startsWith(i)))continue; console.log('##',p.id,'|',p.badge,'|',p.usd,'\n S:',p.summary,'\n I:',p.includes.join(' || '));}
