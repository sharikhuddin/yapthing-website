'use strict';
/* Conservative offline Word replacement and PDF correction appendix; files stay in browser. */
window.YapDocuments=(()=>{
 let original=null,kind='',outputURL='';
 const clear=()=>{original=null;kind='';if(outputURL){URL.revokeObjectURL(outputURL);outputURL='';}document.getElementById('yap-document-download')?.remove();};
 const supported=f=>/\.(docx|pdf)$/i.test(f?.name||'');
 async function load(file){
  if(!supported(file)||file.size>5*1024*1024)throw Error('Choose a PDF or DOCX smaller than 5 MB.');
  if(/\.docx$/i.test(file.name)){if(!window.JSZip)throw Error('Word processing library unavailable.');const zip=await JSZip.loadAsync(await file.arrayBuffer());if(!zip.file('word/document.xml'))throw Error('Invalid Word document.');kind='docx';}
  else {if(!window.PDFLib)throw Error('PDF processing library unavailable.');await PDFLib.PDFDocument.load(await file.arrayBuffer());kind='pdf';}
  clear();original=file;kind=/\.pdf$/i.test(file.name)?'pdf':'docx';
  return kind==='docx'?'Word document ready. Say: replace "old text" with "new text". Only an exact match inside one text run can be replaced; the original stays unchanged.':'PDF ready. Say: add correction: followed by your note. A new correction page will be appended; existing PDF pages are preserved.';
 }
 function download(bytes,extension){
  document.getElementById('yap-document-download')?.remove();
  if(outputURL)URL.revokeObjectURL(outputURL);
  const type=extension==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  outputURL=URL.createObjectURL(new Blob([bytes],{type}));
  const a=document.createElement('a');a.id='yap-document-download';a.href=outputURL;a.download=original.name.replace(/\.(docx|pdf)$/i,'')+'-corrected.'+extension;
  a.textContent='Download corrected '+(extension==='pdf'?'PDF':'Word')+' file';a.style.cssText='display:inline-flex;margin:8px;padding:9px;border:1px solid currentColor;border-radius:8px';
  (document.getElementById('photo-preview')?.parentElement||document.body).append(a);
 }
 async function handle(query){
  if(!original)return null;
  const q=String(query||'').trim();
  if(kind==='docx'){
   const m=q.match(/^replace\s+["“](.+?)["”]\s+with\s+["“](.+?)["”][.!]?$/i);
   if(!m)return {text:'For Word, specify the exact change: replace "Old text" with "New text".',source:'document-help'};
   const [oldText,newText]=[m[1],m[2]];if(oldText.length>180||newText.length>250||!oldText)throw Error('Replacement text is too long.');
   const zip=await JSZip.loadAsync(await original.arrayBuffer()),xml=await zip.file('word/document.xml').async('string');
   const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
   const oldXML=escape(oldText),newXML=escape(newText);
   let count=0;
   const updated=xml.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g,run=>{
    const i=run.indexOf('>'),j=run.lastIndexOf('</w:t>');if(i<0||j<0)return run;
    const body=run.slice(i+1,j);if(!body.includes(oldXML))return run;
    count++;return run.slice(0,i+1)+body.replace(oldXML,newXML)+run.slice(j);
   });
   if(count!==1)throw Error(count?'Text appeared in multiple runs. Please use a more specific phrase.':'Exact text was not found in a single Word text run. No file was changed.');
   zip.file('word/document.xml',updated);
   const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
   download(bytes,'docx');
   return {text:'Replaced the exact text in one Word text run. Download the corrected copy below; formatting and other package entries were retained.',source:'document-edited'};
  }
  const m=q.match(/^add correction:\s*([\s\S]{3,1200})$/i);
  if(!m)return {text:'For PDF, enter: add correction: followed by your note. Existing pages cannot be directly rewritten by this tool.',source:'document-help'};
  const pdf=await PDFLib.PDFDocument.load(await original.arrayBuffer());
  const page=pdf.addPage();page.setSize(595,842);const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
  page.drawText('Correction note (appended by YapThing)',{x:40,y:785,size:17,font});
  const safe=m[1].replace(/[^\x20-\x7E]/g,'?'),lines=safe.match(/.{1,84}(?:\s|$)|.{1,84}/g)||[];
  if(lines.length>38)throw Error('Correction note is too long for one page.');
  for(let i=0;i<lines.length;i++)page.drawText(lines[i].trim(),{x:40,y:744-i*17,size:11,font});
  const bytes=await pdf.save();download(bytes,'pdf');
  return {text:'Appended a clearly labeled correction page. Original PDF pages remain unchanged. Download the new PDF below.',source:'document-edited'};
 }
 return {load,handle,clear,hasFile:()=>!!original};
})();
