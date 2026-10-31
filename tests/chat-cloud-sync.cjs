'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const actorA='11111111-1111-4111-8111-111111111111',actorB='22222222-2222-4222-8222-222222222222';
const local=[{id:'0f7e2222-1111-4222-8333-999999999991',title:'Local chat',messages:[{role:'user',text:'From web'}],updated:Date.now()}];
const remote=[{thread_id:'0f7e2222-1111-4222-8333-999999999992',title:'From phone',
 messages:[{role:'user',text:'From iPhone'},{role:'assistant',text:'Phone response'}],updated_at:new Date(Date.now()-2000).toISOString()}];
let current=actorA,merged=[],posts=[],requests=[],replySlow=false,delayedResolve,activeSync=0;
const listeners=new Map();
const evt=(name,detail)=>{for(const f of listeners.get(name)||[])f({type:name,detail})};
const window={
 YapSession:{get:()=>current?{access_token:'token',user:{id:current}}:null,
  authFetch:async(url,opts={})=>{
   requests.push({url,opts});
   if(opts.method==='POST'){posts.push({url,body:JSON.parse(opts.body)});return{ok:true,status:204}}
   if(replySlow)return new Promise(resolve=>{delayedResolve=resolve});
   return{ok:true,status:200,json:async()=>remote}
  }},
 YapWebChat:{
  snapshot:()=>local,
  mergeCloud:r=>{merged.push(r.map(t=>t.thread_id));return 1;}
 },
 addEventListener:(k,f)=>listeners.set(k,[...(listeners.get(k)||[]),f]),
 dispatchEvent:e=>evt(e.type,e.detail)
};
const syncStatus={textContent:''};
const document={visibilityState:'visible',getElementById:id=>id==='chat-sync-status'?syncStatus:null,
 addEventListener:(k,f)=>listeners.set('doc-'+k,[...(listeners.get('doc-'+k)||[]),f])};
let queued=[];
const runScheduled=async()=>{
 while(queued.length){const pending=queued.splice(0);for(const f of pending)f();for(let i=0;i<50;i++)await Promise.resolve();}
};
const ctx={window,document,URL,Date,JSON,AbortSignal,
 setTimeout:f=>{queued.push(f);return queued.length},
 clearTimeout:()=>{},
 setInterval:()=>0,
 queueMicrotask:f=>queued.push(f),
 console:{warn:()=>{}}
};
vm.runInNewContext(fs.readFileSync('chat/chat-history-sync.js','utf8'),ctx);
(async()=>{
 await runScheduled();
 assert.equal(merged.length,1,'remote phone thread should be downloaded');
 assert.equal(merged[0][0],remote[0].thread_id);
 assert.equal(posts.length,1,'local web thread should be uploaded');
 assert.equal(posts[0].body.thread_id,local[0].id);
 assert.equal(posts[0].body.user_id,actorA);
 assert.equal(posts[0].body.messages[0].text,'From web');
 assert.match(syncStatus.textContent,/synced/i);
 current=null;evt('yap:session-change');await runScheduled();
 const previous=posts.length;
 window.YapChatCloud.syncNow({manual:true});await runScheduled();
 assert.equal(posts.length,previous,'signed-out account must not upload');
 current=actorB;evt('yap:session-change');await runScheduled();
 assert(posts.every(p=>p.body.user_id===actorA||p.body.user_id===actorB));
 console.log('PASS cloud history: remote download, signed-in owner-scoped upload, private logout, cross-account boundaries');
})().catch(e=>{console.error(e);process.exitCode=1});
