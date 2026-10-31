'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml',
 '.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent((req.url||'/').split('?')[0]);
 let relative=name.endsWith('/')?name+'index.html':name;
 if(relative.startsWith('/'))relative=relative.slice(1);
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'content-type':type[path.extname(file)]||'text/plain','cache-control':'no-store'});
  res.end(data);
 });
});
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
   args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1330,height:870}});
  await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
   const u=route.request().url();
   if(u.includes('/functions/v1/yap-quota-status'))
    return route.fulfill({status:200,contentType:'application/json',
     body:JSON.stringify({features:{cloud_chat:{limit:20,remaining:20}},prepaid:{credits:0}})});
   if(u.includes('/rest/v1/yap_shared_chat_threads'))
    return route.fulfill({status:200,contentType:'application/json',body:'[]'});
   if(u.includes('/rest/v1/yap_user_memory'))
    return route.fulfill({status:200,contentType:'application/json',body:'[]'});
   return route.fulfill({status:204,body:''});
  });
  await page.addInitScript(()=>{
   localStorage.setItem('yapthing.web.preview.v1',JSON.stringify([
    {id:'legacy-test',messages:[{role:'user',text:'PREVIOUS PRIVATE BROWSER CHAT'}]}]));
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.YapWebChat&&!!window.YapChatCloud,{timeout:15000});
  assert.equal(await page.locator('#history button').count(),0,'logged-out history must be empty');
  assert(!((await page.locator('#messages').innerText()).includes('PREVIOUS PRIVATE')));
  assert(await page.locator('.quick-prompts').isHidden(),'quick prompt clutter must be hidden');
  assert(await page.locator('#yap-desktop-menu').isVisible(),'main YapThing dropdown must be available');
  await page.locator('#yap-desktop-menu > summary').click();
  assert(await page.locator('#yap-tool-menu').isVisible(),'main dropdown should open');
  assert.equal(await page.locator('#yap-workspace optgroup').count(),2,'advanced focus options are grouped');
  await page.locator('#yap-desktop-menu > summary').click();
  await page.evaluate(id=>window.YapSession.set({access_token:'fake-user-a',user:{id,email:'a@example.com'},expires_at:Date.now()/1000+3500}),a);
  await page.evaluate(()=>window.YapWebChat.add('ALPHA ACCOUNT CONFIDENTIAL TEXT','user'));
  assert.equal(await page.locator('#history button').count(),1);
  assert((await page.locator('#messages').innerText()).includes('ALPHA ACCOUNT'));
  assert(await page.locator('#account-toggle').isVisible(),'account control must be visible without opening the menu');
  await page.locator('#account-toggle').click();
  await page.locator('#account-signout').click();
  assert.equal(await page.locator('#history button').count(),0,'logout sidebar must clear');
  assert.equal(await page.locator('#mobile-history button').count(),0,'logout mobile history must clear');
  assert(!(await page.locator('body').innerText()).includes('ALPHA ACCOUNT CONFIDENTIAL TEXT'),
   'logout visible DOM must not include former user data');
  await page.evaluate(id=>window.YapSession.set({access_token:'fake-user-b',user:{id,email:'b@example.com'},expires_at:Date.now()/1000+3500}),b);
  assert.equal(await page.locator('#history button').count(),0,'B should not see A history');
  await page.evaluate(()=>window.YapWebChat.add('BRAVO ACCOUNT PRIVATE TEXT','user'));
  await page.evaluate(id=>window.YapSession.set({access_token:'fake-user-a',user:{id,email:'a@example.com'},expires_at:Date.now()/1000+3500}),a);
  assert((await page.locator('#messages').innerText()).includes('ALPHA ACCOUNT'));
  assert(!(await page.locator('#messages').innerText()).includes('BRAVO ACCOUNT'));
  await page.setViewportSize({width:390,height:844});
  await page.locator('#yap-attachment-menu > summary').click();
  assert(await page.locator('#yap-attachment-menu > div').isVisible(),'mobile attachment dropdown is visible');
  const rect=await page.locator('#yap-attachment-menu > div').boundingBox();
  assert(rect&&rect.x>=-2&&rect.x+rect.width<=392,'mobile dropdown fits viewport');
  console.log('PASS Chrome browser: logout hides chat, no A/B leakage, account switching, crisp desktop and mobile menus');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close()});
