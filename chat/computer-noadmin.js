'use strict';
/* Adds a non-elevated Windows option to the existing computer setup wizard. */
(()=>{
 const modal=document.getElementById('yap-computer-setup');
 if(!modal||document.getElementById('ycs-noadmin'))return;
 const download='https://yapthing.com/desktop/YapThing-Computer-NoAdmin.cmd?v=20261101-portable2';
 const copyCommand='Invoke-WebRequest -Uri "'+download+'" -OutFile "$env:USERPROFILE\\Downloads\\YapThing-Computer-NoAdmin.cmd"';
 const first=modal.querySelector('section');
 if(!first)return;
 const area=document.createElement('div');
 area.id='ycs-noadmin';
 const choice=document.createElement('div');choice.className='ycs-modes';
 const normal=document.createElement('button');normal.type='button';normal.textContent='Node.js installed';normal.setAttribute('aria-pressed','true');
 const portable=document.createElement('button');portable.type='button';portable.textContent='No admin / Node missing';portable.setAttribute('aria-pressed','false');
 choice.append(normal,portable);
 const detail=document.createElement('div');detail.className='ycs-portable';detail.hidden=true;
 const text=document.createElement('p');
 text.textContent='No administrator account? This optional launcher can use an official verified Node.js 24 LTS ZIP in your user folder. It requests consent before downloading and does not install an MSI, alter system PATH, or change Windows execution policy.';
 const link=document.createElement('a');link.href='/desktop/YapThing-Computer-NoAdmin.cmd?v=20261101-portable2';link.download='YapThing-Computer-NoAdmin.cmd';link.textContent='Download no-admin launcher (.cmd)';
 const expl=document.createElement('p');expl.textContent='Inspect the file before running it. To download it with PowerShell instead, copy this command. It downloads the file but does not execute it:';
 const row=document.createElement('div');row.className='ycs-command';
 const snippet=document.createElement('code');snippet.textContent=copyCommand;
 const copyBtn=document.createElement('button');copyBtn.type='button';copyBtn.textContent='Copy download command';
 const tip=document.createElement('p');tip.textContent='After download, review the file and run it as a normal Windows user. If organization policy blocks running unapproved software, ask IT for approval or continue using YapThing Chat without a computer connection.';
 row.append(snippet,copyBtn);detail.append(text,link,expl,row,tip);area.append(choice,detail);
 const commandRow=first.querySelector('.ycs-command');
 first.insertBefore(area,commandRow);
 const select=enabled=>{
  detail.hidden=!enabled;commandRow.hidden=enabled;portable.setAttribute('aria-pressed',String(enabled));normal.setAttribute('aria-pressed',String(!enabled));
 };
 normal.onclick=()=>select(false);portable.onclick=()=>select(true);
 copyBtn.onclick=async()=>{
  try{await navigator.clipboard.writeText(copyCommand);copyBtn.textContent='Copied';}
  catch{
   const textarea=document.createElement('textarea');textarea.value=copyCommand;textarea.readOnly=true;textarea.className='ycs-manual';detail.append(textarea);textarea.focus();textarea.select();copyBtn.textContent='Select and copy the command';
  }
 };
 const issues=modal.querySelector('#ycs-trouble'),help=modal.querySelector('#ycs-help');
 if(issues&&help){
  const choices=[
   ['Cannot overwrite HOME','This is a launcher bug, not a permissions problem. Download the updated no-admin launcher using the link above and run that fresh copy. Keep checksum verification enabled.'],
   ['No administrator rights','Use No admin / Node missing. Download and inspect the Windows launcher; it offers a user-folder Node.js ZIP, not an MSI. If the device is managed, follow organization policy.'],
   ['PowerShell script blocked','The optional launcher is a .cmd file and does not request an execution-policy change. If .cmd files are prohibited, do not evade the restriction. Request IT approval.'],
   ['Node.js ZIP download failed','Check your authorized connection to nodejs.org, storage space and company proxy. Do not disable antivirus or TLS verification. Contact IT for a permitted download.'],
   ['npm registry blocked','Your network must permit npm package downloads from registry.npmjs.org. Use IT-approved networking or an approved installation. No firewall or proxy bypass is provided.'],
   ['Checksum mismatch','Stop; never use a ZIP with a mismatched SHA-256 checksum. Delete the downloaded file and request a fresh trusted download or IT assistance.'],
   ['Company policy blocked','You can keep using YapThing Chat, Projects and cloud features without remote computer control. No compliant software bypass exists when an administrator prohibits execution.']
  ];
  for(const [label,answer] of choices){
   const button=document.createElement('button');button.type='button';button.textContent=label;
   button.onclick=()=>{help.textContent=answer;if(label==='No administrator rights')select(true);};
   issues.append(button);
  }
 }
 window.YapNoAdminSetup=Object.freeze({download,copyCommand,select:()=>select(true)});
})();
