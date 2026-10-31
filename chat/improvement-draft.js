'use strict';
(()=>{
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const dialog=el('dialog');dialog.id='yap-code-draft';const heading=el('h2','Give your code a better Yap');heading.id='yap-code-draft-title';dialog.setAttribute('aria-labelledby',heading.id);
const close=el('button','Close');close.type='button';close.onclick=()=>dialog.close();
const fileLabel=el('label','Choose one frontend file'),file=el('input');file.type='file';file.accept='.js,.css,.html';file.id='yap-draft-file';fileLabel.htmlFor=file.id;
const goalLabel=el('label','What should improve?'),goal=el('textarea');goal.id='yap-draft-goal';goalLabel.htmlFor=goal.id;goal.rows=3;goal.maxLength=1500;goal.placeholder='For example: make this menu work with a keyboard.';
const consentLabel=el('label'),consent=el('input');consent.type='checkbox';consentLabel.append(consent,document.createTextNode('Send this selected file and request to Gemini. I have removed secrets.'));
const status=el('p');status.setAttribute('role','status');const output=el('section');output.hidden=true;
const generate=el('button','Draft improvement');generate.type='button';let controller=null,result=null,original='',running=false;
function reset(){controller?.abort();controller=null;running=false;generate.disabled=false;file.value='';goal.value='';consent.checked=false;result=null;original='';output.replaceChildren();output.hidden=true;status.textContent='';}
dialog.append(close,heading,el('p','Gemini prepares a focused code change for review. One selected JS, CSS or HTML file, up to 10,000 characters. Uses one request from your AI allowance. No files are edited or published.'),fileLabel,file,goalLabel,goal,consentLabel,generate,status,output);document.body.append(dialog);
function open(){dialog.showModal();goal.focus();}
function download(){if(!result)return;const blob=new Blob([result.content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='draft-'+result.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
generate.onclick=async()=>{
 if(running)return;const uid=window.YapWebAccount?.getUserId(),thread=window.YapWebChat?.id();status.textContent='';
 if(!uid){status.textContent='Sign in before drafting with Gemini.';return;}
 const source=file.files?.[0];if(!source||source.size>40000||!consent.checked||goal.value.trim().length<8){status.textContent='Choose a small code file, describe the improvement, and confirm sending it to Gemini.';return;}
 running=true;generate.disabled=true;result=null;output.hidden=true;output.replaceChildren();controller=new AbortController();
 try{
 const content=await source.text();if(content.length>10000||!content.trim())throw Error('Choose a file between 1 and 10,000 characters.');
 const token=await window.YapWebAccount.getToken();if(uid!==window.YapWebAccount?.getUserId())throw Error('Your account changed.');
 status.textContent='Gemini is preparing your draft…';
 const response=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-improvement-draft',{method:'POST',headers:{authorization:'Bearer '+token,apikey:'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ','content-type':'application/json'},body:JSON.stringify({goal:goal.value.trim(),file:{name:source.name,content}}),signal:controller.signal});
 const data=await response.json().catch(()=>({}));if(uid!==window.YapWebAccount?.getUserId()||controller.signal.aborted)return;if(!response.ok)throw Error(data.error||'Code drafting is unavailable.');
 if(typeof data.content!=='string'||typeof data.name!=='string')throw Error('The draft could not be validated.');
 result=data;original=content;output.hidden=false;output.append(el('h3','Proposed improvement'),el('p',data.summary),el('p','Generated draft. No tests have run.'));
 for(const [title,text] of [['Original',original],['Proposed',data.content]]){const details=el('details');details.append(el('summary',title),el('pre',text));output.append(details);}
 const checks=el('ul');for(const check of data.checks||[])checks.append(el('li',check));output.append(el('h3','Suggested checks'),checks);
 const save=el('button','Download draft');save.type='button';save.onclick=download;output.append(save);
 const add=el('button','Add draft to this chat');add.type='button';add.onclick=()=>{if(uid!==window.YapWebAccount?.getUserId()||thread!==window.YapWebChat?.id()){status.textContent='Return to the original chat to add this draft.';return;}window.YapWebChat.add('Code improvement draft: '+data.name+'\n'+data.summary+'\n\n'+String.fromCharCode(96).repeat(3)+'\n'+data.content+'\n'+String.fromCharCode(96).repeat(3)+'\n\nSuggested checks (not run):\n'+(data.checks||[]).join('\n'));add.disabled=true;dialog.close();};output.append(add);
 status.textContent='Draft ready to review. Your original file is unchanged.';
 }catch(error){if(error.name!=='AbortError')status.textContent=error.message;}
 finally{running=false;generate.disabled=false;window.YapWebAccount?.status().catch(()=>{});}
};
dialog.addEventListener('close',()=>{if(running){controller?.abort();status.textContent='Request stopped. If Gemini had already started, the AI allowance may still be used.';}});
let owner=window.YapWebAccount?.getUserId()||'';window.addEventListener('yap:session-change',()=>{const next=window.YapWebAccount?.getUserId()||'';if(next!==owner){owner=next;dialog.close();reset();}});
window.YapImprovementDraft={open};
})();
