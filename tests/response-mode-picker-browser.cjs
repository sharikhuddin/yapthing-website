'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const port=9374,chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
 '--headless=new','--disable-extensions','--allow-file-access-from-files','--remote-debugging-port='+port,
 '--user-data-dir='+path.join(process.env.TEMP,'yap-mode-picker-'+process.pid),
 '--window-size=390,840','about:blank'],{stdio:'ignore'});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 let tabs;
 for(let i=0;i<70;i++){try{tabs=await(await fetch('http://localhost:'+port+'/json')).json();if(tabs.some(x=>x.type==='page'))break;}catch{}await pause(120)}
 const tab=tabs?.find(t=>t.type==='page');assert(tab,'Chrome headless unavailable');
 const ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej});
 const pending=new Map();let next=0;
 ws.onmessage=event=>{const msg=JSON.parse(event.data);if(!pending.has(msg.id))return;const x=pending.get(msg.id);pending.delete(msg.id);msg.error?x.reject(Error(msg.error.message)):x.resolve(msg.result)};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const evaluate=async source=>{const data=await call('Runtime.evaluate',{expression:source,awaitPromise:true,returnByValue:true});if(data.exceptionDetails)throw Error(JSON.stringify(data.exceptionDetails));return data.result.value};
 try{
  await call('Page.enable');
  await call('Page.navigate',{url:'file:///C:/Users/KhalialA/yapthing-website/chat/index.html'});
  let modes;
  for(let i=0;i<70;i++){modes=await evaluate("window.YapResponseModes&&[window.YapResponseModes.current().id,...Array.from(document.querySelectorAll('.yap-mode-panel button')).map(b=>b.querySelector('strong')?.textContent)]");if(modes?.length>=6)break;await pause(150)}
  assert(modes,'Mode picker unavailable');
  assert.equal(modes[0],'auto','Auto is default for new browser profile');
  assert.deepEqual(modes.slice(1),['Yap Auto','Yap Swift','Yap Balance','Yap Depth','Yap Story']);
  assert.equal(await evaluate("document.querySelector('#yap-response-modes>summary').textContent.includes('Yap Auto')"),true);
  for(const [name,id] of [['Yap Swift','swift'],['Yap Balance','balance'],['Yap Depth','depth'],['Yap Story','story'],['Yap Auto','auto']]){
    const selected=await evaluate("(()=>{const b=[...document.querySelectorAll('.yap-mode-panel button')].find(el=>el.querySelector('strong')?.textContent==="+JSON.stringify(name)+");b.click();return window.YapResponseModes.current().id})()");
    assert.equal(selected,id);
  }
  // Verify the model identifier received from the API remains internal while YapThing is shown.
  const invoked=await evaluate("(()=>{window.YapWebAccount.getUserId=()=> '12345678-1234-1234-1234-123456789012';window.YapWebAccount.getQuota=()=>({remaining:40,limit:100});window.YapWebAccount.status=async()=>{};window.YapPhotoVision.ask=async()=>({answer:'Model fixture answer',model:'gemini-3.1-flash-lite',sources:[]});const el=document.querySelector('#prompt');el.value='Hello';document.querySelector('#send').disabled=false;document.querySelector('#form').requestSubmit();return true})()");
  assert(invoked);
  let label='';
  for(let i=0;i<40;i++){label=await evaluate("document.querySelector('.yap-response-meta')?.textContent||''");if(label.includes('Yap Auto'))break;await pause(125)}
  assert(label.includes('Yap Auto')&&!/Gemini|Flash-Lite|Google/i.test(label),'Replies must show YapThing-branded metadata only: '+label);
  const pickerText=await evaluate("document.querySelector('.yap-mode-panel').textContent");
  assert(!/Gemini|Google|Brave/i.test(pickerText),'Mode picker must use YapThing branding');
  console.log('PASS Chrome picker Auto default, five YapThing modes, and branded reply labels');
 }finally{ws.close()}
}
main().then(()=>{chrome.kill();process.exit(0)},e=>{console.error(e);chrome.kill();process.exit(1)});
