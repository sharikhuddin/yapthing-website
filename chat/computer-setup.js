'use strict';
/* YapThing computer setup: guided, consent-first Remote Desktop Commander onboarding. */
(()=>{
 if(document.getElementById('yap-computer-setup'))return;
 const command='npx.cmd @wonderwhy-er/desktop-commander@latest remote';
 const diagnostics='node --version; npm --version; Get-Command npx.cmd';
 const portableCommand='Invoke-WebRequest -Uri "https://yapthing.com/desktop/YapThing-Computer-NoAdmin.cmd" -OutFile "$env:USERPROFILE\\Downloads\\YapThing-Computer-NoAdmin.cmd"';
 const issues={
  launcher:'This older launcher has a setup error. Download the updated no-admin launcher shown here and run the fresh copy. No administrator rights or execution-policy change is needed.',
  node:'Node.js or npm not recognized: choose No admin / Node missing. Download the YapThing No-Admin launcher. It can use an official verified portable Node.js ZIP in your user folder without an MSI installation. Never change your system execution policy.',
  admin:'No administrator rights: choose No admin / Node missing. Download and inspect the .cmd launcher, then run it as your normal user. It asks before downloading official portable Node.js; it does not require elevation. Managed PC rules still apply.',
  policy:'App blocked by organization policy: do not attempt to circumvent AppLocker, execution restrictions, antivirus, or your company policy. Ask IT to approve Node.js and Desktop Commander or continue using YapThing chat without computer access.',
  registry:'npm download blocked: check whether your authorized network can reach registry.npmjs.org and nodejs.org over HTTPS. Ask your administrator for an approved proxy or allowlisting. Do not disable firewalls or certificate verification.',
  checksum:'ZIP checksum mismatch: stop. Delete the failed archive and contact support. Never disable the SHA-256 verification; download only from the official nodejs.org domain.',
  browser:'Browser authorization did not open: use the verification URL and code shown in the PowerShell window. Confirm that the displayed code matches. Do not paste your device verification code into YapThing chat.',
  offline:'Computer appears offline: leave the PowerShell process open, confirm the computer is online and awake, restart the remote command if needed, then check status again.',
  missing:'Computer not listed: finish device pairing in Desktop Commander first, then authorize YapThing using Connect Account. The Desktop Commander login and YapThing authorization are separate steps.',
  denied:'Permission denied: confirm you signed in to the correct Desktop Commander account and accepted the YapThing access prompt. Check your organization\'s policies if the account is managed.',
  closed:'Closed the connector window: remote access stops. Run the same PowerShell command again; saved device authorization normally persists.',
  debug:'Need more details: copy the diagnostic command or start with npx.cmd @wonderwhy-er/desktop-commander@latest remote --debug. Share only error messages, never secrets, access tokens or device codes.'
 };
 const modal=document.createElement('dialog');modal.id='yap-computer-setup';modal.setAttribute('aria-label','Connect a computer to YapThing');
 modal.innerHTML=[
 '<div class="ycs-head"><div><small>YAPTHING CONNECTIONS</small><h2>Connect your computer</h2><p>Use your own Windows computer from YapThing Chat, Projects, or Code.</p></div><button type="button" data-setup="close" aria-label="Close computer setup">×</button></div>',
 '<div class="ycs-steps"><span>1. Start</span><span>2. Authorize</span><span>3. Verify</span></div>',
 '<section><h3>1. Start the connector in PowerShell</h3><p>Run this on the Windows PC you want to connect. Requires Node.js and npm. Keep the window open while using YapThing.</p><div class="ycs-command"><code id="ycs-command"></code><button type="button" data-setup="copy">Copy</button></div><p><a href="https://nodejs.org/en/download" target="_blank" rel="noopener noreferrer">Get Node.js</a> · <a href="https://mcp.desktopcommander.app/" target="_blank" rel="noopener noreferrer">Desktop Commander devices</a></p></section>',
 '<section><h3>2. Authorize YapThing</h3><p>Complete the device code sign-in shown in PowerShell. Then connect the Desktop Commander account to the YapThing account you use on your phone or desktop.</p><div class="ycs-row"><button type="button" data-setup="authorize">Connect account</button><a href="/chat/" id="ycs-signin">Sign in to YapThing</a></div></section>',
 '<section><h3>3. Verify your computer</h3><p>Check live authorization and online devices. No connection is assumed before the server confirms it.</p><button type="button" data-setup="check">Check connection</button><div id="ycs-state" role="status" aria-live="polite">Not checked yet.</div><div id="ycs-devices"></div></section>',
 '<section id="ycs-coding" hidden><h3>4. Start coding in chat</h3><p>Choose the project folder you want YapThing to work on, then describe what to build or fix. Review the proposed file and test scope once; YapThing can edit, test and repair within it. Commands and draft pull requests have separate reviews. Keep this chat and your connector open.</p><button type="button" data-setup="coding">Choose project and start coding</button></section>',
 '<section><h3>Having trouble?</h3><div class="ycs-trouble" id="ycs-trouble"></div><p id="ycs-help" role="status">Choose the issue you are seeing for steps to fix it.</p><div class="ycs-row"><button type="button" data-setup="diag">Copy PowerShell diagnostics</button><button type="button" data-setup="chat">Ask YapThing in chat</button></div></section>',
 '<p class="ycs-privacy">Computer access is granted through Desktop Commander. Only approve devices you own or are authorized to use. Project file contents and selected task results may pass through YapThing Work and its connected services; review permissions before continuing. Stop the connector with Ctrl+C to take your computer offline.</p>'
 ].join('');
 document.body.append(modal);
 const get=id=>modal.querySelector('#ycs-'+id);
 get('command').textContent=command;
 const work=()=>window.YapWorkClient;
 const signin=get('signin');if(window.YapAndroid&&document.getElementById('account-open')){signin.textContent='Open YapThing Account';signin.addEventListener('click',e=>{e.preventDefault();modal.close();document.getElementById('account-open').click();});}
 let working=false,serial=0;
 const state=message=>{get('state').textContent=message;};
 const pending=flag=>{working=flag;for(const el of modal.querySelectorAll('button[data-setup="authorize"],button[data-setup="check"]'))el.disabled=flag;};
 const exactAuth=url=>{const parsed=new URL(url);if(parsed.origin!=='https://mcp.desktopcommander.app'||parsed.pathname!=='/authorize'||parsed.username||parsed.password)throw Error('Authorization URL could not be verified.');return parsed.href;};
 async function copy(value,button){
  try{await navigator.clipboard.writeText(value);button.textContent='Copied';setTimeout(()=>{if(button.isConnected)button.textContent=button.dataset.setup==='diag'?'Copy PowerShell diagnostics':'Copy';},1600);}
  catch{const input=document.createElement('textarea');input.value=value;input.readOnly=true;input.className='ycs-manual';modal.append(input);input.focus();input.select();state('Select the command shown below and copy it manually.');}
 }
 async function check(){
  const id=++serial;
  if(!work()?.account()){state('Sign in to your YapThing account, then check again.');return;}
  get('coding').hidden=true;pending(true);state('Checking account authorization and online devices…');get('devices').replaceChildren();
  try{
   const status=await work().request('status');if(id!==serial)return;
   if(!status.connected){state('YapThing is signed in, but Desktop Commander authorization is not active. Start the remote connector and choose Connect account.');return;}
   const result=await work().request('devices');if(id!==serial)return;
   const devices=Array.isArray(result.devices)?result.devices:[];
   const online=devices.filter(x=>x.online);
   state(online.length?('Connected. '+online.length+' computer'+(online.length===1?'':'s')+' online and ready for approved Work tasks.'):('Account authorized, but no computer is online. Restart the PowerShell connector, complete device pairing, then check again.'));
   get('coding').hidden=!online.length;
   for(const d of devices.slice(0,20)){const node=document.createElement('p');node.className='ycs-device';node.textContent=String(d.name||'Computer').slice(0,80)+' — '+(d.online?'Online':'Offline');get('devices').append(node);}
  }catch(e){if(id!==serial)return;state('Could not verify the connection: '+String(e.message||e).slice(0,220)+'. Check sign-in, internet access and remote connector permissions.');}
  finally{pending(false);}
 }
 async function authorize(){
  if(!work()?.account()){state('First sign in to the same YapThing account you will use on your other devices.');return;}
  pending(true);
  try{
   const result=await work().request('start',{},'oauth');const url=exactAuth(result.authorization_url);
   if(typeof window.YapAndroid?.openPublicSource==='function')window.YapAndroid.openPublicSource(url);
   else if(typeof window.YapIOS?.openPublicSource==='function')window.YapIOS.openPublicSource(url);
   else {const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';modal.append(a);a.click();a.remove();}
   state('Finish authorization in the Desktop Commander window, then return to YapThing and choose Check connection.');
  }catch(e){state('Could not start authorization: '+String(e.message||e).slice(0,240));}
  finally{pending(false);}
 }
 async function chatHelp(text,{includeUser=true}={}){
  const message=String(text||'Help me connect my Windows computer to YapThing').slice(0,500);
  if(window.YapWebChat?.add){if(includeUser)window.YapWebChat.add(message,'user');const issue=/cannot overwrite.*home|home.*read.only/i.test(message)?issues.launcher:/no admin|administrator|admin rights|can.t install/i.test(message)?issues.admin:/company policy|blocked by|restricted by/i.test(message)?issues.policy:/npm registry|npm blocked|proxy/i.test(message)?issues.registry:/hash|checksum/i.test(message)?issues.checksum:/node|npx|npm/i.test(message)?issues.node:/offline|disconnected/i.test(message)?issues.offline:/browser|code|auth/i.test(message)?issues.browser:/not found|missing/i.test(message)?issues.missing:/denied|permission/i.test(message)?issues.denied:'';window.YapWebChat.add((issue||('To connect: check Node.js and npm, run '+command+' in PowerShell, complete the device-code login, then choose Connect account and Check connection.'))+' Use the troubleshooting choices in this guide for further checks. Never share passwords, pairing codes or tokens in chat.','assistant');}
  else if(window.YapAssistant?.appendWorkMessage){if(includeUser)window.YapAssistant.appendWorkMessage(message,'user');window.YapAssistant.appendWorkMessage('Run '+command+' on the computer, finish pairing, then choose Connect account and Check connection. Do not share passwords or device codes.','thing');}
  modal.showModal();
 }
 for(const [key,label] of [['node','Node/npm missing'],['browser','Authorization did not open'],['offline','Computer offline'],['missing','Device not found'],['denied','Access denied'],['closed','Terminal closed'],['debug','Other error']]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.issue=key;b.onclick=()=>{get('help').textContent=issues[key];};get('trouble').append(b);
 }
 modal.addEventListener('click',event=>{
  const b=event.target.closest('button[data-setup]');if(!b)return;
  switch(b.dataset.setup){
   case 'close':modal.close();break;
   case 'copy':copy(command,b);break;
   case 'diag':copy(diagnostics,b);break;
   case 'authorize':authorize();break;
   case 'check':check();break;
   case 'coding':modal.close();if(window.YapConnectedAssistant)window.YapConnectedAssistant.openTools();else location.assign('/chat/');break;
   case 'chat':modal.close();if(document.getElementById('form'))chatHelp();else location.assign('/chat/?connect=computer');break;
  }
 });
 const open=()=>{get('coding').hidden=true;if(!modal.open)modal.showModal();state(work()?.account()?'Use Check connection to confirm your account and online devices.':'Start with PowerShell, then sign in to YapThing to authorize this computer.');};
 const quick=document.createElement('button');quick.type='button';quick.className='ycs-trigger';quick.textContent='Connect computer';quick.onclick=open;
 if(document.getElementById('yap-tool-menu')){
  const menu=document.getElementById('yap-menu-settings')||document.getElementById('yap-tool-menu');
  menu.append(quick);
 }
 if(location.pathname.startsWith('/desktop/')&&!document.getElementById('form')){
  const el=document.querySelectorAll('body>main>section')[1]||document.querySelector('body>main>section');el?.append(quick);
 }
 const form=document.getElementById('form')||document.getElementById('chat-form');
 form?.addEventListener('submit',e=>{
  const input=document.getElementById('prompt')||document.getElementById('message-input');const text=input?.value.trim()||'';
  if(!/(?:connect|pair|set ?up|install|troubleshoot|fix|offline|not working|cannot connect|can.t connect|device not found|node not recognized|no admin|administrator|blocked|checksum|node missing)/i.test(text)||!/(?:computer|desktop|powershell|remote device|desktop commander|node(?:\.js)?|npx)/i.test(text))return;
  e.preventDefault();e.stopImmediatePropagation();input.value='';
  if(window.YapWebChat?.add||window.YapAssistant?.appendWorkMessage)chatHelp(text);else open();
 },true);
 window.addEventListener('yap:session-change',()=>{serial++;get('coding').hidden=true;get('devices').replaceChildren();state('Account changed. Check the connection again.');});
 window.YapComputerSetup=Object.freeze({open,check,command,diagnostics,help:chatHelp});
 if(new URLSearchParams(location.search).get('connect')==='computer')open();
})();
