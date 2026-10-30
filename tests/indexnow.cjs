'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync('scripts/indexnow.cjs','utf8'),origin='https://yapthing.com',key='a'.repeat(32),body='<html>verified fixture</html>';
const manifest={origin,pages:[{url:origin+'/',file:'index.html',sha256:crypto.createHash('sha256').update(body).digest('hex')}]};
async function scenario({submit=true,keyMatch=true,manifestMatch=true,pageMatch=true,status=202}={}){
const calls=[],writes=[],errors=[],proc={argv:['node','indexnow.cjs',...(submit?['--submit']:[])],chdir:()=>{},exitCode:0};
const fakeFS={readFileSync:p=>p==='indexnow.json'?JSON.stringify({host:'yapthing.com',keyLocation:origin+'/'+key+'.txt'}):p==='search-manifest.json'?JSON.stringify(manifest):key,writeFileSync:(p,s)=>writes.push({p,data:JSON.parse(s)})};
const fetch=async(u,opt={})=>{calls.push({u,opt});let text=u.endsWith('.txt')?(keyMatch?key:'wrong'):u.endsWith('search-manifest.json')?JSON.stringify(manifestMatch?manifest:{pages:[]}):pageMatch?body:'different';return{ok:true,status:u.includes('api.indexnow.org')?status:200,text:async()=>text}};
vm.runInNewContext(source,{require:n=>n==='node:fs'?fakeFS:require(n),__dirname:process.cwd()+'/scripts',process:proc,fetch,AbortSignal,URL,console:{log:()=>{},error:s=>errors.push(s)}});
for(let i=0;i<80;i++)await Promise.resolve();return{calls,writes,errors,proc}}
(async()=>{
let r=await scenario({submit:false});assert.equal(r.calls.length,0);
for(const opts of [{keyMatch:false},{manifestMatch:false},{pageMatch:false}]){r=await scenario(opts);assert.equal(r.proc.exitCode,1);assert(!r.calls.some(c=>c.u.includes('api.indexnow.org')))}
r=await scenario();assert.equal(r.proc.exitCode,0);assert.equal(r.writes[0].data.httpStatus,202);assert.match(r.writes[0].data.meaning,/validation pending/);assert(!JSON.stringify(r.writes).includes(key));assert.equal(JSON.parse(r.calls.at(-1).opt.body).urlList[0],origin+'/');
r=await scenario({status:429});assert.equal(r.proc.exitCode,1);assert.equal(r.writes[0].data.meaning,'Notification failed');
console.log('PASS: IndexNow dry-run default, deployed key/manifest/page guards, explicit submission, 202 semantics, key-free receipts and rate-limit failure.');
})().catch(e=>{console.error(e);process.exitCode=1});
