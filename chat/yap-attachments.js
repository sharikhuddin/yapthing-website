'use strict';
(()=>{
const $=id=>document.getElementById(id),menu=$('yap-attachment-menu'),photo=$('photo-input'),camera=$('yap-camera-input'),docs=$('yap-document-input');
let documentText='',documentName='';
$('yap-camera-pick').onclick=()=>{menu.open=false;camera.click()};
$('yap-photo-pick').onclick=()=>{menu.open=false;photo.click()};
$('yap-document-pick').onclick=()=>{menu.open=false;docs.click()};
camera.onchange=()=>{const file=camera.files?.[0];if(!file)return;const transfer=new DataTransfer();transfer.items.add(file);photo.files=transfer.files;photo.dispatchEvent(new Event('change'));camera.value=''};
docs.onchange=async()=>{const file=docs.files?.[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('Document exceeds 2 MB.');if(file.name.toLowerCase().endsWith('.pdf'))throw Error('PDF text extraction is not yet supported in this browser. Please use TXT, CSV, MD or JSON.');documentText=(await file.text()).slice(0,12000);documentName=file.name;const name=$('photo-name');name.textContent='Document: '+documentName;$('photo-preview').hidden=false;$('photo-thumb').hidden=true;$('photo-remove').onclick=()=>{documentText='';documentName='';$('photo-preview').hidden=true;$('photo-thumb').hidden=false};}catch(e){alert(e.message)}finally{docs.value='';menu.open=false}};
window.YapAttachments={getDocument:()=>documentText,clearDocument:()=>{documentText='';documentName='';$('photo-thumb').hidden=false},action:()=>$('yap-image-action').value};
})();