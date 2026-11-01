'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 try{const url=new URL(req.url,'http://localhost'),name=url.pathname.replace(/^\/+/,''),file=path.resolve(root,name.endsWith('/')?name+'index.html':name);
 if(!file.startsWith(root+path.sep))throw Error('bad path');
 res.writeHead(200,{'content-type':types[path.extname(file)]||'text/plain','cache-control':'no-store'});res.end(fs.readFileSync(file));
 }catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:850}}),page=await ctx.newPage(),errors=[],recoveryRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=route.request().url();
   if(url.startsWith(base))return route.continue();
   if(url.includes('/auth/v1/recover')){recoveryRequests.push({url,body:JSON.parse(route.request().postData()||'{}')});return route.fulfill({status:200,contentType:'application/json',body:'{}'});}
   if(url.includes('supabase.co'))return route.fulfill({status:401,contentType:'application/json',body:'{}'});
   return route.abort();
  });
  await page.goto(base+'/chat/',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>!!window.YapWebAccount,{timeout:15000});
  await page.evaluate(()=>{const m=document.querySelector('#yap-desktop-menu');if(m)m.open=true;const p=document.querySelector('#account-panel');p.hidden=false;});
  const forgot=page.locator('#account-forgot-password');
  assert(await forgot.isVisible(),'Forgot password visible in sign-in panel');
  await forgot.click();
  assert.match(await page.locator('#account-state').innerText(),/Enter your account email/);
  assert.equal(recoveryRequests.length,0,'Invalid input must not trigger API request');
  await page.locator('#account-email').fill('person@example.com');
  await forgot.click();
  await page.waitForFunction(()=>document.querySelector('#account-state').textContent.includes('If an account uses'));
  assert.equal(recoveryRequests.length,1);
  assert.equal(recoveryRequests[0].body.email,'person@example.com');
  const redirect=new URL(recoveryRequests[0].url).searchParams.get('redirect_to');
  assert.equal(redirect,'https://yapthing.com/reset-password/');
  assert(!(await page.locator('#account-forgot-password').isDisabled()));
  assert.deepEqual(errors,[],'No sign-in page errors');
  await page.evaluate(()=>window.YapSession.set({access_token:'mock.session',user:{id:'11111111-1111-4111-8111-111111111111'}}));
  assert.equal(await page.locator('#account-forgot-password').isVisible(),false,'Forgot password hidden when signed in');
  await ctx.close();

  const recoveryContext=await browser.newContext({viewport:{width,height:850}}),reset=await recoveryContext.newPage(),resetErrors=[],updated=[];
  reset.on('pageerror',e=>resetErrors.push(e.message));
  await reset.route('**/*',async route=>{
   const url=route.request().url();
   if(url.startsWith(base))return route.continue();
   if(url.endsWith('/auth/v1/user')){
    if(route.request().method()==='PUT'){updated.push({auth:route.request().headers().authorization,body:JSON.parse(route.request().postData()||'{}')});return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'11111111-1111-4111-8111-111111111111'})});}
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'11111111-1111-4111-8111-111111111111',email:'person@example.com'})});
   }
   if(url.endsWith('/auth/v1/logout'))return route.fulfill({status:204,body:''});
   if(url.endsWith('/auth/v1/verify'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'hash.verified.token'})});
   return route.abort();
  });
  await reset.goto(base+'/reset-password/#access_token=fake.jwt.token&refresh_token=private-long-refresh&type=recovery&expires_in=3600',{waitUntil:'domcontentloaded'});
  await reset.waitForFunction(()=>!location.hash&&document.querySelector('#reset-form')?.hidden===false,{timeout:15000});
  assert.equal(await reset.locator('#reset-form').isVisible(),true);
  assert.equal(new URL(reset.url()).hash,'','Recovery tokens must be removed from URL');
  await reset.locator('#new-password').fill('TwelveCharacterTest123!');
  await reset.locator('#confirm-password').fill('MismatchPassword123!');
  await reset.locator('#reset-submit').click();
  assert.match(await reset.locator('#reset-status').innerText(),/do not match/i);
  assert.equal(updated.length,0);
  await reset.locator('#confirm-password').fill('TwelveCharacterTest123!');
  await reset.locator('#reset-submit').click();
  await reset.waitForFunction(()=>document.querySelector('#reset-status').textContent.includes('Password updated.'),{timeout:12000});
  assert.equal(updated.length,1);
  assert.equal(updated[0].auth,'Bearer fake.jwt.token');
  assert.equal(updated[0].body.password,'TwelveCharacterTest123!');
  assert.equal(await reset.locator('#reset-form').isVisible(),false);
  assert.equal(await reset.evaluate(()=>localStorage.getItem('yapthing.web.session.v1')),null,'Temporary recovery session must not become a full login');
  assert((await reset.locator('#return-to-chat').getAttribute('href'))==='/chat/');
  assert.deepEqual(resetErrors,[],'No reset screen errors');
  const pageOverflow=await reset.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(pageOverflow<=2,'No horizontal overflow');

  await reset.goto(base+'/reset-password/?from=email#type=recovery&error=access_denied&error_description=Expired',{waitUntil:'domcontentloaded'});
  await reset.waitForFunction(()=>document.querySelector('#reset-status').dataset.state==='error');
  assert.equal(await reset.locator('#reset-form').isVisible(),false);
  assert.equal(new URL(reset.url()).hash,'');
  await reset.goto(base+'/reset-password/?token_hash=example_test_hash&type=recovery',{waitUntil:'domcontentloaded'});
  await reset.waitForFunction(()=>document.getElementById('reset-form')?.hidden===false,{timeout:12000});
  assert.equal(new URL(reset.url()).search,'','Verification token hash cleared from address');
  assert.equal(await reset.locator('#reset-form').isVisible(),true,'Token-hash recovery works');
  console.log('PASS password recovery email, verified reset, failure handling and token safety '+width+'px');
  await recoveryContext.close();
 }}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
