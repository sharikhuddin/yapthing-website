const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class El{constructor(){this.hidden=true;this.checked=true;this.children=[];this.listeners={};this.disabled=false;this.textContent=''}addEventListener(n,f){this.listeners[n]=f}replaceChildren(){this.children=[]}append(...e){this.children.push(...e)}click(){return this.listeners.click?.()}}
function env(file,fetch,parser){const els=new Map(),events={},timers=[];const el=id=>{if(!els.has(id))els.set(id,new El);return els.get(id)};
const document={hidden:false,getElementById:el,createElement:()=>new El,addEventListener:()=>{}};
vm.runInNewContext(fs.readFileSync(file,'utf8'),{document,window:{addEventListener:(n,f)=>events[n]=f},fetch,location:{origin:'https://yapthing.com'},AbortSignal,URL,Blob,Date,console,DOMParser:parser,setTimeout:()=>{},setInterval:f=>timers.push(f)});return{el,events,timers,document}}
const settle=async()=>{for(let i=0;i<40;i++)await Promise.resolve()};
(async()=>{
let requests=[];
const ops=env('assets/admin-operations.js',async u=>{requests.push(u);return{ok:true,json:async()=>({sha:'a'.repeat(40),commit:{message:'Test commit',committer:{date:'2026-10-30'}}})}});
assert.equal(requests.length,0);
ops.events['yap-admin-ready']();await settle();assert.equal(requests.length,1);assert.match(ops.el('code-state').textContent,/not proof/);
ops.events['yap-customer-summary']({detail:{total:12,new7:3,observedAt:new Date().toISOString()}});
assert.equal(ops.el('biz-accounts').textContent,'12');assert.equal(ops.el('biz-new').textContent,'3');
ops.events['yap-customer-error']();assert.equal(ops.el('biz-accounts').textContent,'Unavailable');
let fetched=[];
class Parser{parseFromString(s,type){if(type==='application/xml')return{querySelector:()=>null,getElementsByTagName:()=>[{textContent:'https://yapthing.com/'},{textContent:'https://attacker.invalid/'}]};
return{title:'YapThing',querySelector:q=>q.includes('description')?{content:'Description'}:{getAttribute:()=> 'https://yapthing.com/'},querySelectorAll:()=>[{textContent:'{"@context":"https://schema.org"}'}]}}}
const audit=env('assets/aeo-audit.js',async u=>{fetched.push(u);return{ok:true,text:async()=>u==='/robots.txt'?'Sitemap: https://yapthing.com/sitemap.xml Disallow: /admin/':u==='/llms.txt'?'https://yapthing.com/faq/':'fixture'}},Parser);
assert.equal(fetched.length,0);audit.events['yap-admin-ready']();await settle();
assert(fetched.length>0);assert(!fetched.some(u=>u.includes('attacker')));
assert.match(audit.el('aeo-status').textContent,/1 failed/);assert.equal(audit.el('aeo-export').disabled,false);assert.equal(audit.el('aeo-run').disabled,false);
const before=fetched.length;audit.events['yap-admin-ready']();await settle();assert.equal(fetched.length,before);
const failed=env('assets/aeo-audit.js',async()=>{throw Error('Network unavailable')},Parser);
failed.events['yap-admin-ready']();await settle();assert.match(failed.el('aeo-status').textContent,/Incomplete/);assert.equal(failed.el('aeo-run').disabled,false);
const html=fs.readFileSync('admin/index.html','utf8');assert(html.includes('id="panel" hidden'));assert(html.indexOf("if(!s.is_admin)")<html.indexOf("new Event('yap-admin-ready')"));assert(html.includes('noindex,nofollow'));
for(const source of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)])new vm.Script(source[1]);
console.log('PASS: admin gate, auto-start, duplicate-run prevention, account summaries, stale totals cleared, source/deployment distinction, cross-origin protection, failure/retry, export readiness, inline syntax.');
})().catch(e=>{console.error(e);process.exitCode=1});
