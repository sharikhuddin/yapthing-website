'use strict';
(()=>{
 const tools=document.getElementById('yap-tools-menu'),
  search=document.getElementById('yap-search-options'),
  mode=document.getElementById('yap-workspace'),
  files=document.getElementById('yap-attachment-menu');
 if(!tools||!search||!mode)return;
 const label=tools.querySelector('.yap-tools-summary-meta');
 const common=['general','research','work','student-study','coding','photo'];
 // Preserve every specialist mode, but group lesser-used choices rather than
 // presenting an unstructured wall of options.
 if(!mode.querySelector('optgroup')){
  const regular=document.createElement('optgroup'),more=document.createElement('optgroup');
  regular.label='Most used';more.label='More focus areas';
  for(const option of [...mode.querySelectorAll('option')]){
   (common.includes(option.value)?regular:more).append(option);
  }
  mode.append(regular,more);
 }
 const refresh=()=>{
  search.style.display=tools.open&&mode.value==='research'?'flex':'none';
  const selected=mode.selectedOptions?.[0];
  if(label)label.textContent=selected?.textContent||'General';
 };
 tools.addEventListener('toggle',refresh);
 mode.addEventListener('change',refresh);
 document.getElementById('yap-workspace-start')?.addEventListener('click',()=>{
  tools.open=false;refresh();
 });
 if(files){
  const photo=document.getElementById('photo-preview');
  const updatePhoto=()=>files.classList.toggle('yap-has-image',
    !!photo&&!photo.hidden);
  const observer=typeof MutationObserver==='function'&&photo
   ?new MutationObserver(updatePhoto):null;
  observer?.observe(photo,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',event=>{
   if(files.open&&!files.contains(event.target))files.open=false;
   if(tools.open&&!tools.contains(event.target))tools.open=false;
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'){files.open=false;tools.open=false;}
  });
  for(const button of files.querySelectorAll('button')){
   button.addEventListener('click',()=>{files.open=false;});
  }
  updatePhoto();
 }
 refresh();
})();
