'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const row=document.querySelector('#form .compose-row'),menu=$('yap-attachment-menu'),preview=$('photo-preview');
 const input=$('prompt');if(!row||!menu||!preview||!input)return;
 const paths={
  plus:'<path d="M12 5v14M5 12h14"/>',
  camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="9" r="1"/><path d="m3 18 5-5 4 4 3-3 6 6"/>',
  file:'<path d="M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h7"/>',
  plug:'<path d="M9 3v6M15 3v6M6 9h12v4a6 6 0 0 1-12 0V9zM12 19v3"/>',
  sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--panel)"/><circle cx="15" cy="17" r="3" fill="var(--panel)"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>'
 };
 const svg=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
 const label=menu.querySelector(':scope>summary');
 label.innerHTML='<span class="yap-icon">'+svg('plus')+'</span>';
 label.setAttribute('aria-label','Add an image, document or plugin');
 label.title='Attach or connect';
 const items=[
  ['yap-camera-pick','camera','Take photo','Use your camera'],
  ['yap-photo-pick','image','Upload image','JPG · PNG · WebP'],
  ['yap-document-pick','file','Upload document','TXT · MD · CSV · JSON'],
  ['yap-plugin-pick','plug','Use a plugin','Connected tools'],
  ['yap-services-open','sliders','More tools','Preferences and actions']
 ];
 for(const [id,glyph,title,caption] of items){
  const button=$(id);if(!button)continue;
  button.classList.add('yap-attach-item');button.setAttribute('aria-label',title);
  const icon=document.createElement('span');icon.className='yap-icon';icon.innerHTML=svg(glyph);
  const body=document.createElement('span');body.className='yap-item-copy';
  const name=document.createElement('strong');name.textContent=title;
  const small=document.createElement('small');small.textContent=caption;
  body.append(name,small);button.replaceChildren(icon,body);
 }
 const menuBody=menu.querySelector(':scope>div');
 menuBody?.setAttribute('role','group');menuBody?.setAttribute('aria-label','Attach content');
 $('yap-document-input')?.setAttribute('accept','.txt,.md,.csv,.json');
 row.prepend(preview);preview.classList.add('yap-preview-chip');
 const thumb=$('photo-thumb'),filename=$('photo-name'),remove=$('photo-remove');
 const docIcon=document.createElement('span');docIcon.className='yap-doc-icon';docIcon.innerHTML=svg('file');docIcon.hidden=true;
 const meta=document.createElement('div');meta.className='yap-preview-meta';
 const type=document.createElement('small');type.className='yap-preview-type';
 filename.before(docIcon);filename.before(meta);meta.append(filename,type);
 remove.innerHTML=svg('close');remove.title='Remove attachment';remove.setAttribute('aria-label','Remove attachment');
 const refresh=()=>{
  const hasDocument=!!window.YapAttachments?.getDocumentName?.();
  if(docIcon.hidden===hasDocument)docIcon.hidden=!hasDocument;
  if(thumb.hidden!==hasDocument)thumb.hidden=hasDocument;
  type.textContent=hasDocument?'Document ready':'Image ready';
  preview.setAttribute('aria-label',hasDocument?'Selected document':'Selected image');
  menu.classList.toggle('yap-has-image',!!window.YapPhotoVision?.hasPhoto?.());
 };
 refresh();
 new MutationObserver(refresh).observe(preview,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(refresh).observe(thumb,{attributes:true,attributeFilter:['src','hidden']});
 new MutationObserver(refresh).observe(filename,{childList:true,subtree:true,characterData:true});
 const feedback=document.createElement('p');feedback.id='yap-composer-feedback';feedback.hidden=true;feedback.setAttribute('role','alert');
 row.after(feedback);
 let feedbackTime=0;
 function notify(text){
  feedback.textContent=String(text||'').slice(0,250);feedback.hidden=false;
  if(feedbackTime)clearTimeout(feedbackTime);
  feedbackTime=setTimeout(()=>{feedback.hidden=true},6000);
 }
 const autoSize=()=>{
  input.style.height='auto';
  input.style.height=Math.max(46,Math.min(input.scrollHeight,144))+'px';
  input.style.overflowY=input.scrollHeight>144?'auto':'hidden';
 };
 input.addEventListener('input',autoSize);autoSize();
 window.YapComposerPolish={notify,refresh,autoSize};
})();
