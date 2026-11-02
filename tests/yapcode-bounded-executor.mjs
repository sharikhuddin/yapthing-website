import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInput,validateDraft,executeDraft,readJsonBounded,LIMITS} from '../supabase/functions/yapcode-execute/executor.mjs';
import {makeHandler} from '../supabase/functions/yapcode-execute/handler.mjs';
const input={repo:'test/project',goal:'Improve the title text',paths:['src/app.js'],request_key:'11111111-1111-4111-8111-111111111111',consent:true};
const taskId='22222222-2222-4222-8222-222222222222',a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),d='d'.repeat(40),e='e'.repeat(40);
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
function fixture(options={}){
 const calls=[],saved=[];let checks=0;
 const fetchImpl=async(url,init={})=>{
  calls.push({url,method:init.method||'GET',body:init.body&&JSON.parse(init.body)});
  const path=url.replace('https://api.github.com/repos/test/project','');
  if(url.includes('generativelanguage.googleapis.com')){
   if(options.modelError)return json({},429);
   return json({usageMetadata:{promptTokenCount:1000,candidatesTokenCount:100,...options.usage},candidates:[{finishReason:options.finish||'STOP',content:{parts:[{text:JSON.stringify(options.draft||{summary:'Update title',files:[{path:'src/app.js',content:'export const title="Better";'}]})}]}}]});
  }
  if(path==='')return json({full_name:'test/project',default_branch:'main',permissions:{push:!options.noPush}});
  if(path==='/git/ref/heads/main')return json({object:{sha:options.baseChanged&&calls.filter(x=>x.url.endsWith('/git/ref/heads/main')).length>1?e:a}});
  if(path==='/git/commits/'+a)return json({tree:{sha:b}});
  if(path==='/git/trees/'+b+'?recursive=1')return json({truncated:!!options.truncated,tree:[{path:'src/app.js',type:'blob',mode:options.mode||'100644',sha:c,size:20}]});
  if(path==='/git/blobs/'+c)return json({encoding:'base64',content:btoa('export const title="Old";')});
  if(path==='/git/trees')return json({sha:d});
  if(path==='/git/commits')return json({sha:e});
  if(path==='/git/refs')return json({ref:'refs/heads/yapcoding/'+taskId});
  if(path==='/pulls'){if(options.prError)throw Error('network error');return json({number:1,html_url:'https://github.com/test/project/pull/1'});}
  throw Error('Unexpected route '+url);
 };
 return {calls,saved,args:{input,taskId,githubToken:'fake-private-token',modelKey:'fake-model-key',fetchImpl,permit:async()=>++checks<=(options.stopAfter??999),checkpoint:async v=>{if(options.checkpointError)throw Error('storage unavailable');saved.push(v);}}};
}
test('successful bounded flow produces a draft PR and persists provenance and usage',async()=>{
 const f=fixture();const r=await executeDraft(f.args);assert.equal(r.pr_number,1);assert.equal(r.verified,false);
 const model=f.calls.find(x=>x.url.includes('generateContent'));assert.equal(model.body.generationConfig.maxOutputTokens,4096);assert.equal(model.body.generationConfig.thinkingConfig.thinkingLevel,'minimal');assert.equal(model.body.tools,undefined);
 const pr=f.calls.find(x=>x.url.endsWith('/pulls'));assert.equal(pr.body.draft,true);assert.equal(pr.body.base,'main');
 assert.equal(f.saved[0].base_sha,a);assert.ok(f.saved.some(x=>x.commit_sha===e));
 assert.ok(!JSON.stringify(f.saved).includes('fake-private-token'));
});
test('paths block traversal, workflows, credentials, billing, arbitrary extensions and duplicate files',()=>{
 for(const path of ['../a.js','.github/workflows/build.yml','src/auth.js','src/secret.js','deploy/a.js','src/a.sh','/src/a.js','src\\a.js'])assert.throws(()=>validateInput({...input,paths:[path]}));
 assert.throws(()=>validateInput({...input,paths:['src/app.js','src/app.js']}));assert.throws(()=>validateInput({...input,consent:false}));
});
test('draft cannot add unselected paths, duplicate, binary or oversized files',()=>{
 const files=[{path:'src/app.js',content:'old'}];
 for(const list of [[{path:'other.js',content:'x'}],[{path:'src/app.js',content:'\0'}],[{path:'src/app.js',content:'x'.repeat(24001)}],[{path:'src/app.js',content:'old'}]])assert.throws(()=>validateDraft({summary:'x',files:list},files));
});
for(const [name,opt] of [['write permissions',{noPush:true}],['symlink',{mode:'120000'}],['truncated tree',{truncated:true}],['incomplete model response',{finish:'MAX_TOKENS'}],['unverified usage',{usage:{promptTokenCount:18001}}],['provider rate limit',{modelError:true}]]){
 test(name+' fails before repository writes',async()=>{const f=fixture(opt);await assert.rejects(()=>executeDraft(f.args));assert.equal(f.calls.filter(x=>x.method==='POST'&&!x.url.includes('generativelanguage')).length,0);});
}
test('stop control prevents all external requests',async()=>{const f=fixture({stopAfter:0});await assert.rejects(()=>executeDraft(f.args),/EXECUTION_STOPPED/);assert.equal(f.calls.length,0);});
test('stop control checked again before each write',async()=>{const f=fixture({stopAfter:6});await assert.rejects(()=>executeDraft(f.args),/EXECUTION_STOPPED/);assert.equal(f.calls.some(x=>x.url.endsWith('/git/trees')),false);});
test('persistence failure prevents repository writes',async()=>{const f=fixture({checkpointError:true});await assert.rejects(()=>executeDraft(f.args));assert.equal(f.calls.some(x=>x.url.endsWith('/git/trees')),false);});
test('base drift prevents publishing a branch',async()=>{const f=fixture({baseChanged:true});await assert.rejects(()=>executeDraft(f.args),/BASE_CHANGED/);assert.equal(f.calls.some(x=>x.url.endsWith('/git/refs')),false);});
test('ambiguous PR failure never retries and preserves branch evidence',async()=>{const f=fixture({prError:true});await assert.rejects(()=>executeDraft(f.args));assert.equal(f.calls.filter(x=>x.url.endsWith('/pulls')).length,1);assert.ok(f.saved.some(x=>x.branch_created));});
test('bounded reader rejects streaming responses above the cap',async()=>{await assert.rejects(()=>readJsonBounded(new Response('x'.repeat(100)),50),/TOO_LARGE/);});
test('pre-aborted request makes no external calls',async()=>{const f=fixture();f.args.signal=AbortSignal.abort();await assert.rejects(()=>executeDraft(f.args),/DEADLINE/);assert.equal(f.calls.length,0);});
const env=k=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',GEMINI_API_KEY:'model',YAP_OAUTH_ENCRYPTION_KEY:'key'})[k];
test('gateway blocks anonymous and cross-origin calls before provider access',async()=>{
 let called=0;const handler=makeHandler(env,async()=>{called++;return json({});});
 assert.equal((await handler(new Request('https://example.com',{method:'POST'}))).status,401);
 assert.equal((await handler(new Request('https://example.com',{headers:{origin:'https://evil.example'}}))).status,403);assert.equal(called,0);
});
test('stopped gateway does not read OAuth credentials or invoke any provider',async()=>{
 const calls=[];const handler=makeHandler(env,async url=>{calls.push(url);return json(url.includes('/auth/')?{id:taskId,email_confirmed_at:'2026-01-01',is_anonymous:false}:{stopped:true,enabled_until:'-infinity',reason:'test stop'});});
 const response=await handler(new Request('https://example.com',{method:'POST',headers:{authorization:'Bearer session'},body:JSON.stringify(input)}));
 assert.equal(response.status,503);assert.equal(calls.length,2);assert.equal((await response.json()).error,'EXECUTION_STOPPED');
});
test('GET reports disabled payments and no customer-code execution',async()=>{
 const handler=makeHandler(env,async url=>json(url.includes('/auth/')?{id:taskId,email_confirmed_at:'2026-01-01'}:{stopped:true,enabled_until:'-infinity'}));
 const response=await handler(new Request('https://example.com',{headers:{authorization:'Bearer session'}}));const data=await response.json();assert.equal(data.payments_enabled,false);assert.equal(data.repository_code_execution_enabled,false);assert.equal(data.system.waiting_queue,0);
});

