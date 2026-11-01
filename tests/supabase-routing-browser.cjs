'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+name);if(!f.startsWith(root+path.sep))throw Error('path');const target=fs.statSync(f).isDirectory()?path.join(f,'index.html'):f;res.setHeader('content-type',target.endsWith('.js')?'application/javascript':target.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:840}}),errors=[];let apiCalls=0,searchCalls=0,answerStatus=200;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1'))return r.continue();if(/search-web|public-research|grounded-search/.test(u))searchCalls++;return r.fulfill({status:200,contentType:'application/json',body:'{}'});});
 await page.route('**/functions/v1/yap-dev-read',async r=>{apiCalls++;const b=r.request().postDataJSON();assert.equal(b.provider,'supabase');return r.fulfill({status:answerStatus,contentType:'application/json',body:JSON.stringify(answerStatus===200?(b.action==='functions'?{functions:[{name:'hello',status:'ACTIVE',version:1}]}:{projects:[{name:'Private project',ref:'abcdefghijklmnopqrst',region:'us-east-1',status:'ACTIVE'}]}):{error:answerStatus===409?'Connect supabase to YapThing Plugins first':'Permission denied. Check provider scopes or app installation.'})});});
 await page.goto('http://127.0.0.1:'+server.address().port+'/chat/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.YapSupabaseTools&&window.YapCode&&window.YapKnowledge);
 await page.evaluate(()=>{window.YapWebAccount={...window.YapWebAccount,getUserId:()=> 'test-user',getToken:async()=> 'test-session'};window.YapWorkClient={...window.YapWorkClient,account:()=> 'test-user'};});
 const submit=async q=>{await page.locator('#prompt').fill(q);await page.locator('#form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));};
 await submit('List my Supabase projects');await page.getByText('Private project',{exact:false}).waitFor();assert.equal(apiCalls,1);assert.equal(searchCalls,0);
 answerStatus=409;await submit('show my supabase projects');await page.getByText('Connect supabase',{exact:false}).waitFor();assert.equal(apiCalls,2);assert.equal(searchCalls,0);
 answerStatus=403;await submit('/supabase projects');await page.getByText('Supabase request failed: Permission denied',{exact:false}).waitFor();
 const count=apiCalls;await submit('deploy my Supabase repository owner/repo');await page.getByText('This connection cannot execute database changes.',{exact:false}).waitFor();assert.equal(apiCalls,count);assert.equal(searchCalls,0);
 const guarded=await page.evaluate(async()=>{let blocked=0;for(const f of [window.YapResearchFallback.research,window.YapKnowledge.research]){try{await f('Supabase academic papers latest')}catch(e){if(/No web or academic fallback/.test(e.message))blocked++;}}return blocked;});assert.equal(guarded,2);assert.equal(searchCalls,0);
 answerStatus=200;await page.evaluate(()=>window.YapCode.open());await page.locator('#yc-supabase-request').fill('list my Supabase projects');await page.locator('[data-yc=supabase]').click();await page.getByText('Supabase read complete. No Work credits used.',{exact:true}).waitFor();assert.match(await page.locator('#yc-log').innerText(),/Private project/);
 await page.locator('#yc-supabase-request').fill('Supabase functions abcdefghijklmnopqrst');await page.locator('[data-yc=supabase]').click();await page.waitForFunction(()=>document.getElementById('yc-log').textContent.includes('hello'));
 await page.locator('[data-yc=close]').click();
 await submit('/plugin supabase functions abcdefghijklmnopqrst');await page.locator('#messages').getByText('hello · ACTIVE · version 1',{exact:false}).waitFor();
 const requestsBefore=apiCalls;await submit('Supabase functions bad-ref');await page.getByText('This Supabase action cannot execute.',{exact:false}).last().waitFor();assert.equal(apiCalls,requestsBefore);

 await page.evaluate(()=>window.YapWebChat.setIncognito(true));const before=apiCalls;await submit('list my Supabase projects');await page.getByText('Connected apps are unavailable in Incognito. Start a normal chat to use them.',{exact:false}).waitFor();assert.equal(apiCalls,before);assert.equal(searchCalls,0);
 assert.deepEqual(errors,[]);console.log('PASS chat + YapCode, missing connection, permission denial, unsupported writes, Incognito, no research fallback '+width+'px');await page.close();
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
