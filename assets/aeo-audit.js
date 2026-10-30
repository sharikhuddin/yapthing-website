'use strict';
(()=>{
const button=document.getElementById('aeo-run');if(!button)return;
const status=document.getElementById('aeo-status'),out=document.getElementById('aeo-results');
button.addEventListener('click',async()=>{
button.disabled=true;out.replaceChildren();status.textContent='Checking public pages…';
let passed=0,total=0;
function row(label,ok,detail){total++;if(ok)passed++;const p=document.createElement('p');p.textContent=(ok?'PASS: ':'FAIL: ')+label+' — '+detail;out.append(p)}
async function get(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text()}
try{
const xml=await get('/sitemap.xml'),doc=new DOMParser().parseFromString(xml,'application/xml');
if(doc.querySelector('parsererror'))throw Error('Invalid sitemap XML');
const urls=[...doc.getElementsByTagName('loc')].map(x=>x.textContent.trim());
row('Sitemap URLs',urls.length>0&&new Set(urls).size===urls.length,urls.length+' URLs; duplicate check');
for(const url of urls){try{
const u=new URL(url);if(u.origin!==location.origin)throw Error('Unexpected sitemap origin');
const html=await get(u.pathname),d=new DOMParser().parseFromString(html,'text/html');
row(u.pathname+' metadata',Boolean(d.title&&d.querySelector('meta[name="description"]')?.content&&d.querySelector('link[rel="canonical"]')?.href===url), 'title, description and matching canonical');
}catch(e){row(url,false,e.message)}}
for(const url of ['/','/product/','/faq/']){try{
const d=new DOMParser().parseFromString(await get(url),'text/html'),scripts=[...d.querySelectorAll('script[type="application/ld+json"]')];
const schemas=scripts.map(s=>JSON.parse(s.textContent));row(url+' structured data',schemas.length>0&&schemas.every(s=>s['@context']==='https://schema.org'),'JSON parse and schema context only; not rich-result validation');
}catch(e){row(url+' structured data',false,e.message)}}
const robots=await get('/robots.txt');row('Crawler configuration',robots.includes('Sitemap: https://yapthing.com/sitemap.xml')&&robots.includes('Disallow: /admin/'),'sitemap declaration and admin exclusion');
const discovery=await get('/llms.txt');row('AI discovery text',discovery.includes('https://yapthing.com/faq/'),'FAQ link present; optional discovery aid');
status.textContent=passed+' / '+total+' checks passed. Observed '+new Date().toISOString()+'. Results are not stored.';
}catch(e){status.textContent='Check incomplete: '+e.message}finally{button.disabled=false}
});
})();
