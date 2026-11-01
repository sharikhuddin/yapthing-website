'use strict';
/* YapCode MVP: review-first multi-file coding, using existing YapThing Work backend.
   No arbitrary commands, client-side credentials, automatic writes, or silent publishing. */
(()=>{
 const work=()=>window.YapWorkClient;
 const hub=window.YapWorkHub;
 if(!work()||!hub||document.getElementById('yapcode-dialog'))return;
 const dialog=document.createElement('dialog');
 dialog.id='yapcode-dialog';
 dialog.setAttribute('aria-labelledby','yc-title');
 dialog.innerHTML=[
  '<header class="yc-header"><div><small>YAPTHING WORK</small><h2 id="yc-title">YapCode <span class="yc-version">MVP</span></h2><p>Plan, draft, review, test, then publish.</p></div><button type="button" data-yc="close" aria-label="Close YapCode">Close</button></header>',
  '<div class="yc-layout"><section class="yc-settings">',
  '<p class="yc-note">For the connected coding loop, use Gemini in chat below. It uses your selected chat project and existing allowances; relevant file context is sent to YapThing’s Gemini service. The advanced local workflow below runs a local Ollama model. Files stay on that computer. YapThing syncs job records through your account.</p>',
  '<h3>Connected GitHub (no Work credits)</h3><label>GitHub request<textarea id="yc-github-request" rows="2" placeholder="GitHub issues owner/repository"></textarea></label><button type="button" data-yc="github">Run GitHub read</button>',
  '<h3>Connected Supabase (no Work credits)</h3><label>Supabase request<textarea id="yc-supabase-request" rows="2" placeholder="List my Supabase projects"></textarea></label><button type="button" data-yc="supabase">Run Supabase read</button>',
  '<button type="button" data-yc="work">Connect or manage computer</button>',
  '<button type="button" data-yc="devices">Find connected computers</button>',
  '<label>Computer<select id="yc-device"><option value="">Select a computer</option></select></label>',
  '<label>Trusted project directory<input id="yc-root" placeholder="C:\\Projects\\my-app" autocomplete="off"></label>',
  '<button type="button" data-yc="models">Find local AI models (free)</button>',
  '<label>Coding model<select id="yc-model"><option value="">Choose a model</option></select></label>',
  '<label>Existing context files (one per line; maximum 6)<textarea id="yc-paths" rows="5" spellcheck="false" placeholder="src/app.js&#10;package.json"></textarea></label>',
  '<label>What should YapCode change?<textarea id="yc-prompt" rows="5" maxlength="3000" placeholder="Fix this bug and add tests. Keep existing functionality."></textarea></label>',
  '<div class="yc-actions"><button type="button" data-yc="cloud" class="yc-primary">Use Gemini coding in chat</button></div>',
  '<div class="yc-actions"><button type="button" data-yc="inspect">Explore folder (free)</button><button type="button" data-yc="draft" class="yc-primary">Generate project draft (5 credits)</button></div>',
  '<p class="yc-note">A draft does not modify files. Only chosen context files may be replaced; you approve each edit separately. No background or automatic deployment.</p>',
  '</section><section class="yc-output">',
  '<div class="yc-step"><span>1. Connect</span><span>2. Draft</span><span>3. Review</span><span>4. Test</span><span>5. PR</span></div>',
  '<p id="yc-status" role="status" aria-live="polite">Select a trusted project to begin.</p>',
  '<section id="yc-review" class="yc-review" hidden><h3>Approve this Work task</h3><p id="yc-review-cost"></p><pre id="yc-review-details"></pre><div class="yc-actions"><button type="button" data-yc="approve" class="yc-primary">Approve task</button><button type="button" data-yc="dismiss">Cancel preview</button></div></section>',
  '<section id="yc-draft-section" hidden><h3>Proposed changes</h3><p id="yc-summary"></p><div id="yc-files" class="yc-files"></div>',
  '<label>File contents (editable draft — nothing saved yet)<textarea id="yc-code" class="yc-code" spellcheck="false" rows="14"></textarea></label>',
  '<h3>Difference preview</h3><pre id="yc-diff"></pre><button type="button" data-yc="read-diff">Compare with actual file (free)</button>',
  '<div class="yc-actions"><button type="button" data-yc="write" class="yc-primary">Review & apply selected file (2 credits)</button></div>',
  '<h3>Verification</h3><label>Project check<select id="yc-check"><option value="npm_test">npm test</option><option value="npm_build">npm run build</option><option value="pytest">pytest</option><option value="dotnet_test">dotnet test</option></select></label>',
  '<button type="button" data-yc="check">Review & run test (1 credit)</button>',
  '<h3>GitHub draft PR</h3><label>GitHub repository<input id="yc-repo" placeholder="owner/repository" autocomplete="off"></label>',
  '<label>Branch<input id="yc-branch" autocomplete="off"></label>',
  '<label>PR title<input id="yc-pr-title" maxlength="120"></label>',
  '<div class="yc-actions"><button type="button" data-yc="diff">Review GitHub diff (free)</button><button type="button" data-yc="pr" class="yc-primary">Review draft PR (3 credits)</button></div>',
  '<p class="yc-note">GitHub CLI must be signed in on the computer. Pull requests are created as drafts, never merged automatically.</p>',
  '</section>',
  '<section id="yc-progress" hidden><h3>Running on your computer</h3><p id="yc-running"></p><button type="button" data-yc="poll">Check task status</button></section>',
  '<h3>Task output</h3><pre id="yc-log" tabindex="0">No task has run.</pre></section></div>'
 ].join('');
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#yc-'+id);
 const get=id=>$(id).value.trim();
 let actor='',busy=false,pending=null,running=null,draft=null,selected=0,original=new Map(),applied=new Set(),tested=false,githubReview=null;
 const note=message=>{$('status').textContent=String(message||'');};
 const output=data=>{$('log').textContent=typeof data==='string'?data:JSON.stringify(data,null,2).slice(0,20000);};
 const fail=e=>note(e?.message||'YapCode could not complete this action.');
 const owner=()=>work()?.account()||'';
 const fresh=()=>{
  if(actor===owner())return;
  actor=owner();pending=null;running=null;draft=null;original.clear();applied.clear();tested=false;githubReview=null;
  $('draft-section').hidden=true;$('review').hidden=true;$('progress').hidden=true;
  $('code').value='';$('log').textContent='No task has run.';$('summary').textContent='';
  for(const id of ['root','paths','prompt','repo','branch','pr-title','github-request','supabase-request'])$(id).value='';
  for(const id of ['device','model']){const control=$(id);control.replaceChildren();const option=document.createElement('option');option.value='';option.textContent=id==='device'?'Select a computer':'Choose a model';control.append(option);}
  if(!actor)note('Sign in to YapThing first, then connect a computer.');
 };
 function checkContext(){
  if(!owner())throw Error('Sign in to your YapThing account first.');
  const root=get('root'),deviceId=get('device');
  if(!root||!deviceId)throw Error('Select an online computer and enter a trusted project directory.');
  return {root,deviceId};
 }
 const paths=()=>get('paths').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 async function quote(task,kind){
  const response=await work().request('quote',{request_id:crypto.randomUUID(),task});
  if(!response?.job)throw Error('The Work server did not create a task.');
  return {job:response.job,kind};
 }
 async function free(task,kind){
  const {job}=await quote(task,kind);
  if(job.cost!==0)throw Error('This action unexpectedly requires credits. It was not approved.');
  return accept(job,kind);
 }
 async function accept(job,kind){
  const data=await work().request('approve',{id:job.id,approval_hash:job.approval_hash});
  return complete(data.job,kind);
 }
 async function complete(job,kind){
  if(!job)throw Error('No Work task result returned.');
  if(['running','uncertain'].includes(job.status)){
   running={id:job.id,kind};
   $('progress').hidden=false;$('running').textContent='Task '+job.status+'. Check its status before retrying; it may still be running.';
   note('YapCode task '+job.status+'. No duplicate task was started.');
   return;
  }
  running=null;$('progress').hidden=true;
  if(job.status!=='completed'||!job.result?.ok)throw Error(job.result?.error||'Task '+job.status+'.');
  const data=job.result.data||{};
  output(data);
  if(kind==='local_models'){
   const select=$('model');select.replaceChildren();
   for(const row of data.models||[]){const option=document.createElement('option');option.value=row.name;option.textContent=row.name;select.append(option);}
   if(!select.options.length)throw Error('No local Ollama models found. Install a coding model on your computer.');
   note('Local models found. Choose one and describe your changes.');
  }else if(kind==='inspect'){
   note('Folder inspected. Select up to six existing context files.');
  }else if(kind==='draft_project'){
   if(!Array.isArray(data.files)||!data.files.length)throw Error('AI returned no proposed files.');
   draft={files:data.files.map(f=>({path:f.path,content:f.content,expectedSha:f.expectedSha}))};
   selected=0;original.clear();applied.clear();tested=false;githubReview=null;
   $('summary').textContent=data.summary||'Review the proposed files before applying any changes.';
   $('draft-section').hidden=false;
   renderFiles();note('Draft generated; no files modified. Review each file before applying.');
  }else if(kind==='read'){
   original.set(data.path,data.content);preview();
   note('Compared draft against current file on your computer.');
  }else if(kind==='write'){
   const file=draft?.files[selected];
   if(file&&data.path===file.path){applied.add(file.path);file.expectedSha=data.sha256;original.set(file.path,file.content);}
   githubReview=null;tested=false;renderFiles();note('One approved file saved on your computer. Run project tests before creating a PR.');
  }else if(kind==='check'){
   tested=true;note('The selected project check completed successfully.');
  }else if(kind==='github_diff'){
   githubReview=data;note('GitHub diff reviewed. Verify the output and approve a draft PR separately.');
  }else if(kind==='github_pr'){
   note('Draft PR created. Review it on GitHub; no merge or deployment occurred.');
  }
 }
 function renderFiles(){
  if(!draft)return;
  const list=$('files');list.replaceChildren();
  draft.files.forEach((file,i)=>{
   const btn=document.createElement('button');btn.type='button';
   btn.textContent=(applied.has(file.path)?'✓ Applied: ':'Review: ')+file.path;
   btn.className=i===selected?'yc-selected':'';
   btn.onclick=()=>{saveEdit();selected=i;renderFiles();};
   list.append(btn);
  });
  const f=draft.files[selected];$('code').value=f.content;
  $('code').disabled=applied.has(f.path);
  preview();
 }
 function saveEdit(){
  if(!draft)return;
  const f=draft.files[selected];
  if(f&&!applied.has(f.path))f.content=$('code').value;
 }
 function preview(){
  if(!draft)return;
  const f=draft.files[selected],before=original.get(f.path);
  if(before===undefined){
   $('diff').textContent=f.expectedSha==='missing'?'New file; no existing contents.': 'Select "Compare with actual file" to display changes. The server checks the original file hash again before writing.';
   return;
  }
  if(before===f.content){$('diff').textContent='No changes to the selected file.';return;}
  const a=before.split('\n'),b=f.content.split('\n');let start=0;
  while(start<a.length&&start<b.length&&a[start]===b[start])start++;
  let tail=0;while(tail<a.length-start&&tail<b.length-start&&a[a.length-1-tail]===b[b.length-1-tail])tail++;
  const old=a.slice(start,a.length-tail).slice(0,70).map(x=>'- '+x);
  const updated=b.slice(start,b.length-tail).slice(0,70).map(x=>'+ '+x);
  $('diff').textContent='Changed section starting at line '+(start+1)+'\n'+old.concat(updated).join('\n').slice(0,12000)+
   (a.length-start-tail>70||b.length-start-tail>70?'\n[Preview shortened; review complete source above]':'');
 }
 function payload(kind){
  const c=checkContext();
  if(kind==='draft_project'){
   const selectedPaths=paths(),prompt=get('prompt'),model=get('model');
   if(!model)throw Error('Find and choose a local coding model.');
   if(selectedPaths.length>6)throw Error('Choose no more than six context files.');
   if(prompt.length<8)throw Error('Describe a specific coding task.');
   return {...c,kind,paths:selectedPaths,model,prompt};
  }
  if(kind==='write'){
   saveEdit();
   const file=draft?.files[selected];
   if(!file||applied.has(file.path))throw Error('Choose an unapplied draft file.');
   if(file.content===original.get(file.path))throw Error('This draft has no changes to apply.');
   return {...c,kind,path:file.path,content:file.content,expectedSha:file.expectedSha};
  }
  if(kind==='check')return {...c,kind,check:get('check')};
  if(kind==='github_diff'){
   const changes=draft?.files.filter(f=>applied.has(f.path)).map(f=>f.path)||[];
   if(!changes.length)throw Error('Apply at least one reviewed file before preparing a PR.');
   return {...c,kind,paths:changes};
  }
  if(kind==='github_pr'){
   if(!githubReview?.files?.length)throw Error('Review the latest GitHub diff first.');
   const repository=get('repo'),branch=get('branch'),title=get('pr-title');
   if(!tested)throw Error('Run a successful project check before requesting a PR.');
   const body='Created with YapCode after human review and a successful project check.\n\nTask: '+get('prompt').slice(0,1700);
   return {...c,kind,repository,branch,title,body,expectedHead:githubReview.head,files:githubReview.files};
  }
  return {...c,kind};
 }
 function showQuote(task,kind){
  pending={task,kind};
  $('review').hidden=false;
  $('review-cost').textContent='This action costs '+task.job.cost+' Work credits if it succeeds. Confirm before '+(kind==='write'?'modifying the selected file.':kind==='github_pr'?'creating a remote GitHub draft PR.':'using the local model or running project checks.');
  let details={kind,root:task.job.payload.root,paths:task.job.payload.paths,path:task.job.payload.path,check:task.job.payload.check,repository:task.job.payload.repository,branch:task.job.payload.branch};
  $('review-details').textContent=JSON.stringify(details,null,2)+(kind==='write'?'\n\nDraft:\n'+get('code').slice(0,9500):kind==='github_pr'?'\n\nGitHub diff preview:\n'+String(githubReview?.diff||'').slice(0,11000):'');
  $('review').scrollIntoView({block:'nearest'});
  note('Review the action and credit cost; nothing has run yet.');
 }
 async function action(name){
  if(busy)return;busy=true;dialog.setAttribute('aria-busy','true');
  try{
   fresh();
   if(name==='close'){dialog.close();return;}
   if(name==='cloud'){
    const request=get('prompt');if(request.length<8)throw Error('Describe the coding task first.');
    if(!window.YapConnectedAssistant)throw Error('Refresh chat to load Gemini coding.');
    if(window.YapWebChat?.isIncognito?.())throw Error('Use a normal chat for connected coding.');
    dialog.close();void window.YapConnectedAssistant.submit(request);return;
   }
   if(name==='work'){dialog.close();if(window.YapComputerSetup)window.YapComputerSetup.open();else hub.open();return;}
   if(name==='supabase'){
    const tools=window.YapSupabaseTools,request=tools?.parse(get('supabase-request'));
    if(!request)throw Error('Enter a Supabase request, such as list my Supabase projects.');
    const before=owner(),data=await tools.execute(request);
    if(before!==owner())throw Error('Account changed. Please retry.');
    output(tools.format(data));note('Supabase read complete. No Work credits used.');return;
   }
   if(name==='github'){
    const tools=window.YapGitHubTools,request=tools?.parse(get('github-request'));
    if(!request)throw Error('Enter a GitHub request, such as list my GitHub repositories.');
    const before=owner(),data=await tools.execute(request);
    if(before!==owner())throw Error('Account changed. Please retry.');
    output(tools.format(data));note('GitHub read complete. No Work credits used.');return;
   }
   if(name==='devices'){
    if(!owner())throw Error('Sign in to YapThing first.');
    const data=await work().request('devices');const select=$('device'),remember=select.value;
    select.replaceChildren();
    for(const d of data.devices||[]){const opt=document.createElement('option');opt.value=d.id;opt.textContent=d.name+(d.online?' — online':' — offline');opt.disabled=!d.online;select.append(opt);}
    if(remember&&[...select.options].some(o=>o.value===remember))select.value=remember;
    note(select.options.length?'Select your computer and trusted project directory.':'No connected computer. Connect it from Work first.');
    return;
   }
   if(name==='models'||name==='inspect'){await free(payload(name==='models'?'local_models':'inspect'),name==='models'?'local_models':'inspect');return;}
   if(name==='read-diff'){
    saveEdit();const f=draft?.files[selected];if(!f)throw Error('Generate a draft first.');
    if(f.expectedSha==='missing'){original.set(f.path,'');preview();note('This is a new file.');return;}
    await free({...checkContext(),kind:'read',path:f.path},'read');return;
   }
   if(name==='dismiss'){
    if(pending)await work().request('cancel',{id:pending.task.job.id});
    pending=null;$('review').hidden=true;note('Preview canceled. No change applied.');return;
   }
   if(name==='approve'){
    if(!pending)throw Error('No task to approve.');
    const chosen=pending;pending=null;$('review').hidden=true;
    await accept(chosen.task.job,chosen.kind);return;
   }
   if(name==='poll'){
    if(!running)throw Error('No task running.');
    const now=running;const response=await work().request('poll',{id:now.id});await complete(response.job,now.kind);return;
   }
   if(name==='draft'||name==='write'||name==='check'||name==='pr'){
    const kind=({draft:'draft_project',write:'write',check:'check',pr:'github_pr'})[name];
    const task=await quote(payload(kind),kind);showQuote(task,kind);return;
   }
   if(name==='diff'){await free(payload('github_diff'),'github_diff');return;}
  }catch(e){fail(e);}finally{busy=false;dialog.removeAttribute('aria-busy');}
 }
 dialog.addEventListener('click',event=>{
  const target=event.target.closest('button[data-yc]');
  if(target){event.preventDefault();action(target.dataset.yc);}
 });
 $('code').addEventListener('input',()=>{saveEdit();preview();});
 const trigger=document.createElement('button');trigger.type='button';trigger.id='yapcode-open';trigger.textContent='YapCode';
 trigger.setAttribute('aria-haspopup','dialog');
 trigger.onclick=()=>{
  fresh();
  const hroot=document.querySelector('#work-root'),hdevice=document.querySelector('#work-device'),hmodel=document.querySelector('#work-model');
  if(hroot?.value&&!get('root'))$('root').value=hroot.value;
  if(hdevice?.value&&!get('device')){const opt=document.createElement('option');opt.value=hdevice.value;opt.textContent=hdevice.selectedOptions[0]?.textContent||hdevice.value;$('device').append(opt);$('device').value=opt.value;}
  if(hmodel?.value&&!get('model')){const opt=document.createElement('option');opt.value=hmodel.value;opt.textContent=hmodel.value;$('model').append(opt);$('model').value=opt.value;}
  if(!get('branch'))$('branch').value='yapthing/yapcode-'+Date.now().toString(36);
  dialog.showModal();
 };
 (document.getElementById('yap-work-open')||document.querySelector('#yap-tool-menu')||document.querySelector('.top-actions')||document.body).insertAdjacentElement('afterend',trigger);
 window.YapCode=Object.freeze({open:(prompt)=>{trigger.click();if(typeof prompt==='string'&&prompt.trim())$('prompt').value=prompt.slice(0,3000);}});
 window.addEventListener('yap:work-account',fresh);
 window.addEventListener('yap:session-change',fresh);
})();
