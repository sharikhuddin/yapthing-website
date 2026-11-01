const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}}),calls=[];
  await page.route('**/*',r=>r.abort());
  await page.route('https://uemjkfvcadggyvhbqqyp.supabase.co/**',async r=>{
   const data=r.request().postDataJSON();calls.push({method:r.request().method(),data,url:r.request().url()});
   await r.fulfill({status:data?502:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'},body:JSON.stringify(data?{error:'SIMULATED_INTERRUPTION',notice:'Inspect saved results'}:{task_submission_enabled:false,control:{reason:'Verification pending'}})});
  });
  await page.route('https://yapthing.com/qa',r=>r.fulfill({body:'<html></html>',contentType:'text/html'})); await page.goto('https://yapthing.com/qa'); await page.setContent('<dialog open id="yapcode-dialog"><div class="yc-settings"></div></dialog>');
  await page.evaluate(()=>{window.actor='user1';window.incognito=false;window.YapWebAccount={getUserId:()=>window.actor,getToken:async()=>'fake-session'};window.YapWebChat={isIncognito:()=>window.incognito};});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../chat/yapcoding-autonomous.js'),'utf8')});
  await page.click('[data-yca="status"]');await page.waitForFunction(()=>document.querySelector('#yca-status').textContent.includes('Verification pending'));
  await page.click('[data-yca="execute"]');await page.waitForFunction(()=>document.querySelector('#yca-status').textContent.includes('checkbox'));
  assert.equal(calls.filter(x=>x.method==='POST').length,0);
  await page.fill('#yca-repo','test/project');await page.fill('#yca-paths','src/app.js');await page.fill('#yca-goal','Improve the title');await page.check('#yca-consent');
  await page.click('[data-yca="execute"]');await page.waitForFunction(()=>document.querySelector('#yca-status').textContent.includes('SIMULATED_INTERRUPTION'));
  await page.click('[data-yca="execute"]');await page.waitForFunction(()=>document.querySelector('#yca-status').textContent.includes('SIMULATED_INTERRUPTION'));
  const posted=calls.filter(x=>x.method==='POST');assert.equal(posted.length,2);assert.equal(posted[0].data.request_key,posted[1].data.request_key);
  await page.evaluate(()=>{window.actor='user2';window.dispatchEvent(new Event('yap:session-change'));});
  assert.equal(await page.inputValue('#yca-repo'),'');assert.equal(await page.textContent('#yca-output'),'');
  await page.evaluate(()=>window.incognito=true);const before=calls.length;
  await page.click('[data-yca="status"]');await page.waitForFunction(()=>document.querySelector('#yca-status').textContent.includes('Incognito'));assert.equal(calls.length,before);
  await page.close();console.log('YapCoding browser checks passed at '+width+'px');
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