async function gatewayFixture({replay=false,expired=false,refresh=false,stopped=false}={}){
 const f=fixture(),checkpoints=[],db=[];let refreshed=false;
 const raw=new Uint8Array(32).fill(7),iv=new Uint8Array(12).fill(8),k=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode('fake-private-token')));
 const b64=v=>btoa(String.fromCharCode(...v));
 const environment=k=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',GEMINI_API_KEY:'model',YAP_OAUTH_ENCRYPTION_KEY:b64(raw)})[k];
 const handler=makeHandler(environment,async(url,init={})=>{
  if(url.startsWith('https://api.github.com')||url.includes('generativelanguage.googleapis.com'))return f.args.fetchImpl(url,init);
  db.push(url);
  if(url.includes('/functions/v1/yap-dev-read')){assert.equal(init.headers.authorization,'Bearer session');const b=JSON.parse(init.body);assert.equal(b.provider,'github');assert.equal(b.owner,'test');assert.equal(b.repo,'project');refreshed=refresh;return json({},refresh?200:409);}
  if(url.includes('/auth/'))return json({id:taskId,email_confirmed_at:'2026-01-01',is_anonymous:false});
  if(url.includes('runtime_status'))return json({stopped,enabled_until:'2026-12-01T00:00:00Z'});
  if(url.includes('oauth_credentials')){assert.ok(url.includes('user_id=eq.'+taskId));return json([{encrypted_access_token:b64(encrypted),access_iv:b64(iv),access_expires_at:expired&&!refreshed?'2020-01-01':null}]);}
  if(url.includes('yapcode_admit')){const body=JSON.parse(init.body);assert.equal(body.p_owner,taskId);return json({created:!replay,task:{id:taskId,status:'completed'}});}
  if(url.includes('yapcode_permit'))return json(true);
  if(url.includes('yapcode_checkpoint')){checkpoints.push(JSON.parse(init.body));return json(true);}
  throw Error('Unexpected gateway route');
 });
 return {handler,f,checkpoints,db};
}
test('gateway end-to-end auth, encrypted owner credential, admission, generation and PR storage',async()=>{
 const g=await gatewayFixture();
 const response=await g.handler(new Request('https://example.com',{method:'POST',headers:{authorization:'Bearer session'},body:JSON.stringify({...input,owner_id:'forged-other-user'})}));
 assert.equal(response.status,200);assert.equal((await response.json()).result.pr_number,1);assert.equal(g.checkpoints.at(-1).p_finish,'completed');
});
test('replayed admission never invokes the model or GitHub',async()=>{
 const g=await gatewayFixture({replay:true});const response=await g.handler(new Request('https://example.com',{method:'POST',headers:{authorization:'Bearer session'},body:JSON.stringify(input)}));
 assert.equal((await response.json()).replayed,true);assert.equal(g.f.calls.length,0);
});
test('expired GitHub connection fails before budget admission',async()=>{
 const g=await gatewayFixture({expired:true});const response=await g.handler(new Request('https://example.com',{method:'POST',headers:{authorization:'Bearer session'},body:JSON.stringify(input)}));
 assert.equal(response.status,409);assert.equal(g.db.some(x=>x.includes('yapcode_admit')),false);assert.equal(g.f.calls.length,0);
});

test('expired credential refresh stays bound to the same website caller and then completes',async()=>{
 const g=await gatewayFixture({expired:true,refresh:true});
 const response=await g.handler(new Request('https://example.com',{method:'POST',headers:{authorization:'Bearer session'},body:JSON.stringify(input)}));
 assert.equal(response.status,200);assert.equal(g.db.filter(x=>x.includes('yap-dev-read')).length,1);
 assert.equal(g.checkpoints.at(-1).p_finish,'completed');
});
test('connection readiness can refresh while execution is stopped without admitting or calling a model',async()=>{
 const g=await gatewayFixture({expired:true,refresh:true,stopped:true});
 const response=await g.handler(new Request('https://example.com?check=github&repo=test/project',{headers:{authorization:'Bearer session'}}));
 const data=await response.json();assert.equal(response.status,200);assert.equal(data.execution_stopped,true);
 assert.equal(data.github.can_push,true);assert.equal(data.model_invoked,false);
 assert.equal(g.db.some(x=>x.includes('yapcode_admit')),false);
 assert.equal(g.f.calls.some(x=>x.url.includes('generateContent')),false);
});

