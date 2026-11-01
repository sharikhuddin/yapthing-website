'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+name),target=fs.statSync(f).isDirectory()?path.join(f,'index.html'):f;if(!target.startsWith(root))throw Error('invalid');res.setHeader('content-type',target.endsWith('.js')?'application/javascript':target.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:840}}),page=await ctx.newPage(),errors=[];
  ctx.addInitScript(()=>localStorage.setItem('yapthing.web.session.v1',JSON.stringify({access_token:'fake-web',expires_at:4102444800})));
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.route('**/functions/v1/yap-plugin-connections',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({providers:[{id:'github',status:'connected',connect_available:true},{id:'supabase',status:'connected',connect_available:true}]})}));
  await page.route('**/functions/v1/yap-dev-read',async r=>{
   const b=JSON.parse(r.request().postData()||'{}');let data={};
   if(b.provider==='github'){
    if(b.action==='repos')data={installations:[{id:17,account:'my-github',repository_selection:'selected'}]};
    else if(b.action==='repositories')data={repositories:[{name:'my-github/example',private:true}]};
    else if(b.action==='file')data={content:'README test contents'};
   }else if(b.action==='projects')data={projects:[{ref:'abcdefghijklmnopqrst',name:'My Supabase',region:'us-east-1'}]};
   else if(b.action==='functions')data={functions:[{name:'hello-world',status:'ACTIVE'}]};
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/plugins/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.YapPluginCenter?.apps().some(a=>a.id==='github'&&a.status==='Connected'));
  const gh=page.locator('.pc-card').filter({has:page.getByRole('heading',{name:'GitHub account'})});
  await gh.getByRole('button',{name:'Open'}).click();
  await page.waitForTimeout(1200);console.log('GITHUB DIALOG',String(await page.locator('#pc-dialog').innerText()).slice(0,650),'ERRORS',errors);await page.getByText('my-github',{exact:false}).last().waitFor();
  await page.getByRole('button',{name:'Repositories',exact:true}).click();
  await page.getByText('my-github/example',{exact:false}).waitFor();
  await page.getByRole('button',{name:'README'}).click();
  await page.getByText('README test contents',{exact:false}).waitFor();
  await page.locator('#pc-dialog .pc-close').click();
  const supa=page.locator('.pc-card').filter({has:page.getByRole('heading',{name:'Supabase'})});
  await supa.getByRole('button',{name:'Open'}).click();
  await page.getByText('My Supabase',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Functions'}).click();
  await page.getByText('hello-world',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS GitHub + Supabase read-only plugin flow '+width+'px');
  await ctx.close();
 }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});