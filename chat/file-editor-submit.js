'use strict';
/* File corrections use a single, explicit submit path; unrelated chat remains unchanged. */
(()=>{
 const attached=()=>!!(window.YapAttachments?.hasSpreadsheet?.()||window.YapAttachments?.hasEditableDocument?.());
 function submit(event){
  if(!attached())return;
  event.preventDefault();event.stopImmediatePropagation();
  const form=document.getElementById('form');
  if(!form||typeof form.onsubmit!=='function')return;
  void form.onsubmit(new Event('submit',{bubbles:true,cancelable:true}));
 }
 document.addEventListener('click',e=>{
  if(e.target instanceof Element&&e.target.closest('#send'))submit(e);
 },true);
 document.addEventListener('keydown',e=>{
  if(e.target?.id==='prompt'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing)submit(e);
 },true);
})();
