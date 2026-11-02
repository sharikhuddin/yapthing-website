'use strict';
/* Browser-side, deterministic spreadsheet edits. No workbook data is sent to a model. */
window.YapSpreadsheet=(()=>{
 let workbook=null,filename='',source=null,initialSource=null;
 const MAX=5*1024*1024;
 const clean=()=>{workbook=null;filename='';source=null;document.getElementById('yap-sheet-download')?.remove();};
 async function load(file){
  if(!/\.xlsx$/i.test(file.name)||file.size>MAX)throw Error('Choose a .xlsx workbook smaller than 5 MB.');
  if(!window.ExcelJS?.Workbook)throw Error('Spreadsheet tools did not load. Refresh the page.');
  const book=new ExcelJS.Workbook();
  await book.xlsx.load(await file.arrayBuffer());
  if(!book.worksheets.length)throw Error('Workbook has no worksheets.');
  if(book.worksheets.length>30)throw Error('Workbook has too many sheets for in-chat editing.');
  clean();workbook=book;filename=file.name;source=file;initialSource=file;
  return 'Attached '+file.name+' ('+book.worksheets.length+' sheets). To change a cell, say: set B15 to Approved. For a different sheet, say: set Sheet2!B15 to Approved. You can also ask: inspect row 15. The original stays unchanged.';
 }
 function sheet(name){if(!workbook)throw Error('Attach an Excel workbook first.');const ws=name?workbook.getWorksheet(name):workbook.worksheets[0];if(!ws)throw Error('Sheet not found. Available sheets: '+workbook.worksheets.map(w=>w.name).join(', '));return ws;}
 function inspect(ws,n){
  if(!Number.isInteger(n)||n<1||n>100000)throw Error('Choose a valid row number.');
  const row=ws.getRow(n),values=[];
  row.eachCell({includeEmpty:false},(cell,col)=>{if(values.length<24){const v=cell.value;values.push(cell.address+': '+(typeof v==='object'?JSON.stringify(v).slice(0,80):String(v).slice(0,80)));}});
  return 'Row '+n+' on '+ws.name+':\n'+(values.join('\n')||'(empty)')+'\n\nTell me the exact cell and replacement value, e.g. set B'+n+' to Approved. No changes have been made.';
 }
 function addDownload(bytes){
  const host=document.getElementById('photo-preview');
  document.getElementById('yap-sheet-download')?.remove();
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.id='yap-sheet-download';a.href=url;
  a.download=filename.replace(/\.xlsx$/i,'')+'-fixed.xlsx';a.textContent='Download corrected Excel workbook';
  a.style.cssText='display:inline-flex;align-items:center;margin:8px 0;padding:9px 12px;border:1px solid currentColor;border-radius:9px;text-decoration:underline';
  (host?.parentElement||document.body).append(a);
  a.addEventListener('click',()=>setTimeout(()=>URL.revokeObjectURL(url),60000),{once:true});
 }

 let proposals=[],revision=0;
 const formulaOf=cell=>cell.value&&typeof cell.value==='object'&&typeof cell.value.formula==='string'?cell.value.formula:null;
 function investigate(){
  if(!workbook)throw Error('Attach Excel workbook first.');
  proposals=[];const findings=[];
  for(const ws of workbook.worksheets){
   ws.eachRow((row)=>{
    row.eachCell((cell)=>{
     const formula=formulaOf(cell),val=cell.value;
     const broken=!!formula&&/#REF!|#NAME\?|#DIV\/0!|#VALUE!|#N\/A/i.test(formula);
     const cached=!!formula&&((val?.result&&typeof val.result==='object'&&val.result.error)||(typeof val?.result==='string'&&/^#(REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!)/.test(val.result)));
     if(!broken&&!cached)return;
     const address=cell.address, reason=broken?'Invalid reference or error token inside formula':'Cached formula result reports an error';
     const match=/^([A-Z]+)([0-9]+)$/.exec(address);
     let suggestion=null;
     // Only suggest formulas where both adjacent rows contain literally identical relative-pattern formulas.
     if(match&&Number(match[2])>1){
      const prev=formulaOf(ws.getCell(match[1]+(Number(match[2])-1)));
      const next=formulaOf(ws.getCell(match[1]+(Number(match[2])+1)));
      const advance=(f,delta)=>f&&f.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/g,(whole,ca,col,ra,num)=>ca+col+ra+(ra?num:Math.max(1,Number(num)+delta)));
      if(prev&&next&&advance(prev,2)===next&&!/#REF!|#NAME\?|#DIV\/0!/i.test(prev+next))suggestion=advance(prev,1);
     }
     const item={sheet:ws.name,address,reason,before:formula||'',suggestion};
     findings.push(item);if(suggestion)proposals.push(item);
    });
   });
  }
  return findings;
 }
 async function repair(query){
  const findings=investigate(),safe=proposals.length;
  if(/\b(?:undo|restore original|revert)\b/i.test(query)){const restored=new ExcelJS.Workbook();await restored.xlsx.load(await initialSource.arrayBuffer());workbook=restored;source=initialSource;revision=0;document.getElementById('yap-sheet-download')?.remove();return {text:'Undo: the latest editable workbook is retained. The originally uploaded workbook is restored in the editor.',source:'sheet-preview'};}
  if(/\b(?:apply|confirm)\b/i.test(query)){
   if(!safe)return {text:'No high-confidence repairs can be applied automatically. Please provide the correct formula for flagged cells.',source:'sheet-preview'};
   const copy=new ExcelJS.Workbook();await copy.xlsx.load(await source.arrayBuffer());
   for(const fix of proposals)copy.getWorksheet(fix.sheet).getCell(fix.address).value={formula:fix.suggestion};
   const bytes=await copy.xlsx.writeBuffer();addDownload(bytes);workbook=copy;source={arrayBuffer:async()=>bytes};revision++;
   return {text:'Applied '+safe+' neighboring-formula pattern repairs. The original uploaded file is unchanged. Download the proposed repaired copy below. Reattach the original to fully undo. Formulas are not recalculated by YapThing; open in Excel and recalculate before relying on results.',source:'sheet-edited'};
  }
  const summary=findings.slice(0,60).map((f,i)=>(i+1)+'. '+f.sheet+'!'+f.address+': '+f.reason+'; '+(f.suggestion?'Proposed ='+f.suggestion:'manual review required')).join('\n');
  return {text:findings.length?'Found '+findings.length+' potentially broken formulas ('+safe+' conservative repair proposals).\n'+summary+(findings.length>60?'\nOnly first 60 shown.':'')+'\n\nPreview only: no change made. Say "apply formula repairs" to accept the safe proposals. No formula engine is available to guarantee correctness.':'Scan complete. No explicit broken-reference tokens or cached formula errors found. This does not prove every formula is correct.',source:'sheet-preview'};
 }

 async function handle(prompt){
  if(!workbook)return null;
  const q=String(prompt||'').trim();
  if(/\b(broken formulas?|formula errors?|fix formulas?|repair workbook|scan workbook|audit formulas?|apply formula repairs|undo repairs)\b/i.test(q))return repair(q);
  let m=q.match(/^(?:inspect|show|check|fix)\s+row\s+(\d+)(?:\s+(?:on|in)\s+sheet\s+([a-z0-9 _-]+))?[?.!]?$/i);
  if(m)return {text:inspect(sheet(m[2]?.trim()),Number(m[1])),source:'sheet-preview'};
  m=q.match(/^(?:set|change|replace|fix)\s+(?:(?:cell\s+)?(?:(?:sheet\s+)?([a-z0-9 _-]+)!)?)([A-Z]{1,3}\d{1,6})\s+(?:to|with|as|=)\s+(.+)$/i);
  if(!m)return {text:'Your Excel file is attached. Tell me exactly what to change (for example, “set B15 to Approved”) or say “inspect row 15.”',source:'sheet-help'};
  const ws=sheet(m[1]?.trim()),address=m[2].toUpperCase(),value=m[3].trim();
  if(!value||value.length>500)throw Error('Replacement value must be 1–500 characters.');
  const cell=ws.getCell(address);
  if(cell.type===ExcelJS.ValueType.Formula||cell.value&&typeof cell.value==='object')throw Error('This cell contains a formula or rich value. Editing it needs an explicit formula-aware workflow.');
  const before=cell.value;
  const copy=new ExcelJS.Workbook();await copy.xlsx.load(await source.arrayBuffer());
  const target=copy.getWorksheet(ws.name).getCell(address);
  target.value=/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)?Number(value):value;
  const bytes=await copy.xlsx.writeBuffer();
  if(!bytes?.byteLength)throw Error('Could not create the corrected workbook.');
  addDownload(bytes);
  workbook=copy;source={arrayBuffer:async()=>bytes};
  return {text:'Updated '+ws.name+'!'+address+' from '+JSON.stringify(before)+' to '+JSON.stringify(target.value)+'. Your original workbook was not modified. Use “Download corrected Excel workbook” below the attachment preview.',source:'sheet-edited'};
 }
 return {load,handle,clear:clean,hasFile:()=>!!workbook};
})();