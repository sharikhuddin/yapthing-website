const fs=require('fs'),vm=require('vm'),assert=require('assert');
const JSZip=require('../chat/jszip.min.js'),PDFLib=require('../chat/pdf-lib.min.js');
let exported;
class TestBlob extends Blob {constructor(parts,opts){super(parts,opts);exported=this;}}
const host={append:()=>{}},ctx={Array,window:{JSZip,PDFLib},JSZip,PDFLib,Blob:TestBlob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},document:{getElementById:()=>null,createElement:()=>({style:{},addEventListener(){}}),body:host},console};
vm.runInNewContext(fs.readFileSync('chat/yap-documents.js','utf8'),ctx);
const tool=ctx.window.YapDocuments;
(async()=>{
 const z=new JSZip();z.file('word/document.xml','<w:document><w:body><w:p><w:r><w:t>Old text</w:t></w:r></w:p></w:body></w:document>');let bytes=await z.generateAsync({type:'uint8array'});
 await tool.load({name:'a.docx',size:bytes.length,arrayBuffer:async()=>bytes});
 assert.match((await tool.handle('replace "Old text" with "New text"')).text,/Replaced/);
 let changed=await JSZip.loadAsync(await exported.arrayBuffer());assert.match(await changed.file('word/document.xml').async('string'),/New text/);
 const pdf=await PDFLib.PDFDocument.create();pdf.addPage([400,500]);bytes=await pdf.save();
 await tool.load({name:'a.pdf',size:bytes.length,arrayBuffer:async()=>bytes});
 assert.match((await tool.handle('add correction: Correct the date to November 2')).text,/Appended/);
 const output=await PDFLib.PDFDocument.load(await exported.arrayBuffer());assert.equal(output.getPageCount(),2);
 console.log('PASS Word replacement and PDF correction appended');
})().catch(e=>{console.error(e);process.exitCode=1});
