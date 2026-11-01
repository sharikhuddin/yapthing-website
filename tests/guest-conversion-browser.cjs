'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname,source=path.resolve(root,'.'+pathname);
  const file=fs.statSync(source).isDirectory()?path.join(source,'index.html'):source;
  if(!file.startsWith(root))throw Error('Invalid source');
  const ext=path.extname(file);
  res.setHeader('content-type',ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.svg'?'image/svg+xml':'text/html');
  res.end(fs.readFileSync(file));
 }catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:850}}),page=await ctx.newPage(),errors=[],cloudCalls=[],signup=[],signin=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const day=new Date().toISOString().slice(0,10);
   localStorage.setItem('yapthing.guest.preview.v1',JSON.stringify({day,used:1}));
   localStorage.setItem('yapthing.free.daily.v1',JSON.stringify({day,count:20}));
  });
  const base='http://127.0.0.1:'+server.address().port;
  await page.route('**/*',route=>{
   const url=route.request().url();
   if(url.startsWith(base))return route.continue();
   if(url.includes('/auth/v1/signup')){
    signup.push(JSON.parse(route.request().postData()||'{}'));
    return route.fulfill({status:200,contentType:'application/json',body:'{"id":"11111111-1111-4111-8111-111111111111"}'});
   }
   if(url.includes('/auth/v1/token?grant_type=password')){
    signin.push(JSON.parse(route.request().postData()||'{}'));
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({access_token:'fake-access',refresh_token:'fake-refresh',expires_in:3600,user:{id:'11111111-1111-4111-8111-111111111111',email:'demo@example.com'}})});
   }
   if(url.includes('supabase.co')){
    cloudCalls.push(url);
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
   }
   return route.abort();
  });
  await page.goto(base+'/chat/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.YapWebChat&&!!window.YapGuestConversion,{timeout:18000});
  assert(await page.locator('#yap-guest-join').isVisible(),'Return visitor invitation visible on refresh');
  await page.locator('#prompt').fill('Explain API authentication');
  assert.equal(await page.locator('#send').isEnabled(),true,'Previous quota storage must not disable Send');
  await page.locator('#send').click();
  assert.equal(await page.locator('#prompt').inputValue(),'Explain API authentication','Unsent question must remain in composer');
  assert.equal(await page.locator('#messages .message.user').count(),0,'Unpaid cloud question must not be submitted');
  assert.equal(await page.locator('#yap-guest-join').isVisible(),true,'Accessible signup remains beside composer');
  assert.equal(await page.locator('#yap-guest-join').evaluate(el=>el.nextElementSibling?.id),'form','CTA attached directly to chat composer');
  assert.equal(await page.locator('#send').isEnabled(),true,'Send must never be permanently disabled');
  await page.getByRole('button',{name:'Create free account'}).click();
  assert(await page.locator('#yap-inline-auth').isVisible(),'Inline account form opens from CTA');
  await page.locator('#yap-inline-auth input[type=email]').fill('demo@example.com');
  await page.locator('#yap-inline-auth input[type=password]').fill('CorrectHorse123!');
  await page.locator('#yap-inline-auth button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#yap-inline-auth-status')?.textContent.includes('Check your email'),{timeout:14000});
  assert.equal(signup.length,1,'Actual existing signup handler called');
  assert.equal(signup[0].email,'demo@example.com');
  assert.equal(await page.locator('#prompt').inputValue(),'Explain API authentication','Signup must preserve draft');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'I have an account'}).click();
  await page.locator('#yap-inline-auth input[type=email]').fill('demo@example.com');
  await page.locator('#yap-inline-auth input[type=password]').fill('CorrectHorse123!');
  await page.locator('#yap-inline-auth button[type=submit]').click();
  await page.waitForFunction(()=>!!window.YapWebAccount.getUserId(),{timeout:15000});
  assert.equal(signin.length,1,'Existing sign-in backend handler called');
  assert.equal(await page.locator('#yap-guest-join').count(),0,'Guest CTA removed once account signs in');
  assert.equal(await page.locator('#prompt').inputValue(),'Explain API authentication','Signed-in visitor can send original question');
  assert.equal(await page.locator('#send').isEnabled(),true);
  assert(!cloudCalls.some(url=>url.includes('ios-chat')),'Anonymous prompt never triggered paid cloud model');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(overflow<=2,'No horizontal overflow at '+width+'px');
  assert.deepEqual(errors,[],'No browser errors');
  console.log('PASS restored guest, editable Send, inline signup/login, draft preserved '+width+'px');
  await ctx.close();
 }}finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
