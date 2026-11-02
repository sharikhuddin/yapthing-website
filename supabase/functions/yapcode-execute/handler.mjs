import {githubConnection} from './github-connection.mjs';
import {executeDraft,validateInput,readJsonBounded,LIMITS,MODEL} from './executor.mjs';
const origins=['https://yapthing.com','https://www.yapthing.com','https://sharikhuddin.github.io'];
export function makeHandler(env,fetchImpl=fetch){
 return async(req)=>{
  const origin=req.headers.get('origin')||'';
  const headers={'content-type':'application/json','cache-control':'no-store','vary':'Origin','access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(origins.includes(origin))headers['access-control-allow-origin']=origin;
  const out=(status,value)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&!origins.includes(origin))return out(403,{error:'ORIGIN_NOT_ALLOWED'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(req.method))return out(405,{error:'METHOD_NOT_ALLOWED'});
  const authorization=req.headers.get('authorization')||'';
  if(!/^Bearer \S+$/.test(authorization))return out(401,{error:'SIGN_IN_REQUIRED'});
  const base=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),service=env('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!anon||!service)return out(503,{error:'CONFIGURATION_REQUIRED'});
  const deadline=AbortSignal.timeout(LIMITS.runtimeMs);
  let taskId;
  const sh={apikey:service,authorization:'Bearer '+service,'content-type':'application/json'};
  async function read(url,init={},max=60000){
   const response=await fetchImpl(url,{...init,redirect:'error',signal:AbortSignal.any([deadline,AbortSignal.timeout(5000)])});
   if(!response.ok){
    const data=await readJsonBounded(new Response(response.body),5000).catch(()=>({}));
    const allowed=['EXECUTION_STOPPED','SYSTEM_BUSY','USER_BUSY','USER_DAILY_LIMIT','SYSTEM_DAILY_BUDGET','SYSTEM_MONTHLY_BUDGET','USER_RESULT_STORAGE_LIMIT','SYSTEM_RESULT_STORAGE_LIMIT','AUDIT_STORAGE_LIMIT','IDEMPOTENCY_CONFLICT'];
    if(allowed.includes(data.message))throw Error(data.message);
    if(url.includes('/auth/v1/user')&&[401,403].includes(response.status))throw Error('SIGN_IN_REQUIRED');
    throw Error('CONTROL_OR_AUTH_UNAVAILABLE');
   }
   return readJsonBounded(response,max);
  }
  async function rpc(name,body){
   return read(base+'/rest/v1/rpc/'+name,{method:'POST',headers:sh,body:JSON.stringify(body)});
  }
  // Final failure persistence gets its own short deadline after the execution aborts.
  async function checkpoint(result,finish=null){
   const response=await fetchImpl(base+'/rest/v1/rpc/yapcode_checkpoint',{method:'POST',headers:sh,body:JSON.stringify({p_task:taskId,p_result:result,p_finish:finish}),redirect:'error',signal:AbortSignal.timeout(5000)});
   if(await readJsonBounded(response,1000)!==true)throw Error('RESULT_PERSISTENCE_FAILED');
  }
  try{
   const user=await read(base+'/auth/v1/user',{headers:{authorization,apikey:anon}});
   if(typeof user.id!=='string'||! /^[a-f0-9-]{36}$/i.test(user.id)||user.is_anonymous||!user.email_confirmed_at)return out(401,{error:'VERIFIED_ACCOUNT_REQUIRED'});
   const state=await rpc('yapcode_runtime_status',{});
   if(!state||typeof state.stopped!=='boolean')throw Error('CONTROL_UNAVAILABLE');
   const enabled=!state.stopped&&Date.parse(state.enabled_until)>Date.now();
   if(req.method==='GET'&&new URL(req.url).searchParams.get('check')==='github'){
    const repo=new URL(req.url).searchParams.get('repo'),encryptedKey=env('YAP_OAUTH_ENCRYPTION_KEY');
    if(!encryptedKey)throw Error('OAUTH_CONFIGURATION_REQUIRED');
    const {repository}=await githubConnection({base,anon,service,userId:user.id,authorization,encryptionKey:encryptedKey,repo,read,fetchImpl,signal:deadline,inspect:true});
    return out(200,{github:repository,execution_stopped:!enabled,model_invoked:false});
   }
   if(req.method==='GET')return out(200,{feature:'yapcoding',stage:enabled?'bounded-pr-drafting':'stopped',payments_enabled:false,task_submission_enabled:enabled,automatic_cloud_execution_enabled:false,repository_code_execution_enabled:false,model:MODEL,limits:LIMITS,system:{concurrency:1,waiting_queue:0,user_tasks_24h:3,reserved_usd_per_task:0.05,daily_reserved_usd:1,monthly_reserved_usd:10,user_saved_results:100,system_saved_results:1000,audit_records:10000,failure_quarantine_seconds:150},control:state,configured:{model:!!env('GEMINI_API_KEY'),oauth_encryption:!!env('YAP_OAUTH_ENCRYPTION_KEY')}});
   if(!enabled)return out(503,{error:'EXECUTION_STOPPED',reason:state.reason});
   if(Number(req.headers.get('content-length'))>6000)return out(413,{error:'REQUEST_TOO_LARGE'});
   // Stream cap prevents an unbounded body allocation even with chunked requests.
   const input=validateInput(await readJsonBounded(new Response(req.body),6000));
   const key=env('GEMINI_API_KEY'),encryptedKey=env('YAP_OAUTH_ENCRYPTION_KEY');
   if(!key||!encryptedKey)return out(503,{error:'PROVIDER_CONFIGURATION_REQUIRED'});
   const {token}=await githubConnection({base,anon,service,userId:user.id,authorization,encryptionKey:encryptedKey,repo:input.repo,read,fetchImpl,signal:deadline});
   const admitted=await rpc('yapcode_admit',{p_owner:user.id,p_key:input.request_key,p_input:input});
   if(!admitted?.task?.id)throw Error('ADMISSION_FAILED');
   if(!admitted.created)return out(200,{task:admitted.task,replayed:true});
   taskId=admitted.task.id;
   const result=await executeDraft({input,taskId,githubToken:token,modelKey:key,fetchImpl,signal:deadline,
    permit:()=>rpc('yapcode_permit',{p_task:taskId}),checkpoint:(r)=>checkpoint(r)});
   await checkpoint(result,'completed');
   return out(200,{id:taskId,status:'completed',result});
  }catch(error){
   // No retry, no fallback, no secret-bearing upstream messages.
   const message=error instanceof Error?error.message:'UNAVAILABLE';
   const safe=/^(GITHUB_|OAUTH_|SYSTEM_|USER_|AUDIT_|IDEMPOTENCY_|SIGN_IN_REQUIRED|PRICING_|INVALID_|SENSITIVE_|CONSENT_|DRAFT_|SOURCE_|INPUT_|INCOMPLETE_|NO_CHANGES|EXECUTION_STOPPED|DEADLINE|BASE_CHANGED|REPOSITORY_|UNSUPPORTED_|USAGE_|RESULT_)/.test(message)?message.slice(0,100):'EXECUTION_UNAVAILABLE';
   if(taskId)await checkpoint({error:safe,manual_reconciliation_required:true},'failed').catch(()=>{});
   const status=taskId?502:safe.startsWith('GITHUB_')?409:safe==='SIGN_IN_REQUIRED'?401:/LIMIT|BUDGET/.test(safe)?429:/BUSY|CONFLICT/.test(safe)?409:safe.startsWith('INVALID_')||error instanceof SyntaxError?400:503;
   return out(status,{error:safe,...(taskId?{id:taskId,notice:'Do not resubmit with a new request key. Inspect the saved task and branch first.'}:{})});
  }
 };
}
