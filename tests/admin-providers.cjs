'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('admin/index.html','utf8');
const source=fs.readFileSync('assets/admin-providers.js','utf8');
class Element{
 constructor(){this.hidden=false;this.disabled=false;this.textContent='';this.children=[];this.listeners={}}
 addEventListener(k,fn){this.listeners[k]=fn}
 replaceChildren(){this.children=[];this.textContent=''}
 append(...a){this.children.push(...a)}
}
async function run({token=true,failed=false}={}){
 const controls=new Map(),events={},requests=[];
 const elem=id=>{if(!controls.has(id))controls.set(id,new Element);return controls.get(id)};
 elem('panel').hidden=true;
 const dom={getElementById:elem,createElement:()=>new Element};
 vm.runInNewContext(source,{document:dom,window:{addEventListener:(k,f)=>events[k]=f},
  localStorage:{getItem:()=>token?JSON.stringify({access_token:'signed-in-user'}):null},
  AbortSignal,Date,console,fetch:async (url,opts)=>{
   requests.push({url,opts});
   return failed?Response.json({error:'service unavailable'},{status:503}):
    Response.json({configured:{
     openrouter:true,cerebras:false,cloudflare:false,tavily:true,exa:false,firecrawl:true,
     cloudflare_model:false,chat_enabled:false,research_enabled:false
    }});
  }
 });
 assert.equal(requests.length,0);
 events['yap-admin-ready']();
 for(let i=0;i<50;i++)await Promise.resolve();
 return {elem,requests};
}
(async()=>{
 assert(html.includes('id="providers"')&&html.includes('/assets/admin-providers.js'));
 let e=await run();assert.equal(e.requests.length,1);
 assert.equal(e.requests[0].opts.headers.authorization,'Bearer signed-in-user');
 assert.equal(e.elem('providers-grid').children.length,6);
 assert.match(e.elem('providers-grid').children[0].children[1].textContent,/detected/);
 assert.match(e.elem('providers-grid').children[1].children[1].textContent,/missing/);
 assert.match(e.elem('providers-flags').textContent,/Off/);
 assert(!e.elem('providers-grid').textContent.includes('signed-in-user'));
 e=await run({token:false});assert.equal(e.requests.length,0);assert.match(e.elem('providers-status').textContent,/Sign in/);
 e=await run({failed:true});assert.match(e.elem('providers-status').textContent,/service unavailable/);
 console.log('PASS admin provider status: gated request, six redacted indicators, flags and failure handling');
})().catch(e=>{console.error(e);process.exitCode=1});
