'use strict';
/* YapThing Connections: status comes from the authenticated backend, never the button. */
(()=>{
 const main=document.querySelector('body>main'),api=window.YapPluginConnections;
 if(!main||!api)return;
 const apps=[
  {id:'gmail',name:'Gmail',short:'G',group:'Productivity',desc:'Read your inbox, review messages, and choose what to do.',detail:'Requires your Google authorization. Only a verified, active connection grants access. Sending, archiving, and deleting always require separate confirmation.',kind:'oauth'},
  {id:'desktop-commander',name:'YapThing Desktop',short:'PC',group:'Developer',desc:'Pair your own Windows computer for files and coding work.',detail:'Install or pair the local desktop connector on your own trusted computer. Approve each permitted action in the companion workflow.',kind:'local',url:'../desktop/'},
  {id:'github-public',name:'GitHub Public',short:'GH',group:'Developer',desc:'Explore public repositories without connecting an account.',detail:'Public repository search works without account authorization. Private repositories require a separate verified connection.',kind:'public',url:'https://github.com/search?q=',param:true},
  {id:'wikipedia',name:'Wikipedia',short:'W',group:'Research',desc:'Find public encyclopedia articles and sources.',detail:'Public Wikipedia search. No private account access or OAuth needed.',kind:'public',url:'https://en.wikipedia.org/w/index.php?search=',param:true},
  {id:'crossref',name:'Crossref',short:'CR',group:'Research',desc:'Search scholarly publication metadata and citations.',detail:'Public publication search. Full-text articles are not guaranteed.',kind:'public',url:'https://search.crossref.org/?q=',param:true},
  {id:'google-drive',name:'Google Drive',short:'D',group:'Files',desc:'Connect Google Drive, create notes and view files available to YapThing.',kind:'oauth',detail:'Uses Google Drive drive.file access: only files created or explicitly authorized for YapThing, not your entire Drive. You can disconnect at any time.'},
  {id:'google-sheets',name:'Google Sheets',short:'S',group:'Files',desc:'Work with selected spreadsheets.',kind:'planned',detail:'A verified Google Sheets authorization and scoped access are required.'},
  {id:'dropbox',name:'Dropbox',short:'Db',group:'Files',desc:'Search permitted cloud files.',kind:'planned',detail:'Dropbox OAuth and scoped file access are not yet available in this version.'},
  {id:'onedrive',name:'OneDrive',short:'1D',group:'Files',desc:'Access Microsoft cloud files.',kind:'planned',detail:'Requires Microsoft delegated account authorization.'},
  {id:'outlook',name:'Outlook',short:'O',group:'Productivity',desc:'Email and calendar with Microsoft authorization.',kind:'planned',detail:'Microsoft Graph delegated permissions and a secure callback are required.'},
  {id:'google-calendar',name:'Google Calendar',short:'31',group:'Productivity',desc:'Review and manage schedules.',kind:'planned',detail:'A calendar-specific OAuth authorization is required; changes need confirmation.'},
  {id:'slack',name:'Slack',short:'#',group:'Work',desc:'Messages from workspaces you authorize.',kind:'planned',detail:'Slack workspace OAuth and supported permissions are required.'},
  {id:'notion',name:'Notion',short:'N',group:'Work',desc:'Find notes and workspace pages.',kind:'planned',detail:'Notion workspace authorization is not yet available.'},
  {id:'trello',name:'Trello',short:'T',group:'Work',desc:'Boards and tasks from your workspace.',kind:'planned',detail:'Requires a user-approved Trello integration.'},
  {id:'linear',name:'Linear',short:'L',group:'Developer',desc:'Track coding issues and projects.',kind:'planned',detail:'Requires delegated Linear OAuth access.'},
  {id:'supabase',name:'Supabase',short:'Sb',group:'Developer',desc:'Work with authorized backend projects.',kind:'planned',detail:'A safe delegated project connection is required. Never paste service-role secrets.'},
  {id:'replit',name:'Replit',short:'R',group:'Developer',desc:'Explore code projects you authorize.',kind:'planned',detail:'Supported project authorization is needed before account access.'},
  {id:'shopify',name:'Shopify',short:'Sh',group:'Business',desc:'Review store data and orders.',kind:'planned',detail:'Requires Shopify app authorization and scoped store access.'}
 ];
 const center=document.createElement('section');center.id='yap-connect-center';
 const intro=document.createElement('div');intro.className='pc-intro';
 const introText=document.createElement('div');introText.innerHTML='<h1>Plugins & connections</h1><p class="pc-lede">The tools you use, in one clean place. Only real connections appear as connected.</p>';
 const refresh=document.createElement('button');refresh.type='button';refresh.className='pc-cta';refresh.textContent='Refresh connections';intro.append(introText,refresh);
 const toolbar=document.createElement('div');toolbar.className='pc-toolbar';
 const search=document.createElement('input');search.id='pc-search';search.type='search';search.placeholder='Search plugins and services';search.setAttribute('aria-label','Find a plugin');toolbar.append(search);
 const filters=document.createElement('div');filters.className='pc-filters';filters.setAttribute('aria-label','Filter plugins');
 const feedback=document.createElement('p');feedback.id='pc-feedback';feedback.setAttribute('role','status');feedback.hidden=true;
 const availableHead=document.createElement('div');availableHead.className='pc-section-head';availableHead.innerHTML='<h2>Available & connected</h2>';
 const readyGrid=document.createElement('div');readyGrid.className='pc-grid';
 const upcomingHead=document.createElement('div');upcomingHead.className='pc-section-head';upcomingHead.innerHTML='<h2>Coming soon</h2>';
 const upcomingGrid=document.createElement('div');upcomingGrid.className='pc-grid';
 const note=document.createElement('div');note.className='pc-note';note.textContent='Your YapThing login is separate from each provider authorization. Private connections use the provider’s secure sign-in. Disconnect anytime. Setup-required integrations are not represented as working.';
 const dialog=document.createElement('dialog');dialog.id='pc-dialog';dialog.setAttribute('aria-label','Plugin connection details');
 dialog.innerHTML='<form method="dialog"><button class="pc-close" aria-label="Close">×</button></form><h2 id="pc-name"></h2><p id="pc-details"></p><p id="pc-state"></p><div id="pc-extra"></div><div class="pc-dialog-actions" id="pc-dialog-actions"></div>';
 center.append(intro,toolbar,filters,feedback,availableHead,readyGrid,upcomingHead,upcomingGrid,note);
 main.replaceChildren(center);document.body.append(dialog);
 const info=msg=>{feedback.textContent=msg;feedback.hidden=!msg;};
 const state={filter:'All',providers:new Map(),signedIn:false,loading:false};
 const params=new URLSearchParams(location.search);
 const driveResult=params.get('drive');
 const requestedConnect=params.get('connect');
 let deepLinkHandled=false;
 const statusOf=app=>{
  if(app.kind==='public')return {label:'Ready to use',cls:'ready',action:'Search'};
  if(app.kind==='local')return {label:'Local setup',cls:'ready',action:'Pair computer'};
  if(app.kind==='planned')return {label:'Coming soon',cls:'disabled',action:'Details'};
  const p=state.providers.get(app.id);
  if(p?.status==='connected')return {label:'Connected',cls:'connected',action:'Open'};
  if(p?.connect_available)return {label:p.status==='expired'?'Reconnect':'Connect securely',cls:'ready',action:'Connect'};
  if(!state.signedIn)return {label:'Sign in required',cls:'disabled',action:'Sign in'};
  return {label:'Setup required',cls:'disabled',action:'Details'};
 };
 const allowedAuth=url=>{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='accounts.google.com'||u.username||u.password)throw Error('Untrusted authorization destination.');
  return u.href;
 };
 const ensureSession=async()=>{try{await api.getToken();return true;}catch{return false;}};
 async function reload(){
  if(state.loading)return;
  state.loading=true;refresh.disabled=true;refresh.textContent='Checking…';
  try{
   state.signedIn=await ensureSession();
   if(!state.signedIn){state.providers.clear();info('Sign in to YapThing Chat, then return here to connect your accounts.');return;}
   const response=await api.list();
   if(!Array.isArray(response.providers))throw Error('Connection status is unavailable.');
   state.providers=new Map(response.providers.filter(p=>typeof p.id==='string').map(p=>[p.id,p]));
   info(driveResult?driveResult==='connected'?'Google Drive authorization completed. Confirm the Connected status below.':'Google Drive authorization did not complete: '+driveResult.replace(/[^a-z_-]/g,' ').slice(0,65):'');
  }catch(e){state.providers.clear();info('Connection status could not be verified: '+String(e.message||e));}
  finally{state.loading=false;refresh.disabled=false;refresh.textContent='Refresh connections';render();
   if(!deepLinkHandled&&requestedConnect){deepLinkHandled=true;const app=apps.find(x=>x.id===requestedConnect&&x.kind==='oauth');if(app)details(app);}
  }
 }
 async function connect(app){
  if(!state.signedIn){window.location.assign('../chat/');return;}
  const record=state.providers.get(app.id);
  if(record?.status==='connected'){
   if(!confirm('Disconnect '+app.name+' from YapThing?'))return;
   try{await api.disconnect(app.id);await reload();dialog.close();}catch(e){showError(e);}
   return;
  }
  if(!record?.connect_available){details(app);return;}
  try{
   info('Opening secure Google authorization…');
   const result=await api.connect(app.id);
   if(result.authorization_url){window.location.assign(allowedAuth(result.authorization_url));return;}
   await reload();details(app);
  }catch(e){showError(e);}
 }
 function showError(e){info(String(e.message||e));}
 function createButton(label,fn,primary=true){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.className='pc-action'+(primary?' primary':'');b.onclick=fn;return b;
 }
 async function gmailInbox(target){
  target.textContent='Loading your Gmail messages…';
  try{
   const token=await api.getToken();
   const res=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-gmail-messages',{
    method:'POST',headers:{authorization:'Bearer '+token,apikey:'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ','content-type':'application/json'},body:'{}'});
   const body=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(body.error||'Gmail request failed');
   target.textContent=(Array.isArray(body.messages)?body.messages:[]).slice(0,10).map(m=>String(m.subject||'No subject').slice(0,120)+' — '+String(m.from||'').slice(0,120)+'\n'+String(m.snippet||'').slice(0,240)).join('\n\n')||'No recent messages.';
  }catch(e){target.textContent='Gmail could not be read: '+String(e.message||e);}
 }
 async function gmailCompose(target){
  const to=prompt('Recipient email address:');if(!to)return;
  const subject=prompt('Email subject:');if(!subject)return;
  const body=prompt('Email message (plain text):');if(!body)return;
  if(!confirm('Send Gmail to '+to+'?\n\nSubject: '+subject+'\n\n'+body.slice(0,700)))return;
  target.textContent='Sending email after your confirmation…';
  try{
   const token=await api.getToken();
   const r=await fetch('https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/yap-gmail-actions',{
    method:'POST',headers:{authorization:'Bearer '+token,apikey:'sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ','content-type':'application/json'},
    body:JSON.stringify({action:'send',to,subject,body,confirm:true}),signal:AbortSignal.timeout(24000)
   });
   const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Gmail send failed');
   target.textContent='Email sent through connected Gmail. Message ID: '+String(data.id||'confirmed').slice(0,120);
  }catch(e){target.textContent='Email not sent: '+String(e.message||e);}
 }
 function driveDetails(extra,actions,app){
  const client=window.YapDriveClient;
  const box=document.createElement('div');box.className='pc-result';box.setAttribute('role','status');
  const list=document.createElement('div');list.className='pc-drive-list';
  const preview=document.createElement('div');preview.className='pc-drive-preview';preview.setAttribute('aria-live','polite');
  const name=document.createElement('input');name.className='pc-query';name.placeholder='Note name (e.g., Project notes)';
  const body=document.createElement('textarea');body.className='pc-query';body.rows=4;body.placeholder='Write a note to save to your Google Drive…';
  body.maxLength=14000;
  const save=createButton('Save note to Drive',async()=>{
   if(!name.value.trim()||!body.value.trim()){box.textContent='Enter a note name and some text.';return}
   if(!confirm('Create "'+name.value.trim()+'" in your connected Google Drive?'))return;
   save.disabled=true;box.textContent='Saving to Google Drive…';
   try{const result=await client.create(name.value.trim(),body.value,true);box.textContent='Created '+result.name+' in your Google Drive.';body.value='';await load();}
   catch(e){box.textContent='Could not create file: '+String(e.message||e);}
   finally{save.disabled=false}
  });
  const refresh=createButton('Browse YapThing files',()=>load());
  const guidance=document.createElement('p');guidance.textContent='This connection currently lists files available to YapThing under Google’s drive.file permission. It cannot browse all existing files in your Drive. You can create a note below.';
  async function load(){
   box.textContent='Loading authorized Drive files…';list.replaceChildren();preview.replaceChildren();
   try{
    const data=await client.list(),files=Array.isArray(data.files)?data.files:[];
    box.textContent=files.length?files.length+' authorized file(s) available to YapThing.': 'No files authorized for YapThing yet. Create a note below to test this connection.';
    for(const file of files){
     const item=document.createElement('div');item.className='pc-drive-row';
     const label=document.createElement('span');label.textContent=String(file.name||'Untitled').slice(0,130);
     const view=createButton('Read',async()=>{
      preview.textContent='Opening '+String(file.name||'file')+'…';
      try{const result=await client.read(file.id);preview.textContent=String(result.name||'')+'\n\n'+String(result.text||'').slice(0,16000)+(result.truncated?'\n\n[Preview truncated]':'');}
      catch(e){preview.textContent='Could not preview file: '+String(e.message||e);}
     },false);
     item.append(label,view);list.append(item);
    }
   }catch(e){box.textContent='Google Drive unavailable: '+String(e.message||e);}
  }
  extra.append(guidance,box,list,preview,name,body,save);
  actions.append(refresh,createButton('Choose existing Drive files',async()=>{
   box.textContent='Opening Google’s secure file picker…';
   try{const data=await api.pick('google-drive');if(!data.authorization_url)throw Error('Picker was not returned by Google authorization');window.location.assign(allowedAuth(data.authorization_url));}
   catch(e){box.textContent='Could not launch Google file selection: '+String(e.message||e);}
  }),createButton('Disconnect',()=>connect(app),false));
  load();
 }
 function details(app){
  const status=statusOf(app);dialog.querySelector('#pc-name').textContent=app.name;
  dialog.querySelector('#pc-details').textContent=app.detail;
  dialog.querySelector('#pc-state').textContent='Status: '+status.label;
  const extra=dialog.querySelector('#pc-extra'),actions=dialog.querySelector('#pc-dialog-actions');extra.replaceChildren();actions.replaceChildren();
  if(app.kind==='public'){
   const form=document.createElement('form'),input=document.createElement('input');
   input.className='pc-query';input.type='search';input.placeholder='Search '+app.name;input.required=true;input.setAttribute('aria-label','Search '+app.name);
   form.append(input,createButton('Search public sources',()=>{},true));
   const btn=form.lastChild;btn.type='submit';btn.onclick=null;
   form.onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(q)window.open(app.url+encodeURIComponent(q),'_blank','noopener,noreferrer');};
   extra.append(form);
  }else if(app.kind==='local'){
   actions.append(createButton('Open desktop pairing',()=>window.location.assign(app.url)));
  }else if(app.kind==='oauth'){
   const p=state.providers.get(app.id);
   if(p?.status==='connected'){
    const inbox=document.createElement('div');inbox.className='pc-result';inbox.setAttribute('role','status');extra.append(inbox);
    if(app.id==='gmail')actions.append(createButton('Read recent inbox',()=>gmailInbox(inbox)),createButton('Compose email',()=>gmailCompose(inbox)),createButton('Disconnect',()=>connect(app),false));
    else if(app.id==='google-drive')driveDetails(extra,actions,app);
    else actions.append(createButton('Disconnect',()=>connect(app),false));
   }else if(p?.connect_available){actions.append(createButton('Authorize with Google',()=>connect(app)));}
   else actions.append(createButton(state.signedIn?'View setup information':'Sign in to connect',()=>state.signedIn?info('This provider is not available for OAuth yet.'):window.location.assign('../chat/')));
  }else {
   const p=document.createElement('p');p.textContent='This integration has not been enabled for user authorization. We will only show Connect when a supported flow is ready.';extra.append(p);
  }
  dialog.showModal();
 }
 const filtersList=['All','Ready','Connected','Coming soon','Developer','Productivity','Files','Work','Research','Business'];
 for(const label of filtersList){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.setAttribute('aria-pressed',String(label==='All'));b.onclick=()=>{state.filter=label;for(const x of filters.children)x.setAttribute('aria-pressed',String(x===b));render();};filters.append(b);
 }
 function matches(app){
  const status=statusOf(app),q=search.value.trim().toLowerCase();
  if(q&&!(app.name+' '+app.desc+' '+app.group).toLowerCase().includes(q))return false;
  if(state.filter==='Ready'&&!['public','local'].includes(app.kind)&&!state.providers.get(app.id)?.connect_available)return false;
  if(state.filter==='Connected'&&status.label!=='Connected')return false;
  if(state.filter==='Coming soon'&&app.kind!=='planned')return false;
  if(!['All','Ready','Connected','Coming soon'].includes(state.filter)&&state.filter!==app.group)return false;
  return true;
 }
 function card(app){
  const status=statusOf(app),node=document.createElement('article');node.className='pc-card';
  const icon=document.createElement('div');icon.className='pc-icon';icon.textContent=app.short;icon.setAttribute('aria-hidden','true');
  const meta=document.createElement('div'),name=document.createElement('h3'),desc=document.createElement('p'),row=document.createElement('div'),pill=document.createElement('span');
  name.textContent=app.name;desc.textContent=app.desc;row.className='pc-meta';pill.className='pc-pill '+status.cls;pill.textContent=status.label;row.append(pill);meta.append(name,desc,row);
  const actions=document.createElement('div');actions.className='pc-actions';
  actions.append(createButton(status.action,()=>{if(app.kind==='local')window.location.assign(app.url);else if(app.kind==='oauth'&&status.action==='Connect')connect(app);else if(app.kind==='oauth'&&status.action==='Sign in')window.location.assign('../chat/');else details(app)},status.cls!=='disabled'));
  node.append(icon,meta,actions);return node;
 }
 function render(){
  readyGrid.replaceChildren();upcomingGrid.replaceChildren();
  const selected=apps.filter(matches);
  for(const app of selected)(app.kind==='planned'?upcomingGrid:readyGrid).append(card(app));
  availableHead.hidden=!readyGrid.children.length;readyGrid.hidden=!readyGrid.children.length;
  upcomingHead.hidden=!upcomingGrid.children.length;upcomingGrid.hidden=!upcomingGrid.children.length;
  if(!selected.length){const msg=document.createElement('p');msg.textContent='No plugins match this search.';readyGrid.hidden=false;readyGrid.append(msg);}
 }
 search.addEventListener('input',render);refresh.addEventListener('click',reload);
 window.addEventListener('pageshow',()=>reload());
 window.addEventListener('storage',e=>{if(e.key?.includes('session'))reload();});
 render();reload();
 window.YapPluginCenter={refresh:reload,apps:()=>apps.map(a=>({id:a.id,name:a.name,status:statusOf(a).label}))};
})();
