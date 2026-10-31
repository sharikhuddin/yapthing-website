'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'chat/chat.js'),'utf8');
const anchor="engine=null,busy=false,modelLoading=false,backend=''";
assert(source.includes(anchor),'chat startup anchor changed');
const fakeEngine=[
"engine={",
"  chat:{completions:{create:async ({messages})=>{",
"   window.__yapLocalCaptured=messages;",
"   if(messages[0]?.role!=='system'||messages.filter(m=>m.role==='system').length!==1||messages.at(-1)?.role!=='user')",
"     throw Error('System prompt should always be the first message in messages.');",
"   return {[Symbol.asyncIterator]:async function*(){yield {choices:[{delta:{content:'LOCAL_AI_REPLY_OK'}}]}}};",
"  }}}",
" },busy=false,modelLoading=false,backend='gpu'"
].join('\n');
const patched=source.replace(anchor,fakeEngine);
const server=http.createServer((req,res)=>{
 try{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep))throw Error('Bad path');
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');
  res.end(file.endsWith(path.join('chat','chat.js'))?patched:fs.readFileSync(file));
 }catch{res.writeHead(404).end()}
});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new','--disable-extensions','--remote-debugging-port=9375',
  '--user-data-dir='+path.join(process.env.TEMP,'yap-local-first-'+process.pid),
  '--window-size=390,840','about:blank'],{stdio:'ignore'});
 try{
  let tab;
  for(let i=0;i<50;i++){
   try{const pages=await (await fetch('http://localhost:9375/json')).json();tab=pages.find(t=>t.type==='page');if(tab)break;}catch{}
   await pause(150);
  }
  assert(tab,'Headless Chrome not available');
  const ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,err)=>{ws.onopen=ok;ws.onerror=err});
  const pending=new Map();let id=0;
  ws.onmessage=e=>{const m=JSON.parse(e.data),x=pending.get(m.id);if(!x)return;pending.delete(m.id);m.error?x.reject(Error(m.error.message)):x.resolve(m.result)};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}))});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser exception: '+JSON.stringify(r.exceptionDetails));return r.result.value};
  try {
   await call('Page.enable');
   await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/chat/'});
   for(let i=0;i<55;i++){if(await evaluate("!!window.YapWebChat && !!document.querySelector('#send')"))break;await pause(150)}
   assert(await evaluate('!!window.YapWebChat'),'YapThing chat did not initialize');
   await evaluate("(()=>{document.querySelector('#prompt').value='Explain photosynthesis in simple terms';document.querySelector('#send').disabled=false;document.querySelector('#form').requestSubmit();return true})()");
   let finished=false;
   for(let i=0;i<60;i++){
    finished=await evaluate("document.querySelector('#messages').textContent.includes('LOCAL_AI_REPLY_OK')");
    if(finished)break;
    await pause(150);
   }
   assert(finished,'Browser should successfully return a local AI response');
   const messages=await evaluate("window.__yapLocalCaptured.map(x=>({role:x.role,content:x.content}))");
   assert.equal(messages[0].role,'system');
   assert.equal(messages.filter(m=>m.role==='system').length,1);
   assert.equal(messages.at(-1).role,'user');
   assert(messages[0].content.includes('thoughtful collaborator'));
   console.log('PASS real Chrome guest send with simulated WebLLM engine: one system message at index zero and complete local AI reply');
  } finally {ws.close()}
 }finally{chrome.kill();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
