'use strict';
// Every request uses the current user's JWT. No automatic retry or provider token in the browser.
window.YapCoding=(()=>{
 const base='https://uemjkfvcadggyvhbqqyp.supabase.co',key='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
 let revision=0;
 window.addEventListener('yap:session-change',()=>{revision++;});
 async function call(path,body){
  const actor=window.YapWebAccount?.getUserId?.(),epoch=revision;
  const fresh=()=>actor&&actor===window.YapWebAccount?.getUserId?.()&&epoch===revision&&!window.YapWebChat?.isIncognito?.();
  if(!fresh())throw Error('Sign in outside Incognito to use YapCoding.');
  const jwt=await window.YapWebAccount.getToken();if(!fresh())throw Error('Account changed. Discarding result.');
  const r=await fetch(base+path,{method:body?'POST':'GET',headers:{apikey:key,authorization:'Bearer '+jwt,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(body?100000:15000)});
  const data=await r.json().catch(()=>({}));
  if(!fresh())throw Error('Account changed. Discarding result.');
  if(!r.ok)throw Error(String(data.error||'YapCoding unavailable')+'. '+String(data.reason||data.notice||''));
  return data;
 }
 return Object.freeze({status:()=>call('/functions/v1/yapcode-execute'),connection:repo=>call('/functions/v1/yapcode-execute?check=github&repo='+encodeURIComponent(repo)),execute:input=>call('/functions/v1/yapcode-execute',input),
  history:()=>call('/rest/v1/yapcode_runs?select=id,input,status,result,created_at,updated_at&order=created_at.desc&limit=10')});
})();
(()=>{
 const dialog=document.getElementById('yapcode-dialog'),settings=dialog?.querySelector('.yc-settings');
 if(!settings)return;
 const panel=document.createElement('section');panel.id='yapcoding-cloud';
 panel.innerHTML='<h3>Cloud draft PR</h3><p>Connect GitHub in Plugins. Choose up to three existing source files. YapCoding sends their contents to Gemini and creates a draft PR for review. Tests are not run and changes are not merged. Payments are disabled.</p>'+
 '<label>Repository<input id="yca-repo" placeholder="owner/repository" autocomplete="off" maxlength="140"></label>'+
 '<label>Existing source paths (up to 3)<textarea id="yca-paths" rows="3" placeholder="src/app.js" maxlength="500"></textarea></label>'+
 '<label>Change to make<textarea id="yca-goal" rows="3" maxlength="1000"></textarea></label>'+
 '<label><input id="yca-consent" type="checkbox"> Send these selected files to Gemini and create a GitHub draft PR.</label>'+
 '<div class="yc-actions"><button type="button" data-yca="status">Check availability</button><button type="button" data-yca="connection">Check GitHub access</button><button type="button" data-yca="execute">Create draft PR</button><button type="button" data-yca="history">My recent results</button></div>'+
 '<p id="yca-status" role="status" aria-live="polite">Execution is stopped pending live integration verification.</p><pre id="yca-output" tabindex="0"></pre>';
 settings.prepend(panel);
 const $=id=>panel.querySelector('#yca-'+id);
 let busy=false,attempt=null;
 function clear(){attempt=null;for(const id of ['repo','paths','goal'])$(id).value='';$('consent').checked=false;$('output').textContent='';$('status').textContent='Account changed. Check availability before submitting.';}
 window.addEventListener('yap:session-change',clear);
 window.addEventListener('yap:incognito-change',clear);
 panel.addEventListener('click',async event=>{
  const action=event.target.closest('[data-yca]')?.dataset.yca;if(!action||busy)return;
  busy=true;const actor=window.YapWebAccount?.getUserId?.();const buttons=[...panel.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{
   let data;
   if(action==='execute'){
    if(!$('consent').checked)throw Error('Select the file-sharing and draft PR consent checkbox first.');
    const input={repo:$('repo').value.trim(),paths:$('paths').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),goal:$('goal').value.trim(),consent:true};
    const fingerprint=JSON.stringify(input);
    if(attempt&&attempt.fingerprint!==fingerprint)throw Error('Inspect My recent results before starting a different request.');
    if(!attempt)attempt={fingerprint,key:crypto.randomUUID()};
    $('status').textContent='Drafting. If interrupted, inspect My recent results before starting another task.';
    data=await window.YapCoding.execute({...input,request_key:attempt.key});
    if(data.status==='completed'||data.task?.status==='completed'){attempt=null;$('consent').checked=false;}
   }else if(action==='connection')data=await window.YapCoding.connection($('repo').value.trim());
   else data=await window.YapCoding[action]();
   if(actor!==window.YapWebAccount?.getUserId?.())throw Error('Account changed. Discarding result.');
   $('output').textContent=JSON.stringify(data,null,2);
   $('status').textContent=action==='connection'?(data.github?.can_push?'GitHub write access verified for '+data.github.name+'.':'GitHub is connected, but repository write access is missing.'):action==='status'?(data.task_submission_enabled?'Bounded draft PR creation is available.':'Execution is stopped. '+(data.control?.reason||'')):action==='history'?'Your saved results. Failed or interrupted tasks may require checking their recorded branch.':'Draft result saved. Review the PR and run trusted tests before merging.';
  }catch(e){$('status').textContent=e.message||'YapCoding unavailable. Inspect recent results before retrying.';}
  finally{busy=false;buttons.forEach(b=>b.disabled=false);}
 });
})();
