'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync('supabase/functions/yap-dev-read/index.ts','utf8');
const uid='11111111-1111-4111-8111-111111111111',env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server',YAP_OAUTH_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64')};
let status=200,mode='ok',calls=[],row;
const json=(b,s=200,h={})=>new Response(JSON.stringify(b),{status:s,headers:h});
async function fakeFetch(url,opts={}){
 calls.push({url:String(url),opts});
 if(String(url).endsWith('/auth/v1/user'))return mode==='unauth'?json({},401):json({id:uid});
 if(String(url).includes('/rest/v1/'))return json(mode==='missing'?[]:[row]);
 if(String(url).startsWith('https://api.github.com')){
  if(status!==200)return json({},status,status===429?{'x-ratelimit-remaining':'0'}:{});
  if(String(url).includes('/user/repos'))return json([{full_name:'owner/private',private:true,html_url:'https://github.com/owner/private'}]);
  if(String(url).includes('/contents/'))return json({type:'file',size:4,encoding:'base64',path:'src/app.js',content:btoa('test')});
  return json([]);
 }
 throw Error('Unexpected network '+url);
}
const sandbox={Deno:{env:{get:n=>env[n]}},crypto,TextEncoder,TextDecoder,Uint8Array,Request,Response,AbortSignal,URLSearchParams,atob,btoa,fetch:fakeFetch};
let js=stripTypeScriptTypes(source).replace('export async function handler','async function handler').replace('Deno.serve(handler);','');
vm.createContext(sandbox);vm.runInContext(js+';globalThis.run=handler',sandbox);
const request=(body,origin='https://yapthing.com')=>new Request('https://test/function',{method:'POST',headers:{authorization:'Bearer session',origin},body:JSON.stringify(body)});
(async()=>{
 const key=await crypto.subtle.importKey('raw',Buffer.alloc(32,1),'AES-GCM',false,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode('user-oauth-token'));
 row={encrypted_access_token:Buffer.from(cipher).toString('base64'),access_iv:Buffer.from(iv).toString('base64')};
 let r=await sandbox.run(request({provider:'github',action:'list_repositories',user_id:'attacker'}));
 assert.equal(r.status,200);assert.equal((await r.json()).repositories[0].private,true);
 assert(calls.some(c=>c.url.includes('user_id=eq.'+uid)));assert(!calls.some(c=>c.url.includes('attacker')));
 assert.equal(calls.at(-1).opts.headers.authorization,'Bearer user-oauth-token');
 assert.equal(calls.at(-1).opts.redirect,'error');
 for(const [m,expected] of [['unauth',401],['missing',409]]){mode=m;calls=[];r=await sandbox.run(request({provider:'github',action:'list_repositories'}));assert.equal(r.status,expected);assert(!calls.some(c=>c.url.includes('api.github.com')));}
 mode='ok';
 for(const n of [401,403,404,429,500]){status=n;r=await sandbox.run(request({provider:'github',action:'list_repositories'}));assert.equal(r.status,({401:409,403:403,404:404,429:429,500:502})[n]);assert((await r.json()).code);}
 status=200;calls=[];r=await sandbox.run(request({provider:'github',action:'delete'}));assert.equal(r.status,400);assert(!calls.some(c=>c.url.includes('/rest/')));
 r=await sandbox.run(request({provider:'github',action:'file',owner:'owner',repo:'repo',path:'../secret.env'}));assert.equal(r.status,400);
 r=await sandbox.run(request({provider:'github',action:'file',owner:'owner',repo:'repo',path:'src/app.js'}));assert.equal(r.status,200);assert.equal((await r.json()).content,'test');
 r=await sandbox.run(request({provider:'github',action:'list_repositories'},'https://evil.example'));assert.equal(r.status,403);
 row.access_expires_at='2020-01-01';r=await sandbox.run(request({provider:'github',action:'list_repositories'}));assert.equal(r.status,409);
 console.log('PASS OAuth ownership, auth, credentials, permissions, expiry, rate limits, path checks and error codes');
})().catch(e=>{console.error(e);process.exitCode=1});
