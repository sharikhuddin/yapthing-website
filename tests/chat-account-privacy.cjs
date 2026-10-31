'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const uidA='11111111-1111-4111-8111-111111111111';
const uidB='22222222-2222-4222-8222-222222222222';
const legacy=[{id:'old-unscoped',messages:[{role:'user',text:'Private legacy conversation'}]}];
const store=new Map([['yapthing.web.preview.v1',JSON.stringify(legacy)]]);
const localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),
 clear:()=>store.clear()
};
class Element {
 constructor(){this.value='';this.hidden=false;this.textContent='';this.children=[];this.listeners={};
  this.classList={add(){},remove(){},contains(){return false;},toggle(){}};this.style={};this.dataset={};this.scrollTop=0;this.scrollHeight=0;this.open=false;}
 replaceChildren(...a){this.children=[...a]} append(...a){this.children.push(...a)}
 prepend(...a){this.children.unshift(...a)}
 setAttribute(k,v){this[k]=v}removeAttribute(k){delete this[k]}
 addEventListener(k,f){this.listeners[k]=f}
 querySelector(){return new Element()}querySelectorAll(){return []}
 focus(){}click(){}requestSubmit(){}
}
const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,new Element);return nodes.get(id)};
const document={
 documentElement:{dataset:{}},
 getElementById:el,
 createElement:()=>new Element(),
 createTextNode:s=>({textContent:s}),
 querySelectorAll:()=>[],
 querySelector:()=>new Element(),
 addEventListener:()=>{}
};
const listeners=new Map(),requests=[];
let sess=null;
const fire=(name,detail)=>{
 const ev={type:name,detail};
 for(const f of listeners.get(name)||[])f(ev);
};
const window={
 navigator:{},navigator:undefined,
 YapSession:{
  get:()=>sess,
  set:s=>{sess=s;fire('yap:session-change')},
  token:async()=>'test-token',
  authFetch:async(url,options)=>{requests.push({url,options});return {
   ok:true,json:async()=>url.includes('yap-quota-status')?
    {features:{cloud_chat:{remaining:20,limit:20}}}:[]
  }}
 },
 addEventListener:(k,f)=>listeners.set(k,[...(listeners.get(k)||[]),f]),
 dispatchEvent:e=>fire(e.type,e.detail)
};
const env={window,document,localStorage,fetch:async()=>({ok:true}),Event:class Event{constructor(type){this.type=type}},
 CustomEvent:class CustomEvent{constructor(type,opts){this.type=type;this.detail=opts?.detail}},
 Blob,URL,Date,performance,crypto:webcrypto,
 navigator:{userAgent:'Node.js',platform:'',maxTouchPoints:0},
 setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},
 requestAnimationFrame:fn=>fn(),confirm:()=>true,
 console:{warn:()=>{},error:()=>{},log:()=>{}}
};
vm.runInNewContext(fs.readFileSync('chat/chat.js','utf8'),env,{filename:'chat.js'});
vm.runInNewContext(fs.readFileSync('chat/account-sync.js','utf8'),env,{filename:'account-sync.js'});
(async()=>{
 assert.equal(window.YapWebChat.owner(),null);
 assert.equal(window.YapWebChat.listChats().length,0,'guest must not see legacy private chats');
 assert.equal(el('history').children.length,0,'guest sidebar must be empty');
 assert.equal(el('mobile-history').children.length,0,'guest mobile sidebar must be empty');
 assert.equal(el('cloud-load').hidden,true,'legacy import requires login');
 window.YapSession.set({access_token:'token-a',user:{id:uidA,email:'a@example.com'}});
 assert.equal(window.YapWebChat.owner(),uidA);
 assert.equal(window.YapWebChat.listChats().length,0,'new account must not automatically import browser history');
 assert.equal(el('cloud-load').hidden,false,'explicit old history import may be offered');
 window.YapWebChat.add('A account private message','user');
 assert.equal(window.YapWebChat.snapshot().length,1);
 assert(store.has('yapthing.web.chats.v2.'+uidA),'A account history must have a scoped key');
 assert.equal(store.get('yapthing.web.preview.v1'),JSON.stringify(legacy),'guest legacy remains untouched');
 el('account-signout').onclick();
 assert.equal(window.YapWebChat.owner(),null);
 assert.equal(window.YapWebChat.listChats().length,0,'logout must hide account A history immediately');
 assert.equal(el('history').children.length,0,'logout clears sidebar');
 assert.equal(el('mobile-history').children.length,0,'logout clears mobile sidebar');
 assert.equal(el('prompt').value,'','logout clears composer');
 window.YapSession.set({access_token:'token-b',user:{id:uidB,email:'b@example.com'}});
 assert.equal(window.YapWebChat.owner(),uidB);
 assert.equal(window.YapWebChat.listChats().length,0,'B cannot see A browser conversations');
 assert.equal(window.YapWebChat.snapshot().length,0);
 window.YapWebChat.add('B unique message','user');
 assert(!JSON.stringify(window.YapWebChat.listChats()).includes('A account'));
 assert(!store.get('yapthing.web.chats.v2.'+uidA).includes('B unique'));
 window.YapSession.set({access_token:'token-a',user:{id:uidA,email:'a@example.com'}});
 assert.equal(window.YapWebChat.listChats().length,1,'A should regain own history');
 assert.equal(window.YapWebChat.snapshot()[0].messages[0].text,'A account private message');
 assert.equal(window.YapWebChat.importLegacy(),1,'manual legacy import must work');
 assert.equal(window.YapWebChat.snapshot().length,2);
 assert(!JSON.stringify(window.YapWebChat.snapshot()).includes('B unique message'));
 window.YapChatCloud={deleteThread:async()=>true};
 const toDelete=window.YapWebChat.listChats()[0].id;
 assert.equal(await window.YapWebChat.deleteChat(toDelete),true);
 assert(!window.YapWebChat.listChats().some(c=>c.id===toDelete),'deleted chat is removed locally');
 console.log('PASS website account privacy: logout, guest, A/B isolation, same-account restore and explicit legacy import');
})().catch(e=>{console.error(e);process.exitCode=1});
