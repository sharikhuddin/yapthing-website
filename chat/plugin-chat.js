'use strict';
/* YapThing plugin chat commands: explicit, bounded, user-initiated actions only. */
(()=>{
const form=document.getElementById('form'),prompt=document.getElementById('prompt');if(!form||!prompt)return;
const api='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-gmail-messages';
const anon='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
function result(message){const root=document.getElementById('messages');if(!root)return;const box=document.createElement('div');box.setAttribute('role','status');box.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;padding:14px;border:1px solid var(--border);border-radius:13px;background:var(--panel);color:var(--fg);font:14px/1.55 system-ui';box.textContent=message;root.append(box);root.scrollTop=root.scrollHeight}
function parse(value){const m=value.trim().match(/^\/plugin(?:\s+(.*))?$/i);return m?String(m[1]||'').trim():null}
async function handle(command){
if(!command||/^help$/i.test(command)){result('YapThing plugins — available chat commands:\n/plugin gmail inbox — read recent Gmail subjects and snippets (requires connected Gmail)\n/plugin github owner/repo — show public repository details\n/plugin connections — manage account connections\n/plugin help — show these commands\n\nOther private plugins are not yet available for chat execution.');return}
if(/^connections$/i.test(command)){result('Open YapThing Plugins to connect supported services: https://yapthing.com/plugins/');return}
if(/^gmail inbox$/i.test(command)){
try{if(!window.YapWebAccount?.getUserId())throw Error('Sign in to YapThing first.');if(!window.YapPluginConnections?.getToken)throw Error('Plugin connection service is unavailable.');const token=await window.YapPluginConnections.getToken();const response=await fetch(api,{method:'POST',headers:{authorization:'Bearer '+token,apikey:anon,'content-type':'application/json'},body:'{}'});const data=await response.json();if(!response.ok)throw Error(data.error||'Gmail request failed');const messages=Array.isArray(data.messages)?data.messages.slice(0,10):[];result(messages.length?'Recent Gmail messages:\n\n'+messages.map((m,i)=>(i+1)+'. '+String(m.subject||'(no subject)')+'\nFrom: '+String(m.from||'unknown')+'\n'+String(m.snippet||'').slice(0,250)).join('\n\n'):'No recent Gmail messages found.')}catch(e){result('Gmail unavailable: '+e.message+'\nConnect Gmail in YapThing Plugins and try again.')}return}
const repo=command.match(/^github\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/i);
if(repo){try{const response=await fetch('https://api.github.com/repos/'+encodeURIComponent(repo[1])+'/'+encodeURIComponent(repo[2]),{headers:{accept:'application/vnd.github+json'}});if(!response.ok)throw Error(response.status===404?'Repository not found or not public':'GitHub returned HTTP '+response.status);const data=await response.json();result('GitHub repository: '+data.full_name+'\n'+(data.description||'No description')+'\nStars: '+data.stargazers_count+' · Open issues: '+data.open_issues_count+'\nDefault branch: '+data.default_branch+'\n'+data.html_url)}catch(e){result('GitHub lookup failed: '+e.message)}return}
result('This plugin action is not supported yet. Type /plugin help for working commands.');
}
form.addEventListener('submit',e=>{const cmd=parse(prompt.value);if(cmd===null)return;e.preventDefault();e.stopImmediatePropagation();prompt.value='';handle(cmd)},true);
window.YapPluginChat={showHelp:()=>handle('help')};
})();