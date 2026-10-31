'use strict';
(()=>{
const form=document.querySelector('#form'),field=document.querySelector('#prompt');
if(!form||!field)return;
function show(value){const root=document.querySelector('#messages');if(!root)return;const box=document.createElement('div');box.className='yap-plugin-result';box.setAttribute('role','status');box.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;border:1px solid var(--border);border-radius:12px;margin:8px 0';box.textContent=String(value||'').slice(0,17000);root.append(box);root.scrollTop=root.scrollHeight;}
const parse=s=>{s=String(s||'').trim();if(!s.startsWith('/plugin '))return null;const q=s.slice(8).trim();if(q==='github repos')return ['gr'];if(q==='supabase projects')return ['sp'];let m=q.match(/^supabase functions ([a-z0-9]{20,30})$/);if(m)return ['sf',m[1]];m=q.match(/^github issues ([\w.-]+)\/([\w.-]+)$/);if(m)return ['gi',m[1],m[2]];m=q.match(/^github file ([\w.-]+)\/([\w.-]+) (.+)$/);if(m)return ['gf',m[1],m[2],m[3]];return null;};
async function run(c){const api=window.YapDeveloperClient;if(!api)throw Error('Developer plugin unavailable');
if(c[0]==='sp'){const d=await api.supabaseProjects();return show((d.projects||[]).map(x=>x.name+' · '+x.ref+' · '+x.region).join('\n')||'No projects visible');}
if(c[0]==='sf'){const d=await api.supabaseFunctions(c[1]);return show((d.functions||[]).map(x=>x.name+' · '+x.status).join('\n')||'No functions visible');}
if(c[0]==='gi'){const d=await api.githubIssues(c[1],c[2]);return show((d.issues||[]).map(x=>'#'+x.number+' '+x.title+'\n'+x.url).join('\n')||'No issues visible');}
if(c[0]==='gf'){const d=await api.githubFile(c[1],c[2],c[3]);return show('GitHub '+c[1]+'/'+c[2]+'/'+c[3]+'\n\n'+String(d.content||''));}
if(c[0]==='gr'){const d=await api.githubInstallations();const all=[];for(const x of (d.installations||[]).slice(0,4)){const repos=await api.githubRepositories(x.id);all.push(x.account+'\n'+(repos.repositories||[]).map(r=>r.name).join('\n'));}return show(all.join('\n\n')||'No GitHub App installations. Install the app in GitHub first');}}
form.addEventListener('submit',e=>{const c=parse(field.value);if(!c)return;e.preventDefault();e.stopImmediatePropagation();field.value='';if(window.YapWebChat?.isIncognito?.()){window.YapWebChat.add('Connected developer plugin actions are unavailable in Incognito. Start a normal chat to use GitHub or Supabase.','assistant');return;}run(c).catch(err=>show('Developer plugin unavailable: '+err.message+'\nConnect your provider in YapThing Plugins.'));},true);
})();