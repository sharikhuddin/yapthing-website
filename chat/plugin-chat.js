'use strict';
/* User-directed YapThing plugin commands. Google credentials never enter the browser. */
(()=>{
 const form=document.getElementById('form'),input=document.getElementById('prompt');
 if(!form||!input)return;
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/';
 const anon='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 const show=text=>{
  const messages=document.getElementById('messages');if(!messages)return;
  const block=document.createElement('div');block.setAttribute('role','status');
  block.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0;padding:14px;border:1px solid var(--border);border-radius:13px;background:var(--panel);color:var(--fg);font:14px/1.55 system-ui';
  block.textContent=String(text||'').slice(0,20000);messages.append(block);messages.scrollTop=messages.scrollHeight;
 };
 const parse=text=>{
  const value=String(text||'').trim();
  const found=value.match(/^\/plugin(?:\s+(.*))?$/i);
  return found?String(found[1]||'').trim():null;
 };
 const session=()=>window.YapPluginConnections?.getToken?.();
 const help='Plugin commands:\n/plugin gmail inbox — show recent email subjects and snippets\n/plugin drive files — list authorized Drive files\n/plugin drive read FILE_ID — read a text note or Google Doc\n/plugin drive save Name | text to save — create a text note after confirmation\n/plugin github repos — list installed GitHub App repositories\n/plugin github file owner/repo README.md — read an authorized source file\n/plugin github issues owner/repo — list open issues\n/plugin supabase projects — list your authorized projects\n/plugin supabase functions PROJECT_REF — list Edge Functions\n/plugin github owner/repo — review a public repository\n/plugin connections — open https://yapthing.com/plugins/\n\nGoogle accounts must be connected separately in Plugins. Drive can access only files created or opened with YapThing.';
 async function handle(command){
  if(!command||/^help$/i.test(command)){show(help);return}
  if(/^connections$/i.test(command)){show('Connect Gmail or Google Drive at https://yapthing.com/plugins/. Each account must authorize Google separately.');return}
  if(/^gmail inbox$/i.test(command)){
   try{
    if(!session())throw Error('Sign in and connect Gmail in Plugins first.');
    const token=await session();
    const response=await fetch(base+'yap-gmail-messages',{method:'POST',headers:{authorization:'Bearer '+token,apikey:anon,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(22000)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'Gmail unavailable');
    const messages=Array.isArray(data.messages)?data.messages.slice(0,8):[];
    show(messages.length?'Recent Gmail messages:\n\n'+messages.map((m,i)=>(i+1)+'. '+String(m.subject||'(no subject)').slice(0,180)+'\nFrom: '+String(m.from||'').slice(0,160)+'\n'+String(m.snippet||'').slice(0,260)).join('\n\n'):'No recent Gmail messages.');
   }catch(e){show('Gmail unavailable: '+String(e.message||e)+'\nConnect Gmail at https://yapthing.com/plugins/');}
   return;
  }
  if(/^drive\s+(?:files|list)$/i.test(command)){
   try{
    const data=await window.YapDriveClient.list(),files=Array.isArray(data.files)?data.files:[];
    show(files.length?'Drive files available to YapThing:\n\n'+files.map((f,i)=>(i+1)+'. '+String(f.name||'Untitled')+'\nID: '+String(f.id||'')+'\nType: '+String(f.mimeType||'')).join('\n\n')+'\n\nUse /plugin drive read FILE_ID to preview a text file.':'No files granted to YapThing yet. Create a note in Plugins or with /plugin drive save Name | text.');
   }catch(e){show('Google Drive unavailable: '+String(e.message||e)+'\nConnect Drive in Plugins first.');}
   return;
  }
  const read=command.match(/^drive\s+read\s+([A-Za-z0-9_-]{5,150})$/i);
  if(read){
   try{const data=await window.YapDriveClient.read(read[1]);show('Google Drive: '+String(data.name||'File')+'\n\n'+String(data.text||'').slice(0,16000)+(data.truncated?'\n\n[Preview truncated]':''));}
   catch(e){show('Drive read unavailable: '+String(e.message||e));}return;
  }
  const save=command.match(/^drive\s+save\s+([^|\r\n]{1,120})\s*\|\s*([\s\S]{1,14000})$/i);
  if(save){
   const name=save[1].trim(),text=save[2].trim();
   if(!confirm('Save "'+name+'" to your connected Google Drive?')){show('Drive save canceled.');return}
   try{const data=await window.YapDriveClient.create(name,text,true);show('Saved to Google Drive: '+String(data.name||name)+'\nFile ID: '+String(data.id||''));}
   catch(e){show('Drive save failed: '+String(e.message||e));}return;
  }
  const repo=command.match(/^github\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/i);
  if(repo){
   try{
    const response=await fetch('https://api.github.com/repos/'+encodeURIComponent(repo[1])+'/'+encodeURIComponent(repo[2]),{headers:{accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error(response.status===404?'Repository not public or not found':'GitHub returned HTTP '+response.status);
    const data=await response.json();show('GitHub: '+String(data.full_name||'')+'\n'+String(data.description||'No description')+'\nStars: '+data.stargazers_count+'\n'+String(data.html_url||''));
   }catch(e){show('GitHub lookup failed: '+String(e.message||e));}return;
  }
  show('Unsupported command. Use /plugin help to see connected tools and commands.');
 }
 form.addEventListener('submit',e=>{
  const command=parse(input.value);if(command===null)return;
  e.preventDefault();e.stopImmediatePropagation();input.value='';handle(command);
 },true);
 window.YapPluginChat={showHelp:()=>handle('help')};
})();