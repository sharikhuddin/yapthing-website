'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const android=process.argv.includes('--android');
const root=path.resolve(__dirname,android?'../app/src/main/assets/www':'..');
const server=http.createServer((req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,fp=path.resolve(root,'.'+pathname),file=fs.statSync(fp).isDirectory()?path.join(fp,'index.html'):fp;if(!file.startsWith(root))throw Error('Invalid path');const ext=path.extname(file);res.setHeader('content-type',ext==='.js'?'application/javascript':ext==='.css'?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:840}}),page=await ctx.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/functions/v1/ios-chat'))requests.push(r.url())});
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+(android?'/index.html':'/chat/'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction((native)=>native?!!window.YapAssistant:!!window.YapWebChat,android);
  if(android){
   await page.evaluate(()=>{current.messages=[{role:'user',text:'Explain API authentication'},{role:'thing',text:'API authentication verifies identity before granting access.',source:'ai'}];renderMessages();});
   await page.locator('#message-input').fill('Hi');await page.evaluate(()=>document.querySelector('#chat-form').requestSubmit());
   await page.waitForFunction(()=>current.messages.at(-1)?.text?.includes("I'm Yapper"));
   const result=await page.evaluate(()=>current.messages.at(-1)?.text);
   assert.match(result,/Hey! I'm Yapper/);
   assert.doesNotMatch(result,/API authentication/i);
  }else{
   await page.evaluate(()=>{
    window.YapWebAccount.getUserId=()=> '11111111-1111-4111-8111-111111111111';
    window.dispatchEvent(new Event('yap:session-change'));
    window.YapWebChat.newChat();window.YapWebChat.add('Explain API authentication','user');
    window.YapWebChat.add('API authentication verifies identity before granting access.','assistant');
   });
   for(const mode of ['work','chat']){
    await page.evaluate(next=>{const el=document.getElementById('yap-conversation-mode');el.value=next;el.dispatchEvent(new Event('change',{bubbles:true}));},mode);
    await page.locator('#prompt').fill('Hi');
    await page.evaluate(()=>document.querySelector('#form').requestSubmit());
    await page.waitForFunction(()=>window.YapWebChat.latest?.().includes('Yapper'));
    const result=await page.evaluate(()=>window.YapWebChat.latest());
    assert.match(result,/Hey! I.m Yapper/);
    assert.doesNotMatch(result,/API authentication/i);
    assert(result.length<120);
   }
   const all=await page.locator('#messages .message').allTextContents();
   assert(all.at(-1).includes('Yapper'),'latest assistant reply must match latest Hi');
  }
  assert.equal(requests.length,0,'Simple greeting should not hit a language model and carry stale history');
  assert.deepEqual(errors,[]);
  console.log('PASS latest Hi not earlier API topic '+(android?'Android':'Website')+' '+width+'px');
  await ctx.close();
 }}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
