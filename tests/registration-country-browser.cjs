'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/KhalialA/tools/YapThing-QA/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const t={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\//,'');
 if(!name||name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('forbidden')}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);return res.end('missing')}res.writeHead(200,{'content-type':t[path.extname(file)]||'text/plain','cache-control':'no-store'});res.end(bytes)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',route=>{
  const u=route.request().url();
  if(u.includes('/auth/v1/signup')){
   requests.push(JSON.parse(route.request().postData()||'{}'));
   return route.fulfill({status:200,contentType:'application/json',body:'{"user":{"id":"00000000-0000-0000-0000-000000000010"}}'});
  }
  return route.fulfill({status:204,body:''});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded',timeout:22000});
 await page.waitForFunction(()=>window.YapRegistrationCountry&&document.getElementById('registration-country'),{timeout:10000});
 await page.evaluate(()=>document.getElementById('account-panel').hidden=false);
 const select=page.locator('#registration-country');
 assert.equal(await select.locator('option').count()>200,true,'international country list complete');
 assert.equal(await select.inputValue(),'','country voluntary default');
 await select.selectOption('US');
 assert.equal(await page.evaluate(()=>window.YapRegistrationCountry.currentCode()),'US');
 await page.locator('#account-email').fill('test-example@example.invalid');
 await page.locator('#account-password').fill('ExamplePassword123!');
 await page.locator('#account-signup').click();
 await page.waitForFunction(()=>document.querySelector('#account-state')?.textContent.includes('Check your email'),{timeout:10000});
 assert.equal(requests.length,1,'one mocked account creation');
 assert.equal(requests[0].data.registration_country,'US','self-reported US retained in signup user metadata');
 assert.equal('ip' in requests[0],false,'no IP in signup metadata');
 await select.selectOption('');
 await page.locator('#account-signup').click();
 await page.waitForFunction(()=>document.querySelector('#account-state')?.textContent.includes('Check your email'),{timeout:10000});
 assert.equal(requests.length,2);
 assert(!requests[1].data,'opted-out country not submitted');
 assert((await page.goto('http://127.0.0.1:'+server.address().port+'/privacy/')).ok(),'privacy available');
 assert((await page.locator('main').innerText()).includes('Optional registration country'),'privacy disclosure is published');
 assert.equal(errors.length,0,'browser errors '+errors.join('|'));
 console.log('PASS signup country: 200+ selectable countries, opt-in USA metadata, opt-out without country, privacy disclosure');
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});
