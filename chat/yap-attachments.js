'use strict';
(()=>{
const $=id=>document.getElementById(id),menu=$('yap-attachment-menu'),photo=$('photo-input'),camera=$('yap-camera-input'),docs=$('yap-document-input');
let documentText='',documentName='';
$('yap-camera-pick').onclick=()=>{menu.open=false;camera.click()};
$('yap-photo-pick').onclick=()=>{menu.open=false;photo.click()};
$('yap-document-pick').onclick=()=>{menu.open=false;docs.click()};
$('yap-plugin-pick').onclick=()=>{
 menu.open=false;
 const old=$('yap-plugin-dialog');if(old){old.remove();return}
 const box=document.createElement('section');box.id='yap-plugin-dialog';box.setAttribute('role','dialog');box.setAttribute('aria-label','Choose a plugin');
 box.style.cssText='position:fixed;z-index:100;bottom:110px;left:12px;right:12px;max-width:440px;margin:auto;background:var(--panel);color:var(--fg);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 15px 40px #0006';
 const title=document.createElement('h3');title.textContent='Use a plugin';box.append(title);
 const help=document.createElement('p');help.textContent='Choose a tool for this chat. Connected services require authorization before private actions.';box.append(help);
 const choices=[['Public research','public','Search public sources to answer your question'],['Email draft','email','Draft an email for review; do not send automatically'],['GitHub public repo','github','Ask about a public repository'],['Connect more plugins','connect','Set up Gmail, Drive, Slack and other services']];
 for(const [name,id,description] of choices){const b=document.createElement('button');b.type='button';b.style.cssText='display:block;width:100%;text-align:left;margin:6px 0;padding:10px;border:1px solid var(--border);border-radius:8px';b.textContent=name+' — '+description;b.onclick=()=>{box.remove();if(id==='connect'){location.href='../plugins/';return}if(id==='public')$('search-source').value='public';if(id==='email')$('prompt').value='Draft an email for me to review about: '+$('prompt').value;if(id==='github')$('prompt').value='Help me review this public GitHub repository (owner/repo): '+$('prompt').value;$('prompt').focus()};box.append(b)}
 const close=document.createElement('button');close.textContent='Close';close.onclick=()=>box.remove();box.append(close);document.body.append(box);
};
camera.onchange=()=>{const file=camera.files?.[0];if(!file)return;const transfer=new DataTransfer();transfer.items.add(file);photo.files=transfer.files;photo.dispatchEvent(new Event('change'));camera.value=''};
docs.onchange=async()=>{const file=docs.files?.[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('Document exceeds 2 MB.');if(file.name.toLowerCase().endsWith('.pdf'))throw Error('PDF text extraction is not yet supported in this browser. Please use TXT, CSV, MD or JSON.');documentText=(await file.text()).slice(0,12000);documentName=file.name;const name=$('photo-name');name.textContent='Document: '+documentName;$('photo-preview').hidden=false;$('photo-thumb').hidden=true;$('photo-remove').onclick=()=>{documentText='';documentName='';$('photo-preview').hidden=true;$('photo-thumb').hidden=false};}catch(e){alert(e.message)}finally{docs.value='';menu.open=false}};
window.YapAttachments={getDocument:()=>documentText,clearDocument:()=>{documentText='';documentName='';$('photo-thumb').hidden=false},action:()=>$('yap-image-action').value};
})();