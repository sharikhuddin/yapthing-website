const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{try{let p=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!p.startsWith(root+path.sep))throw Error();if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('content-type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{for(const width of [390,1280]){const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();page.setDefaultTimeout(4000);let approvals=0,job,saved;const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
await page.route('**/functions/v1/yap-work',r=>{const b=r.request().postDataJSON();let data={balance:{limit:100,used:0,remaining:100}};if(b.action==='save_project'){saved=b.project;data.saved=true;}if(b.action==='projects')data.projects=saved?[saved]:[];
if(b.action==='devices')data={devices:[{id:'device',name:'Test Windows PC',online:true}]};
if(b.action==='quote'){job={id:b.request_id,payload:b.task,approval_hash:'hash',status:'quoted',cost:0};data={job};}
if(b.action==='approve'){approvals++;data={job:{...job,status:'completed',result:{ok:true,data:job.payload.kind==='inspect'?{entries:[{name:'sample.txt',type:'file'}]}:job.payload.kind==='read'?{path:'sample.txt',content:'REMOTE_FILE_OK'}:{output:'REMOTE_CHECK_OK'}}}};}
if(b.action==='status')data={connected:true,jobs:[],balance:{limit:100,used:0,remaining:100}};
return r.fulfill({json:data});});
await page.goto('http://127.0.0.1:'+server.address().port+'/chat/');
await page.waitForFunction(()=>!!window.YapWorkChat&&!!window.YapComputerSetup);
await page.evaluate(()=>{window.YapWebAccount.getUserId=()=>'user-test';window.YapWebAccount.getToken=async()=> 'token';window.YapWebAccount.authFetch=window.fetch.bind(window);});
const send=async text=>{await page.locator('#prompt').fill(text);await page.locator('#form').evaluate(f=>f.requestSubmit());};
await send('Can YapThing connect to my computer?');await page.locator('#yap-connected-apps').waitFor({state:'visible'});await page.getByRole('button',{name:'Close connected apps'}).click();
await send('/projects');const editor=page.locator('.yap-project-editor');await editor.waitFor({state:'visible'});
await editor.getByLabel('Project name',{exact:true}).fill('MCP test');await editor.getByText('Computer and files (optional)',{exact:true}).click();
await editor.getByLabel('Project folder on your computer',{exact:true}).fill('C:/TestProject');await editor.getByRole('button',{name:'Find computers',exact:true}).click();await editor.getByRole('combobox',{name:'Project computer',exact:true}).selectOption('device');await editor.getByRole('button',{name:'Create project',exact:true}).click();
await editor.waitFor({state:'detached'});await send('list files');await page.getByText('sample.txt',{exact:true}).waitFor().catch(async e=>{console.log(await page.locator('body').innerText());throw e;});
await send('read file sample.txt');await page.getByText(/REMOTE_FILE_OK/).waitFor();
const before=approvals;await send('run tests');await page.getByRole('button',{name:'Run check',exact:true}).waitFor();assert.equal(approvals,before,'terminal check ran before approval');
await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(approvals,before);
await send('run tests');await page.getByRole('button',{name:'Run check',exact:true}).click();await page.getByText(/REMOTE_CHECK_OK/).waitFor();assert.equal(approvals,before+1);
assert.deepEqual(errors,[]);console.log('PASS connection wording, visible project setup, file routing and terminal permission '+width+'px');await ctx.close();}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
