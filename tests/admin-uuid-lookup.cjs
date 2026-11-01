'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.xml':'application/xml','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((request,response)=>{
 let name=decodeURIComponent((request.url||'/').split('?')[0]).replace(/^\//,'');
 if(!name||name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end('blocked')}
 fs.readFile(file,(error,content)=>{if(error){response.writeHead(404);return response.end('missing')}
 response.writeHead(200,{'content-type':mime[path.extname(file)]||'text/plain','cache-control':'no-store'});response.end(content)});
});
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
 const uuid='b66d8e52-02ae-4c75-8e1f-1ebd13f2c994',queries=[];
 for(const width of [1360,390]){
  const context=await browser.newContext({viewport:{width,height:850},isMobile:width<700,hasTouch:width<700});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    localStorage.setItem('yapthing.web.session.v1',JSON.stringify({access_token:'admin-test-token'}));
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value)=>{window.__clipboard=value}}});
  });
  await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
   const url=route.request().url();
   let data;
   if(url.includes('yap-plan-status'))data={is_admin:true,plan:'pro',status:'active'};
   else if(url.includes('yap-admin-customers')){
    const q=new URL(url).searchParams.get('q')||'';queries.push({q,auth:route.request().headers().authorization});
    const list=q==='customer@example.com'?[{id:uuid,email:'Customer@Example.com',name:'Example User',plan:'pro',status:'active',source:'stripe'},{id:'77050705-c96f-4c6c-a3f6-f7b85c52ba18',email:'other@example.com',name:'customer@example.com',plan:'free',status:'inactive',source:'none'}]:q==='notfound@example.com'?[{id:'77050705-c96f-4c6c-a3f6-f7b85c52ba18',email:'other@example.com',name:'notfound@example.com',plan:'free',status:'inactive',source:'none'}]:[];
    data={total_accounts:2,new_last_7_days:0,matched:list.length,customers:list,page:1};
   }else if(url.includes('yap-admin-geography'))data={total:2,known:0,unknown:2,last_30_days:0,countries:[],asOf:new Date().toISOString()};
   else if(url.includes('yap-knowledge-activity'))data={source:'test',total:0,success:0,failed:0,cached:0,routes:[],recent:[],asOf:new Date().toISOString()};
   else data={};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.route('https://api.github.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sha:'a'.repeat(40),commit:{message:'test',committer:{date:new Date().toISOString()}},workflow_runs:[]})}));
  const origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/admin/?view=customers',{waitUntil:'domcontentloaded',timeout:22000});
  await page.waitForFunction(()=>window.YapAdminPages?.getCurrent?.()==='customers'&&document.getElementById('panel')&&!document.getElementById('panel').hidden,{timeout:12000});
  assert(await page.locator('#admin-uuid-card').isVisible(),'UUID lookup visible to admin');
  assert(await page.locator('#uuid-lookup-result').isHidden(),'no identifier shown initially');
  const input=page.locator('#uuid-lookup-email');
  await input.fill('CUSTOMER@EXAMPLE.COM');
  await input.press('Enter');
  await page.waitForFunction((expected)=>document.getElementById('uuid-lookup-value')?.value===expected,uuid,{timeout:10000});
  assert.equal(await page.locator('#uuid-lookup-result').isVisible(),true,'matching UUID displayed');
  assert((await page.locator('#uuid-lookup-matched-email').innerText()).includes('Customer@Example.com'));
  assert(queries.some(q=>q.q==='customer@example.com'&&q.auth==='Bearer admin-test-token'),'email normalized, auth passed');
  await page.locator('#uuid-lookup-copy').click();
  await page.waitForFunction((expected)=>window.__clipboard===expected,uuid);
  await page.locator('#uuid-lookup-override').click();
  assert.equal(await page.locator('#uid').inputValue(),uuid,'override UUID prefilled');
  assert.equal(new URL(page.url()).searchParams.get('view'),'customers-access','override opens dedicated page');
  assert(await page.locator('#form').isVisible(),'override visible');
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.YapAdminPages?.getCurrent?.()==='customers');
  await input.fill('notfound@example.com');
  assert(await page.locator('#uuid-lookup-result').isHidden(),'editing clears old UUID');
  await page.locator('#uuid-lookup-submit').click();
  await page.waitForFunction(()=>document.getElementById('uuid-lookup-status')?.textContent.startsWith('No registered user'),{timeout:10000});
  assert(await page.locator('#uuid-lookup-result').isHidden(),'no result on name-only match');
  await input.fill('not-an-email');
  await page.locator('#uuid-lookup-submit').click();
  assert(await page.locator('#uuid-lookup-result').isHidden(),'invalid input must not show stale UUID');
  await input.fill('customer@example.com');
  await page.evaluate(()=>localStorage.removeItem('yapthing.web.session.v1'));
  await page.locator('#uuid-lookup-submit').click();
  await page.waitForFunction(()=>document.getElementById('uuid-lookup-status')?.textContent.includes('Sign in with your administrator'),{timeout:4000});
  assert(await page.locator('#uuid-lookup-result').isHidden(),'expired admin session must not leak UUID');
  assert.deepEqual(errors,[],'uncaught browser error');
  console.log('PASS '+width+'px: email->UUID exact lookup, secure token, copy, override, no stale data, opt-out on missing session');
  await context.close();
 }
 }finally{await browser?.close();await new Promise(done=>server.close(done))}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1});
