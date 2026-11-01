'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const live=process.env.YAPDOCS_LIVE;
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://local').pathname);if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}});
(async()=>{
 if(!live)await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=live||'http://127.0.0.1:'+server.address().port+'/chat/';
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{for(const width of [390,1280]){
 const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,serviceWorkers:'block'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('#yap-attachment-menu summary').click();
 await page.locator('#yapdocs-open').click();
 await page.locator('#yapdocs-panel').waitFor({state:'visible'});
 const box=await page.locator('#yapdocs-panel').boundingBox();assert(box.x>=0&&box.x+box.width<=width);
 const draft=page.locator('#yapdocs-draft');
 await draft.fill('');await page.getByRole('button',{name:'Download PDF',exact:true}).click();assert.match(await page.locator('#yapdocs-panel [role=status]').innerText(),/Enter or paste/);
 await draft.fill('Waqar Aziz\nTravel date: 14 June 2027\nAddress: A & B <City>\n'.repeat(20));
 for(const kind of ['docx','pdf']){
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:kind==='docx'?'Download Word (.docx)':'Download PDF',exact:true}).click();
 const result=await download;assert.equal(result.suggestedFilename(),'YapThing-document.'+kind);
 const bytes=fs.readFileSync(await result.path());assert(bytes.length>100);
 if(kind==='docx'){assert.equal(bytes.readUInt32LE(0),0x04034b50);assert(bytes.includes(Buffer.from('Waqar Aziz')));assert(bytes.includes(Buffer.from('A &amp; B &lt;City&gt;')));}
 else{assert(bytes.toString().startsWith('%PDF-1.4'));assert(bytes.toString().includes('14 June 2027'));assert(bytes.toString().includes('/Count 2'));}
 }
 await draft.fill('José — اردو');await page.getByRole('button',{name:'Download PDF',exact:true}).click();assert.match(await page.locator('#yapdocs-panel [role=status]').innerText(),/Download Word/);
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await draft.fill('Private local text');await page.getByRole('button',{name:'Download Word (.docx)',exact:true}).click();assert.equal(requests.length,0,'export must not make network requests');
 await page.getByRole('button',{name:'Close',exact:true}).click();assert(await page.locator('#yapdocs-panel').isHidden());
 assert.equal(errors.filter(e=>/yapdocs|YapDocs/.test(e)).length,0);
 console.log('PASS '+(live?'LIVE':'LOCAL')+' YapDocs at '+width+'px: menu, draft, real downloads, pagination, escaping, Unicode guard, no-network export, close');
 await context.close();
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
