'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+url),file=fs.statSync(f).isDirectory()?path.join(f,'index.html'):f;if(!file.startsWith(root))throw Error('invalid');const ext=path.extname(file);res.setHeader('content-type',ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.svg'?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:840}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
   const uri=route.request().url();
   return route.fulfill({status:200,contentType:'application/json',body:uri.includes('/rest/v1/')?'[]':'{}'});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.YapWebChat&&!!window.YapChatServices,{timeout:20000});
  const ask=async q=>{
   await page.locator('#prompt').fill(q);
   await page.evaluate(()=>document.querySelector('#form').requestSubmit());
   await page.waitForFunction(()=>!!window.YapWebChat.latest?.()&&window.YapWebChat.latest()!=='YAPTHING_WORKING');
   return page.evaluate(()=>window.YapWebChat.latest());
  };
  assert.match(await ask('what is hacking you up'),/Yapper runs inside YapThing/i);
  assert.match(await ask('Who trained you?'),/did not train/i);
  assert.match(await ask('What is your name?'),/I'm Yapper/i);
  assert.match(await ask('Who built you?'),/YapThing team/i);
  const images=await page.locator('#messages .yap-assistant-avatar').count();
  assert(images>=3,'brand avatars should remain visible');
  assert(!((await page.locator('#messages').innerText()).includes("I'm a large language model, trained by Google")));
  const id='11111111-1111-4111-8111-111111111111';
  const result=await page.evaluate(id=>{
   window.YapWebAccount.getUserId=()=>id;
   const saved=window.YapChatServices.learnExplicitStyle('From now on, keep replies short');
   const pref=window.YapChatServices.preferences();
   window.YapWebAccount.getUserId=()=> '22222222-2222-4222-8222-222222222222';
   const other=window.YapChatServices.preferences();
   window.YapWebAccount.getUserId=()=>id;
   const restored=window.YapChatServices.preferences();
   return {saved,pref,other,restored};
  },id);
  assert.match(result.saved,/preferences|response length/i);
  assert.equal(result.pref.length,'concise');
  assert.equal(result.other.length,undefined);
  assert.equal(result.restored.length,'concise');
  assert.deepEqual(errors,[]);
  console.log('PASS Yapper identity, conversational preference, account separation at '+width+'px');
  await ctx.close();
 }}finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});