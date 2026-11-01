'use strict';
const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 let id='alice',incognito=false,release;const handlers={};
 const window={YapWebAccount:{getUserId:()=>id,getToken:async()=> 'alice-session'},YapWebChat:{isIncognito:()=>incognito},addEventListener:(n,f)=>handlers[n]=f};
 const sandbox={window,AbortSignal,fetch:async()=>new Promise(r=>{release=()=>r({ok:true,json:async()=>({repositories:[{name:'alice/private'}]})});})};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('plugins/developer-client.js','utf8'),sandbox);
 for(const action of ['switch','signout','session-change','incognito']){
 id='alice';incognito=false;
 const pending=window.YapDeveloperClient.githubListRepositories();await new Promise(r=>setImmediate(r));
 if(action==='switch')id='bob';if(action==='signout')id='';if(action==='session-change')handlers['yap:session-change']();if(action==='incognito')incognito=true;
 release();await assert.rejects(pending,/Account changed/);
 }
 console.log('PASS private responses discarded after account switch, signout, session change and Incognito');
})().catch(e=>{console.error(e);process.exitCode=1;});
