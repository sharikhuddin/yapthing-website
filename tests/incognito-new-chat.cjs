'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let rel=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'');
 if(rel.endsWith('/'))rel+='index.html';
 const file=path.resolve(root,rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,buffer)=>{if(e){res.writeHead(404);return res.end('missing');}res.writeHead(200,{'content-type':mime[path.extname(file)]||'text/plain','cache-control':'no-store'});res.end(buffer)});
});
const owner='11111111-1111-4111-8111-111111111111';
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 const base='http://127.0.0.1:'+server.address().port+'/chat/';
 const context=await browser.newContext({viewport:{width:1370,height:900}});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
  const u=route.request().url();
  if(u.includes('yap_shared_chat_threads')||u.includes('yap_user_memory'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  if(u.includes('yap-quota-status'))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  return route.fulfill({status:204,body:''});
 });
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:26000});
 await page.waitForFunction(()=>window.YapWebChat?.setIncognito&&document.querySelector('#yap-incognito-toggle'),{timeout:17000});
 assert(await page.locator('#yap-empty-hero').isVisible(),'new chat must show a centered greeting');
 assert((await page.locator('#yap-empty-hero').innerText()).includes('Let’s get yapping'));
 assert(await page.locator('#messages').isHidden(),'empty chat should not show a chat bubble');
 const bounds=await page.locator('#yap-empty-hero').boundingBox(),form=await page.locator('#form').boundingBox();
 assert(bounds&&form&&bounds.y>280&&form.y>bounds.y+30&&form.y<700,'greeting and composer must be centered together: '+JSON.stringify({bounds,form}));
 await page.evaluate(id=>window.YapSession.set({access_token:'test-a',user:{id,email:'tester@example.com'},expires_at:Date.now()/1000+3200}),owner);
 await page.locator('#yap-incognito-toggle').click();
 assert(await page.locator('#yap-incognito-toggle').getAttribute('aria-pressed')==='true');
 assert(await page.locator('#yap-incognito-notice').isVisible(),'privacy limitations need to be explicit');
 assert(await page.locator('#yap-attachment-menu').evaluate(el=>getComputedStyle(el).pointerEvents)==='none','attachments disabled in private mode');
 const active=await page.evaluate(()=>window.YapWebChat.isIncognito());
 assert(active,'incognito session active');
 await page.evaluate(()=>{
  window.YapWebChat.add('PRIVATE_SENSITIVE_TEST_224','user');
  window.YapWebChat.add('PRIVATE_ANSWER_224','assistant');
 });
 assert((await page.locator('#messages').innerText()).includes('PRIVATE_SENSITIVE_TEST_224'));
 assert(await page.locator('#yap-empty-hero').isHidden(),'greeting moves away after first message');
 const privacy=await page.evaluate(()=>({
  storage:Object.keys(localStorage).map(k=>localStorage.getItem(k)||'').join('|'),
  snap:JSON.stringify(window.YapWebChat.snapshot?.()||[]),
  lists:JSON.stringify(window.YapWebChat.listChats?.()||[]),
  latest:window.YapWebChat.latest?.()
 }));
 assert(!privacy.storage.includes('PRIVATE_SENSITIVE_TEST_224'),'not saved to localStorage');
 assert(!privacy.snap.includes('PRIVATE_SENSITIVE_TEST_224'),'not in cloud upload snapshot');
 assert(!privacy.lists.includes('PRIVATE_SENSITIVE_TEST_224'),'not in recent chats');
 assert(privacy.latest?.includes('PRIVATE_ANSWER_224'),'private session reply visible only in active chat');
 await page.locator('#prompt').fill('what is your name');
 await page.locator('#form').evaluate(el=>el.requestSubmit());
 assert((await page.locator('#messages').innerText()).includes("I'm YapThing."),'private chat submits prompts normally');
 await page.locator('#prompt').fill('/plugin help');
 await page.locator('#form').evaluate(el=>el.requestSubmit());
 assert((await page.locator('#messages').innerText()).includes('Plugin actions are unavailable in Incognito'),'private mode blocks connected plugin actions');
 assert(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('PRIVATE_SENSITIVE_TEST_224'),'private chat still has no stored messages');
 await page.locator('#yap-incognito-toggle').click();
 assert(!(await page.locator('body').innerText()).includes('PRIVATE_SENSITIVE_TEST_224'),'exiting destroys private content');
 assert(await page.locator('#yap-empty-hero').isVisible(),'returns to new chat landing');
 await page.locator('#yap-incognito-toggle').click();
 await page.evaluate(()=>window.YapWebChat.add('PRIVATE_SESSION_REFRESH','user'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.YapWebChat?.setIncognito&&document.querySelector('#yap-incognito-toggle'));
 assert(!await page.evaluate(()=>window.YapWebChat.isIncognito()),'incognito resets on reload');
 assert(!(await page.locator('body').innerText()).includes('PRIVATE_SESSION_REFRESH'),'reload never restores private messages');
 await page.locator('#yap-incognito-toggle').click();
 await page.locator('#yap-conversation-mode').selectOption('work');
 assert(!await page.evaluate(()=>window.YapWebChat.isIncognito()),'Work must end incognito');
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mobile=await phone.newPage();mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(base,{waitUntil:'domcontentloaded'});
 await mobile.waitForFunction(()=>window.YapWebChat?.setIncognito&&document.querySelector('#yap-incognito-toggle'));
 assert(await mobile.locator('#yap-empty-hero').isVisible(),'mobile empty welcome visible');
 const mob=await mobile.locator('#yap-empty-hero').boundingBox(),composer=await mobile.locator('#form').boundingBox();
 assert(mob&&composer&&mob.x>=0&&composer.x>=0&&composer.x+composer.width<=392,'mobile new chat centered and fits viewport');
 assert(await mobile.locator('#yap-incognito-toggle').isVisible(),'incognito icon beside mobile Chat/Work selector');
 await mobile.locator('#yap-incognito-toggle').click();
 assert(await mobile.locator('#yap-incognito-notice').isVisible(),'mobile privacy notice visible');
 assert.deepEqual(errors,[],'no page errors');
 console.log('PASS centered YapThing new-chat desktop/mobile; Incognito not saved to localStorage/history/cloud; discarded on exit/reload; Work and attachments isolated');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1});
