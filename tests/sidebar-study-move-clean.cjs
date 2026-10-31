'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'');
 if(file.endsWith('/'))file+='index.html';
 const target=path.resolve(root,file);
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(target,(error,content)=>{if(error){res.writeHead(404);return res.end('not found');}res.writeHead(200,{'content-type':mime[path.extname(target)]||'text/plain','cache-control':'no-store'});res.end(content)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
 for(const width of [1330,390]){
  const page=await browser.newPage({viewport:{width,height:850},isMobile:width<700,hasTouch:width<700});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
   const u=route.request().url();return route.fulfill(/yap_shared_chat_threads|yap_user_memory/.test(u)?{status:200,contentType:'application/json',body:'[]'}:{status:204,body:''});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded',timeout:22000});
  await page.waitForFunction(()=>!!document.getElementById('yap-study-controls')&&!!document.getElementById('yap-nav-projects'),{timeout:12000});
  if(width<700)await page.locator('#yap-desktop-menu > summary').click();
  const sidebar=page.locator('#yap-tool-menu');
  assert(await sidebar.isVisible(),'sidebar opens');
  assert.equal(await sidebar.locator('#yap-study-controls').count(),0,'study mode is not in sidebar');
  assert.equal(await sidebar.locator('label').filter({hasText:'Move this chat'}).count(),0,'move-chat label removed');
  assert.equal(await sidebar.locator('select[aria-label="Move current chat to project"]').count(),0,'move-chat picker removed');
  assert.equal(await sidebar.locator('#yap-menu-settings button').filter({hasText:'Project settings'}).count(),0,'project settings no longer in common settings');
  assert(await sidebar.locator('#yap-nav-chat').isVisible());
  assert(await sidebar.locator('#yap-nav-projects').isVisible());
  assert(await sidebar.locator('#yap-menu-settings').isVisible());
  assert(await page.locator('#yap-study-controls').isHidden(),'study controls are hidden during normal chat');
  await sidebar.locator('#yap-nav-projects').click();
  assert(await sidebar.locator('.yap-project-navigation button').filter({hasText:'Project settings'}).isVisible(),'project settings remain accessible after choosing Projects');
  assert(await sidebar.locator('.yap-project-navigation button').filter({hasText:'Connections'}).isVisible(),'connections remain available from Projects');
  await page.locator('#yap-workspace').evaluate(el=>{el.value='student-study';el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert(await page.locator('#yap-study-controls').isVisible(),'study tools available when explicitly choosing study workflow');
  assert.equal(await sidebar.locator('#yap-study-controls').count(),0,'study controls never move into sidebar');
  await page.locator('#yap-workspace').evaluate(el=>{el.value='general';el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert(await page.locator('#yap-study-controls').isHidden(),'study tools hidden again outside study workflow');
  assert.deepEqual(errors,[],'no JS errors');
  console.log('PASS clean sidebar '+width+'px: no Study or Move, Projects controls available, Study workflow still works');
  await page.close();
 }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1});
