'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+name),target=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;if(!target.startsWith(root))throw Error('bad path');const ext=path.extname(target);res.setHeader('content-type',ext==='.js'?'application/javascript':ext==='.css'?'text/css':'text/html');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:840}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/functions/v1/ios-chat'))requests.push(r.url());});
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.YapGuestConversion&&!!window.YapWebChat,{timeout:17000});
  assert.equal(await page.locator('#yap-guest-join').count(),0,'no signup banner before visitor engages');
  await page.locator('#prompt').fill('Hi');
  await page.evaluate(()=>document.querySelector('#form').requestSubmit());
  await page.getByText('Make this your YapSpace.').waitFor();
  assert.match(await page.locator('#messages').innerText(),/Hey!.*Yapper/);
  assert.match(await page.locator('#yap-guest-join').innerText(),/5 cloud replies \+ 2 web searches per day/i);
  await page.locator('#prompt').fill('Explain API authentication to me');
  await page.evaluate(()=>document.querySelector('#form').requestSubmit());
  assert.equal(await page.locator('#prompt').inputValue(),'Explain API authentication to me','blocked prompt remains editable and is not lost');
  assert.equal(await page.locator('#messages .message.user').count(),1,'second guest turn did not reach chat');
  assert.equal(requests.length,0,'no paid cloud requests');
  await page.getByRole('button',{name:'Claim my free YapSpace'}).click();
  assert.equal(await page.locator('#account-panel').isVisible(),true,'signup opens existing real account form');
  assert.equal(await page.locator('#account-email').isVisible(),true);
  await page.evaluate(()=>{window.YapWebAccount.getUserId=()=> '11111111-1111-4111-8111-111111111111';window.dispatchEvent(new Event('yap:session-change'));});
  assert.equal(await page.locator('#prompt').inputValue(),'Explain API authentication to me','unsent visitor question restored after sign-in');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.YapGuestConversion);
  assert.equal(await page.evaluate(()=>window.YapGuestConversion.previewUsed()),1,'reload does not reset local guest preview');
  const acct=await page.evaluate(()=>{
   window.YapWebAccount.getUserId=()=> '11111111-1111-4111-8111-111111111111';
   window.dispatchEvent(new Event('yap:session-change'));
   window.dispatchEvent(new CustomEvent('yap:quota',{detail:{limit:5,remaining:1}}));
   return {guest:!!document.getElementById('yap-guest-join'),upgrade:!!document.getElementById('yap-free-upgrade-nudge')};
  });
  assert.equal(acct.guest,false,'authenticated user must not see signup nudge');
  assert.equal(acct.upgrade,true,'free signed-in account gets upgrade prompt at one reply');
  assert.deepEqual(errors,[],'no JS errors');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(overflow<=2,'mobile horizontal overflow');
  console.log('PASS visitor conversion, one-message limit, signup and honest upgrade '+width+'px');
  await context.close();
 }}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
