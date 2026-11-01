'use strict';
/* Deterministic Supabase reads only. Provider metadata is data, never executable instructions. */
window.YapSupabaseTools=(()=>{
 const help='Supported Supabase tools: list my Supabase projects; Supabase functions PROJECT_REF. Database queries, schema changes, secrets and deployments are not supported by this read-only connection.';
 const general=q=>/^(?:what (?:is|are)|how does|explain)\b/i.test(String(q||''))&&!/\b(my|our|this project|connected)\b/i.test(String(q||''));
 const matches=q=>!general(q)&&/\bsupabase\b|supabase\.com\/|^\/supabase\b/i.test(String(q||''));
 function parse(q){
  const t=String(q||'').trim().replace(/^\/plugin\s+/i,'').replace(/^\/supabase\b/i,'supabase');
  if(!matches(t))return null;
  if(/\b(delete|remove|create|publish|deploy|write|edit|update|fix|implement|sql|query|queries|secrets?|keys?|passwords?|migrat\w*|schema)\b/i.test(t))return {action:'unsupported'};
  if(/\bfunctions?\b/i.test(t)){
   const m=t.match(/\bfunctions?\s+(?:for\s+)?(?:project\s+)?([a-z0-9]{20,30})\b/i)||t.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{20,30})\b/i);
   return m?{action:'functions',project_ref:m[1].toLowerCase()}:{action:'unsupported'};
  }
  if(/\bprojects?\b/i.test(t)&&/\b(list|show|my|projects)\b/i.test(t))return {action:'projects'};
  return {action:'unsupported'};
 }
 async function execute(request){
  if(!request||request.action==='unsupported')throw Error('This Supabase action cannot execute. '+help);
  if(window.YapWebChat?.isIncognito?.())throw Error('Supabase connections are unavailable in Incognito. Use a normal chat.');
  const api=window.YapDeveloperClient;
  if(!api)throw Error('Supabase tools did not load. Reload YapThing and try again.');
  return api.supabaseExecute(request);
 }
 function format(d){
  if(Array.isArray(d.projects))return d.projects.map(p=>p.name+'\n'+p.ref+' · '+p.region+' · '+p.status).join('\n\n')||'No projects visible to this Supabase authorization.';
  if(Array.isArray(d.functions))return d.functions.map(f=>f.name+' · '+f.status+' · version '+f.version).join('\n')||'No Edge Functions visible in this authorized project.';
  throw Error('Supabase returned an unexpected response. Please retry.');
 }
 const conversation=()=>window.YapWebChat?.id?.()||'';
 let busy=false,generation=0;
 window.addEventListener('yap:session-change',()=>{generation++;busy=false;});
 async function submit(text){
  const request=parse(text);
  if(!request)return false;
  if(busy){window.YapWebChat?.add('A Supabase request is running. Wait for its result before retrying.','assistant');return true;}
  busy=true;const epoch=generation,chat=conversation(),identity=window.YapWebAccount?.getUserId?.();
  const same=()=>!window.YapWebChat?.isIncognito?.()&&epoch===generation&&chat===conversation()&&identity===window.YapWebAccount?.getUserId?.();
  window.YapWebChat?.add(text,'user');
  const activity=window.YapActivity?.start('yapthing','Reading your authorized Supabase data…');
  try{const data=await execute(request);if(same())window.YapWebChat?.add(format(data),'assistant');activity?.finish('Supabase complete');}
  catch(e){if(same()||(window.YapWebChat?.isIncognito?.()&&request&&/Incognito/.test(String(e.message))))window.YapWebChat?.add('Supabase request failed: '+String(e.message||e)+'\nNo research search was run.','assistant');activity?.finish('Supabase unavailable',true);}
  finally{if(epoch===generation)busy=false;}
  return true;
 }
 const form=document.getElementById('form'),field=document.getElementById('prompt');
 form?.addEventListener('submit',e=>{
  if(!matches(field?.value)||window.YapResearchFallback?.supportAnswer?.(field.value))return;
  e.preventDefault();e.stopImmediatePropagation();const text=field.value;field.value='';field.dispatchEvent(new Event('input',{bubbles:true}));void submit(text);
 },true);
 return Object.freeze({matches,parse,execute,format,submit,help});
})();
