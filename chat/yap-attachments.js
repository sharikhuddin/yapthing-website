'use strict';
(()=>{
const $=id=>document.getElementById(id),menu=$('yap-attachment-menu'),photo=$('photo-input'),camera=$('yap-camera-input'),docs=$('yap-document-input');
let documentText='',documentName='';
const clearDocument=()=>{
 const had=!!documentText;
 documentText='';documentName='';docs.value='';
 if(had){$('photo-preview').hidden=true;$('photo-thumb').hidden=false;$('photo-name').textContent='';$('photo-remove').onclick=window.YapPhotoVision?.removePhoto||null;}
};
const report=message=>{if(window.YapComposerPolish?.notify)return window.YapComposerPolish.notify(message);alert(message);};
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
 const choices=[['Public research','public','Search public sources to answer your question'],['Gmail inbox','gmail','Read recent mail from a connected Gmail account'],['GitHub repository','github','Look up a public GitHub repository'],['YapThing Desktop','desktop','Connect and check your own computer'],['See 3-step demo','tour','See how to use Spark in YapThing chat'],['Share screen preview','screen','Show your screen locally; nothing is uploaded'],['Connect more plugins','connect','Set up Gmail, Drive, Slack and other services']];
 for(const [name,id,description] of choices){const b=document.createElement('button');b.type='button';b.style.cssText='display:block;width:100%;text-align:left;margin:6px 0;padding:10px;border:1px solid var(--border);border-radius:8px';b.textContent=name+' — '+description;b.onclick=()=>{box.remove();if(id==='connect'){location.href='../plugins/';return}if(id==='public')$('search-source').value='public';if(id==='tour'){window.YapScreenPreview?.tour();return}if(id==='screen'){window.YapScreenPreview?.start();return}if(id==='desktop')$('prompt').value='✦ desktop connect';if(id==='gmail')$('prompt').value='✦ gmail inbox';if(id==='github')$('prompt').value='✦ github owner/repo';$('prompt').focus()};box.append(b)}
 const close=document.createElement('button');close.textContent='Close';close.onclick=()=>box.remove();box.append(close);document.body.append(box);
};
camera.onchange=()=>{const file=camera.files?.[0];if(!file)return;const transfer=new DataTransfer();transfer.items.add(file);photo.files=transfer.files;photo.dispatchEvent(new Event('change'));camera.value=''};
docs.onchange=async()=>{
 const file=docs.files?.[0];if(!file)return;
 try{
  if(file.size>2*1024*1024)throw Error('Choose a document smaller than 2 MB.');
  if(!/\.(txt|md|csv|json)$/i.test(file.name))throw Error('Choose TXT, Markdown, CSV or JSON. PDF reading is not yet supported.');
  const content=await file.text();if(!content.trim())throw Error('This document is empty.');
  window.YapPhotoVision?.removePhoto?.();clearDocument();
  documentText=content.slice(0,12000);documentName=file.name;
  $('photo-name').textContent=file.name;$('photo-thumb').hidden=true;
  $('photo-preview').hidden=false;$('photo-remove').onclick=clearDocument;
  $('send').disabled=false;
 }catch(error){report(error.message)}finally{docs.value='';menu.open=false}
};
window.YapAttachments={getDocument:()=>documentText,getDocumentName:()=>documentName,clearDocument,action:()=>$('yap-image-action').value};
})();