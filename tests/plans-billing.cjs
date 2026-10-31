'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('plans/index.html','utf8');
const js=fs.readFileSync('assets/plans-billing.js','utf8');
class Element{
 constructor(dataset={}){this.dataset=dataset;this.disabled=false;this.textContent='';this.listeners={};}
 addEventListener(k,f){this.listeners[k]=f;}
 click(){return this.listeners.click?.();}
}
async function run({plan='plus',token='u_token',checkoutFails=false}={}){
 const elems=new Map(),plans=[new Element({plan:'plus'}),new Element({plan:'pro'})],
 packs=[new Element({pack:'starter'}),new Element({pack:'boost'}),new Element({pack:'power'})];
 const pick=id=>{if(!elems.has(id))elems.set(id,new Element);return elems.get(id)};
 const assigned=[],requests=[];
 const document={getElementById:pick,querySelector:q=>q==='[data-plan="pro"]'?plans[1]:null,
  querySelectorAll:q=>q==='[data-plan]'?plans:q==='[data-pack]'?packs:q.includes('[data-plan],[data-pack]')?[...plans,...packs]:[]};
 const authFetch=async(url,options={})=>{
  requests.push({url,options});
  if(url.includes('yap-plan-status'))return {ok:true,json:async()=>({plan,status:'active'})};
  if(url.includes('yap-quota-status'))return {ok:true,json:async()=>({prepaid:{credits:125}})};
  if(checkoutFails)return {ok:false,json:async()=>({error:'Secure checkout not configured'})};
  return {ok:true,json:async()=>({url:'https://checkout.stripe.com/c/pay/session_test'})};
 };
 const loc={search:'',assign:u=>assigned.push(u)};
 vm.runInNewContext(js,{
  document,window:{YapSession:{authFetch},location:loc},
  localStorage:{getItem:()=>token?JSON.stringify({access_token:token}):null},
  location:loc,URL,URLSearchParams,Date,Number,console
 });
 for(let n=0;n<40;n++)await Promise.resolve();
 return {plans,packs,pick,assigned,requests};
}
(async()=>{
 assert(html.includes('$7.99')&&html.includes('$12.99')&&html.includes('id="topups"'));
 assert(html.includes('data-pack="starter"')&&html.includes('data-pack="power"'));
 assert(html.includes('plans-billing.js'));
 let s=await run();assert.match(s.pick('credit-balance').textContent,/125/);
 assert.match(s.plans[1].textContent,/Upgrade Plus to Pro/);
 s.plans[1].click();for(let i=0;i<25;i++)await Promise.resolve();
 let p=s.requests.find(x=>x.url.includes('stripe-checkout'));assert(p);assert.equal(JSON.parse(p.options.body).action,'upgrade');
 assert.equal(s.assigned.length,1);
 s=await run({plan:'free'});s.packs[1].click();for(let i=0;i<25;i++)await Promise.resolve();
 p=s.requests.find(x=>x.url.includes('stripe-checkout'));assert.equal(JSON.parse(p.options.body).pack,'boost');
 assert.equal(JSON.parse(p.options.body).action,'topup');
 s=await run({checkoutFails:true});s.packs[0].click();for(let i=0;i<25;i++)await Promise.resolve();
 assert.equal(s.assigned.length,0);assert.match(s.pick('billing-feedback').textContent,/not configured/);
 s=await run({token:''});s.packs[0].click();for(let i=0;i<25;i++)await Promise.resolve();
 assert.equal(s.assigned.length,0);assert.match(s.pick('billing-feedback').textContent,/sign in/i);
 console.log('PASS plans UI: Plus upgrade, top-ups, prepaid status, blocked checkout, sign-in required, correct new prices');
})().catch(e=>{console.error(e);process.exitCode=1});
