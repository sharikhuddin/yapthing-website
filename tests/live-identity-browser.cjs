'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const port=9387;
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
 '--headless=new','--disable-extensions','--remote-debugging-port='+port,
 '--user-data-dir='+path.join(process.env.TEMP,'yap-live-identity-'+process.pid),
 '--window-size=1200,900','about:blank'],{stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 let page;
 for(let i=0;i<85;i++){try{const tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();page=tabs.find(t=>t.type==='page');if(page)break;}catch{}await pause(150)}
 assert(page,'Chrome debugging session unavailable');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 const pending=new Map();let seq=0;
 ws.onmessage=e=>{const r=JSON.parse(e.data),h=pending.get(r.id);if(!h)return;pending.delete(r.id);r.error?h.reject(Error(r.error.message)):h.resolve(r.result)};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const ev=async expression=>{const v=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(v.exceptionDetails)throw Error(JSON.stringify(v.exceptionDetails));return v.result.value};
 try{
  await call('Page.enable');
  await call('Network.enable');
  await call('Network.setCacheDisabled',{cacheDisabled:true});
  await call('Page.navigate',{url:'https://yapthing.com/chat/?test=identity-'+Date.now()});
  for(let i=0;i<80;i++){if(await ev("!!window.YapWebChat && !!document.querySelector('#form')"))break;await pause(180)}
  assert(await ev('!!window.YapWebChat'),'Public live website did not initialize');
  assert(await ev("!!document.querySelector('script[src*=\"yap-identity2\"]')"),'Public HTML does not reference corrected identity script');
  const send=async question=>{
   await ev("(()=>{const el=document.querySelector('#prompt');el.value="+JSON.stringify(question)+";document.querySelector('#form').requestSubmit();return true})()");
   for(let i=0;i<45;i++){const r=await ev("window.YapWebChat.latest?.()||''");if(r.startsWith("I'm YapThing"))return r;await pause(100)}
   return await ev("window.YapWebChat.latest?.()||''");
  };
  let answer=await send('Who made you?');
  assert.match(answer,/^I'm YapThing/,'Public site should identify YapThing when asked the maker');
  answer=await send('What is your name?');
  assert.match(answer,/^I'm YapThing/,'Public site must identify YapThing by name');
  const kept=await ev("window.YapWebChat.listChats().length");
  assert(kept>0);
  // Historical replies are not rewritten; a new question still should use the correct identity.
  await ev("(()=>{localStorage.setItem('yapthing.web.preview.v1',JSON.stringify([{id:'legacy_identity_test',messages:[{role:'user',text:'Who made you?'},{role:'assistant',text:'I am made by Alibaba Cloud, which is a cloud computing company.',source:'ai'}]}]));localStorage.setItem('yapthing.web.preview.v1.active','legacy_identity_test');return true})()");
  await call('Page.reload',{ignoreCache:true});
  for(let i=0;i<75;i++){if(await ev("!!window.YapWebChat && document.querySelector('#messages')?.textContent.includes('Alibaba Cloud')"))break;await pause(150)}
  assert(await ev("document.querySelector('#messages')?.textContent.includes('Alibaba Cloud')"),'Previously saved bad answer should remain in history');
  if(process.env.YAP_EXPECT_CORRECTION==='1')assert(await ev("document.querySelector('.yap-legacy-identity-note')?.textContent.includes('older reply incorrectly identified')"),'Earlier false identity reply should show correction');
  answer=await send('What is your name?');
  assert.match(answer,/^I'm YapThing/,'New questions in old conversations must use new identity answer');
  console.log('PASS live YapThing: who-made-you, what-is-your-name, and new reply in a historical conversation');
 }finally{ws.close()}
}
run().then(()=>{chrome.kill();process.exit(0)},e=>{console.error(e);chrome.kill();process.exit(1)});
