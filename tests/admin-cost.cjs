'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/admin-cost.js','utf8');
const html=fs.readFileSync('admin/index.html','utf8');
class Element {
 constructor(){this.hidden=false;this.disabled=false;this.value='';this.max='';this.listeners={};this.children=[];this.style={};this.textContent='';}
 addEventListener(type,fn){this.listeners[type]=fn;}
 replaceChildren(){this.children=[];this.textContent='';}
 append(...children){this.children.push(...children);}
}
function setup({savedToken=true,fail=false}={}){
 const events={},calls=[],els=new Map();
 const el=id=>{if(!els.has(id))els.set(id,new Element);return els.get(id)};
 el('panel').hidden=true;
 const mock={month:new Date().toISOString().slice(0,7),observed_at:'2026-10-31T15:00:00Z',first_tracked_at:'2026-10-31T12:00:00Z',
  requests:3,priced_requests:2,partial_requests:1,unpriced_requests:0,estimated_usd:0.0095,average_usd:0.00316667,
  by_feature:[{feature:'web_search',requests:1,estimated_usd:0.005,incomplete:0},{feature:'cloud_chat',requests:2,estimated_usd:0.0045,incomplete:1}],
  by_model:[{provider:'google',model:'gemini-3.5-flash-lite',requests:2,estimated_usd:0.0045,incomplete:1}],
  by_day:[{day:'2026-10-31',requests:3,estimated_usd:0.0095}],
  top_accounts:[{user_id:'12345678-aaaa-bbbb-cccc-123456789012',plan:'pro',requests:3,estimated_usd:0.0095}],
  pricing_version:'2026-10-31-list',note:'Estimate only'};
 const window={addEventListener:(type,cb)=>events[type]=cb};
 const document={getElementById:el,createElement:()=>new Element()};
 const localStorage={getItem:()=>savedToken?JSON.stringify({access_token:'secret-session'}):'null'};
 vm.runInNewContext(source,{document,window,localStorage,fetch:async(url,options)=>{
  calls.push({url,options});
  if(fail)return Response.json({error:'Unable to load'},{status:503});
  return Response.json(mock);
 },AbortSignal,Response,Date,Number,Math,console,encodeURIComponent});
 return {events,calls,el,mock};
}
const tick=async()=>{for(let i=0;i<75;i++)await Promise.resolve()};
(async()=>{
 assert(html.includes('id="ai-costs"')&&html.includes('id="cost-status"')&&html.includes('assets/admin-cost.js'));
 const c=setup();assert.equal(c.calls.length,0,'No admin-ready event means no request');
 c.events['yap-admin-ready']();await tick();assert.equal(c.calls.length,1);
 assert.equal(c.calls[0].options.headers.authorization,'Bearer secret-session');
 assert.equal(c.el('cost-requests').textContent,'3');
 assert.match(c.el('cost-total').textContent,/\$/);
 assert.match(c.el('cost-status').textContent,/Tracking began/);
 assert.equal(c.el('cost-features').children.length,2);
 assert.equal(c.el('cost-accounts').children.length,1);
 assert.equal(c.el('cost-daily').children.length,1);
 assert.equal(c.el('cost-disclaimer').textContent,'Estimate only Price snapshot 2026-10-31-list.');
 c.events['yap-admin-ready']();await tick();assert.equal(c.calls.length,1,'Repeated ready must not duplicate fetch');
 const noToken=setup({savedToken:false});noToken.events['yap-admin-ready']();await tick();
 assert.equal(noToken.calls.length,0);assert.match(noToken.el('cost-status').textContent,/Sign in/);
 const bad=setup({fail:true});bad.events['yap-admin-ready']();await tick();
 assert.match(bad.el('cost-status').textContent,/unavailable/);assert.equal(bad.el('cost-total').textContent,'');
 console.log('PASS cost dashboard: admin readiness, authenticated request, accurate display, trend chart, no-token and failure handling');
})().catch(e=>{console.error(e);process.exitCode=1});
