'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));
const manifest=JSON.parse(fs.readFileSync('search-manifest.json','utf8')),xml=fs.readFileSync('sitemap.xml','utf8');
const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size,urls.length);assert.equal(urls.length,manifest.pages.length);
const titles=new Set(),descriptions=new Set(),broken=[];
for(const p of manifest.pages){
const h=fs.readFileSync(p.file,'utf8');assert.equal(crypto.createHash('sha256').update(h).digest('hex'),p.sha256,p.file+' hash');
const title=h.match(/<title>(.*?)<\/title>/s)?.[1],desc=h.match(/<meta name="description" content="([^"]*)"/)?.[1];
assert(title&&desc,p.file+' title/description');assert(!titles.has(title),'Duplicate title '+title);assert(!descriptions.has(desc),'Duplicate description '+desc);titles.add(title);descriptions.add(desc);
assert.equal((h.match(/rel="canonical"/g)||[]).length,1);assert(h.includes('href="'+p.url+'"'));assert(h.includes('content="index,follow,max-image-preview:large"'));
for(const name of ['og:title','og:description','og:image','og:url'])assert(h.includes('property="'+name+'"'),p.file+' '+name);
const data=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));assert.equal(data.length,1);
const graph=data[0]['@graph'];assert(graph.some(n=>n['@type']==='Organization'));assert(graph.some(n=>n['@type']==='WebSite'));assert(graph.some(n=>n['@type']==='BreadcrumbList'));
for(const n of graph){assert(!n.aggregateRating,'No fabricated aggregate ratings');assert(!n.review,'No fabricated reviews')}
const visible=h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
for(const m of visible.matchAll(/(?:href|src)="([^"]+)"/g)){const raw=m[1];if(/^(mailto:|tel:|data:|javascript:|#)/.test(raw))continue;const u=new URL(raw,p.url);if(u.origin!==manifest.origin)continue;let f=decodeURIComponent(u.pathname).slice(1);if(!f||f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))broken.push(p.file+' -> '+u.pathname)}
assert(/^\d{4}-\d{2}-\d{2}$/.test(p.lastmod));assert(urls.includes(p.url));assert(!p.url.includes('/admin/'));
}
assert.deepEqual(broken,[],'Broken local public-page links');
const faq=fs.readFileSync('faq/index.html','utf8'),data=JSON.parse(faq.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const q of data['@graph'].find(n=>n['@type']==='FAQPage').mainEntity){assert(faq.includes(q.name));assert(faq.includes(q.acceptedAnswer.text))}
const config=JSON.parse(fs.readFileSync('indexnow.json','utf8')),keyPath=new URL(config.keyLocation).pathname.slice(1),key=fs.readFileSync(keyPath,'utf8').trim();assert(/^[a-f0-9]{32}$/.test(key));assert.equal(keyPath,key+'.txt');
console.log('PASS: '+urls.length+' public pages: unique metadata, social previews, canonical URLs, schema graphs, local links, sitemap dates, content hashes, FAQ parity and IndexNow key format.');
