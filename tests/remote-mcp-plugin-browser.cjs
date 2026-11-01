'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{try{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await context.addInitScript(()=>localStorage.setItem('yapthing.web.session.v1',JSON.stringify({access_token:'test-user-token',expires_at:4102444800})));
  let connected=false,unavailable=false,disconnects=0,badUrl=false,registrations=0;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
  await page.route('**/functions/v1/yap-plugin-connections',r=>r.fulfill({json:{providers:[]}}));
  await page.route('**/functions/v1/yap-work',r=>{
   const action=r.request().postDataJSON().action;
   if(unavailable)return r.fulfill({status:503,json:{error:'Temporarily unavailable'}});
   if(action==='disconnect'){disconnects++;connected=false;return r.fulfill({json:{connected:false}});}
   if(action==='devices')return r.fulfill({json:{devices:[{name:'Test Windows PC',online:true}]}});
   return r.fulfill({json:{connected}});
  });
  await page.route('**/functions/v1/yap-work-oauth',r=>{registrations++;return r.fulfill({json:{authorization_url:badUrl?'https://evil.test/authorize':'https://mcp.desktopcommander.app/authorize?client_id=test'}});});
  const url='http://127.0.0.1:'+server.address().port+'/plugins/';
  await page.goto(url);
  const card=page.locator('.pc-card').filter({has:page.getByRole('heading',{name:'Desktop Commander',exact:true})});
  await card.getByText('Connect securely',{exact:true}).waitFor();
  badUrl=true;await card.getByRole('button',{name:'Connect',exact:true}).click();
  await page.getByText('Untrusted authorization destination.',{exact:true}).waitFor();
  assert.equal(registrations,1);assert.equal(await page.url(),url);
  connected=true;await page.getByRole('button',{name:'Refresh connections',exact:true}).click();
  await card.getByText('Connected',{exact:true}).waitFor();await card.getByRole('button',{name:'Open',exact:true}).click();
  await page.getByRole('button',{name:'Check computers',exact:true}).click();
  await page.getByText('Test Windows PC · Online',{exact:true}).waitFor();
  assert.equal(disconnects,0);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Disconnect',exact:true}).click();
  await card.getByText('Connect securely',{exact:true}).waitFor();assert.equal(disconnects,1);
  unavailable=true;await page.getByRole('button',{name:'Refresh connections',exact:true}).click();
  await card.getByText('Connection unavailable',{exact:true}).waitFor();
  assert(!await card.getByText('Connected',{exact:true}).count());
  await page.evaluate(()=>localStorage.removeItem('yapthing.web.session.v1'));
  await page.getByRole('button',{name:'Refresh connections',exact:true}).click();
  await card.getByText('Sign in required',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS Remote MCP plugin status, devices, disconnect, URL validation and logout '+width+'px');
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
