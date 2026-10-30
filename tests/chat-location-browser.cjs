'use strict';
// Run with Playwright available via NODE_PATH and installed Chrome; no live account is used.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..'),native=path.resolve(project,'../yapthing/app/src/main/assets/www');
const server=http.createServer((req,res)=>{let rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),root=project;if(rel.startsWith('/native/')){root=native;rel=rel.slice(7);}let file=path.resolve(root,'.'+rel);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.YAP_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Chicago',geolocation:{latitude:24.860735,longitude:67.001137},permissions:['geolocation']});
 const page=await context.newPage(),errors=[],requests=[];let ipCalls=0,providerCalls=0,failSearch=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
 await page.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin))return route.continue();requests.push(url);
 if(url==='https://ipapi.co/json/'){ipCalls++;return route.fulfill({contentType:'application/json',body:JSON.stringify({ip:'203.0.113.8',city:'Karachi',region:'Sindh',country_name:'Pakistan',timezone:'Asia/Karachi'})});}
 if(url.includes('/functions/v1/google-grounded-search')){providerCalls++;return route.fulfill({status:503,contentType:'application/json',body:'{}'});}
 if(url.includes('/functions/v1/search-web')){providerCalls++;if(failSearch)return route.fulfill({status:429,contentType:'application/json',body:'{}'});return route.fulfill({contentType:'application/json',body:JSON.stringify({provider:'Brave Search',results:[{title:'Official listing',url:'https://example.com/listing',summary:'A listing in Karachi.'}]})});}
 return route.abort();});
 await page.goto(origin+'/chat/');await page.waitForSelector('#yap-live-clock');assert.equal(ipCalls,0);
 const first=await page.locator('#yap-live-clock').textContent();await page.waitForTimeout(1100);assert.notEqual(await page.locator('#yap-live-clock').textContent(),first,'clock ticks without chat/model');
 async function send(text){await page.locator('#prompt').fill(text);await page.locator('#form').evaluate(f=>f.requestSubmit());}
 await send('Can you tell me the time in karachi');await page.waitForFunction(()=>document.getElementById('messages').textContent.includes('Asia/Karachi'));
 assert.equal(providerCalls,0);assert(!requests.some(x=>/huggingface|esm.run/.test(x)),'clock must not load AI');
 await send('Weather here');await page.waitForFunction(()=>document.getElementById('messages').textContent.includes('Which city or region'));assert.equal(ipCalls,0);
 await page.locator('#yap-location-controls summary').click();await page.getByRole('button',{name:'Use approximate IP location',exact:true}).click();await page.waitForFunction(()=>YapLocation.snapshot().source==='ip');assert.equal(ipCalls,1);
 await page.getByRole('button',{name:'Use device location once',exact:true}).click();await page.waitForFunction(()=>YapLocation.snapshot().source==='device');assert.match(await page.locator('#yap-location-state').textContent(),/24.86, 67.00/);
 await page.getByRole('button',{name:'Forget location',exact:true}).click();assert.equal(await page.evaluate(()=>YapLocation.snapshot().label),undefined);
 await page.getByLabel('City or region',{exact:true}).fill('London');await page.getByLabel('IANA timezone',{exact:true}).fill('Europe/London');await page.getByRole('button',{name:'Use entered city',exact:true}).click();
 assert.equal(await page.evaluate(()=>YapLocation.queryFor('Weather in Karachi today')),'Weather in Karachi today');
 await page.locator('#yap-location-controls summary').click();
 await page.evaluate(()=>{window.YapWebAccount={getUserId:()=> 'test-user',getToken:async()=> 'test-token',getQuota:()=>({remaining:20,limit:20}),status:async()=>{},memoryName:async()=>''};});
 await send('Weather in Karachi today');await page.waitForFunction(()=>document.querySelectorAll('.yap-sources a').length>0);
 assert.equal(providerCalls,2);failSearch=true;await send('Current prices in Karachi');await page.waitForFunction(()=>document.querySelectorAll('.message a').length&&document.getElementById('messages').textContent.includes('I couldn’t retrieve current sources'));assert.equal(providerCalls,4,'quota stops fallback');assert.match(await page.locator('#messages').textContent(),/Search snippets/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await page.locator('#yap-location-controls summary').click();assert.equal(await page.locator('.yap-location-options').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}),true,'location options fit phone');
 const output=process.env.YAP_QA_OUTPUT;if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'website-location-mobile.png')});}
 for(const width of [360,768,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'overflow at '+width);}
 assert.deepEqual(errors,[],'website runtime errors');
 if(fs.existsSync(native)){
  await page.goto(origin+'/native/index.html');await page.waitForSelector('#yap-live-clock');await page.setViewportSize({width:390,height:844});
  await page.locator('#message-input').fill('What time is it in Karachi?');await page.locator('#chat-form').evaluate(f=>f.requestSubmit());await page.waitForFunction(()=>document.getElementById('messages').textContent.includes('Asia/Karachi'));
  assert.equal(await page.evaluate(()=>current.messages.at(-1).source),'clock');
  await page.evaluate(()=>{YapLocation.manual('Karachi','Asia/Karachi');YapAssistant.setAccount('123e4567-e89b-12d3-a456-426614174000');});assert.equal(await page.evaluate(()=>YapLocation.snapshot().label),undefined,'native account switch forgets location');
  if(output)await page.screenshot({path:path.join(output,'native-location-clock.png')});
 }
 await context.close();console.log('PASS browser: guest clock without AI, ticking header, unknown-location question, opt-in IP, rounded device location, forget, explicit-place priority, real chat research fallback and responsive controls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
