'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));
async function main(){
const args=process.argv.slice(2),submit=args.includes('--submit'),config=JSON.parse(fs.readFileSync('indexnow.json','utf8')),manifest=JSON.parse(fs.readFileSync('search-manifest.json','utf8'));
let pages=manifest.pages;const at=args.indexOf('--changed-from');
if(at>=0){const ref=args[at+1];if(!ref||! /^[a-fA-F0-9^~]{7,45}$/.test(ref))throw Error('Expected a commit SHA with an optional parent suffix');
const changed=cp.execFileSync('git',['diff','--name-only',ref,'HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/);pages=pages.filter(p=>changed.includes(p.file))}
if(!pages.length){console.log('No changed public HTML pages to notify.');return}
const keyUrl=new URL(config.keyLocation);if(keyUrl.origin!==manifest.origin||config.host!==new URL(manifest.origin).host)throw Error('Unexpected verification host');
const key=fs.readFileSync(keyUrl.pathname.slice(1),'utf8').trim();if(!/^[a-f0-9]{32}$/.test(key))throw Error('Invalid IndexNow key');
if(!submit){console.log('DRY RUN: '+pages.length+' public URLs. Add --submit after successful deployment.');return}
async function get(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(url+' HTTP '+r.status);return r.text()}
if((await get(config.keyLocation)).trim()!==key)throw Error('Deployed key does not match; no notification sent');
const live=JSON.parse(await get(manifest.origin+'/search-manifest.json'));
if(JSON.stringify(live)!==JSON.stringify(manifest))throw Error('Live search manifest differs from this checkout; no notification sent');
for(const p of pages){const body=await get(p.url);if(crypto.createHash('sha256').update(body).digest('hex')!==p.sha256)throw Error('Deployed page differs: '+p.url+'; no notification sent')}
const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:config.host,key,keyLocation:config.keyLocation,urlList:pages.map(p=>p.url)}),signal:AbortSignal.timeout(30000)});
const result={observedAt:new Date().toISOString(),httpStatus:r.status,urlCount:pages.length,meaning:r.status===200?'URL notification received; indexing is not confirmed':r.status===202?'URL notification received; key validation pending; indexing is not confirmed':'Notification failed',urls:pages.map(p=>p.url)};
fs.writeFileSync('indexnow-result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
if(![200,202].includes(r.status))throw Error('IndexNow returned HTTP '+r.status);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
