'use strict';
/* Deterministic GitHub reads only. Repository text is data, never executable instructions. */
window.YapGitHubTools=(()=>{
 const help='Supported GitHub tools: list my GitHub repositories; GitHub issues owner/repo; GitHub pull requests owner/repo; GitHub file owner/repo src/app.js; GitHub repository owner/repo. Writes, cloning and deployments require the separate reviewed computer workflow.';
 const general=q=>/^(?:what (?:is|are)|how does|explain)\b/i.test(String(q||''))&&!/\b(my|our|this project|connected)\b/i.test(String(q||''));
 const matches=q=>!general(q)&&/\bgithub\b|github\.com\/|^\/github\b/i.test(String(q||''));
 function parse(q){
  let t=String(q||'').trim().replace(/^\/plugin\s+/i,'').replace(/^\/github\b/i,'github');
  if(!matches(t))return null;
  if(/\b(delete|remove|create|publish|push|merge|deploy|commit|clone|write|edit|update|fix|implement)\b/i.test(t))return {action:'unsupported'};
  const m=t.match(/(?:github\.com\/)?([A-Za-z0-9][\w.-]{0,98})\/([\w.-]{1,100})/);
  if(!m&&/\b(repos|repositories)\b/i.test(t)&&/\b(list|show|my|repos|repositories)\b/i.test(t))return {action:'list_repositories'};
  if(!m)return {action:'unsupported'};
  const owner=m[1],repo=m[2].replace(/[.,!?]+$/,'');
  const file=t.match(/\bfile\s+(?:https:\/\/github\.com\/)?[\w.-]+\/[\w.-]+\s+(.+)$/i);
  if(file)return {action:'file',owner,repo,path:file[1].trim()};
  if(/\breadme\b/i.test(t))return {action:'file',owner,repo,path:'README.md'};
  if(/\b(issues?)\b/i.test(t))return {action:'issues',owner,repo};
  if(/\b(pull requests?|prs?)\b/i.test(t))return {action:'pull_requests',owner,repo};
  if(/\b(repository|repo|describe|about|summary|summarize|show|inspect)\b/i.test(t))return {action:'repository',owner,repo};
  return {action:'unsupported'};
 }
 async function execute(request){
  if(!request||request.action==='unsupported')throw Error('This GitHub action cannot execute. '+help);
  if(window.YapWebChat?.isIncognito?.())throw Error('GitHub connections are unavailable in Incognito. Use a normal chat.');
  const api=window.YapDeveloperClient;
  if(!api)throw Error('GitHub tools did not load. Reload YapThing and try again.');
  return api.githubExecute(request);
 }
 function format(d){
  if(d.repositories)return d.repositories.map(r=>r.name+(r.private?' (private)':'')+(r.url?'\n'+r.url:'')).join('\n\n')||'No repositories visible to this GitHub authorization.';
  if(d.issues||d.pull_requests)return (d.issues||d.pull_requests).map(r=>'#'+r.number+' '+r.title+'\n'+r.url).join('\n\n')||'No open '+(d.issues?'issues':'pull requests')+'.';
  if(d.repository){const r=d.repository;return r.name+'\n'+r.description+'\nDefault branch: '+r.default_branch+'\n'+r.url;}
  if(typeof d.content==='string')return d.path+'\n\n'+d.content+(d.truncated?'\n[Preview truncated]':'');
  throw Error('GitHub returned an unexpected response. Please retry.');
 }
 const conversation=()=>window.YapWebChat?.id?.()||'';
 let busy=false,generation=0;
 window.addEventListener('yap:session-change',()=>{generation++;busy=false;});
 async function submit(text){
  const request=parse(text);
  if(!request)return false;
  if(busy){window.YapWebChat?.add('A GitHub request is running. Wait for its result before retrying.','assistant');return true;}
  busy=true;const epoch=generation,chat=conversation(),identity=window.YapWebAccount?.getUserId?.();
  const same=()=>!window.YapWebChat?.isIncognito?.()&&epoch===generation&&chat===conversation()&&identity===window.YapWebAccount?.getUserId?.();
  window.YapWebChat?.add(text,'user');
  const activity=window.YapActivity?.start('github','Reading your authorized GitHub data…');
  try{const data=await execute(request);if(same())window.YapWebChat?.add(format(data),'assistant');activity?.finish('GitHub complete');}
  catch(e){if(same()||(window.YapWebChat?.isIncognito?.()&&request&&/Incognito/.test(String(e.message))))window.YapWebChat?.add('GitHub request failed: '+String(e.message||e)+'\nNo research search was run.','assistant');activity?.finish('GitHub unavailable',true);}
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
