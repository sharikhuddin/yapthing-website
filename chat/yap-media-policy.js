'use strict';

/**
 * YapThing low-cost media/document routing policy.
 * This is a shared *policy recommendation*; never trust browser decisions for
 * billing or quotas. The authenticated server must re-evaluate and enforce them.
 * No network calls or third-party charges are initiated by this module.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.YapMediaPolicy=api;
})(typeof window==='undefined'?null:window,function(){
  const TIERS=Object.freeze({
    free:Object.freeze({documentExportsPerMonth:3,imageEditsPerMonth:0,maxUploadMB:2}),
    plus:Object.freeze({documentExportsPerMonth:40,imageEditsPerMonth:4,maxUploadMB:8}),
    pro:Object.freeze({documentExportsPerMonth:150,imageEditsPerMonth:15,maxUploadMB:16})
  });
  const DOC_EXT=new Set(['txt','md','pdf','docx','csv','json']);
  const IMAGE_EXT=new Set(['png','jpg','jpeg','webp']);
  const VISUAL_RE=/\b(remove (?:the )?background|replace (?:the )?background|change (?:the )?background|erase (?:an? )?object|recolor|make (?:it )?look like|generate (?:an? )?image|draw (?:a|an)|illustrate)\b/i;
  const DOCUMENT_RE=/\b(letter|resume|cv|document|contract|invoice|pdf|word|docx|rewrite|change (?:the )?(?:name|date|address)|edit (?:the )?text|extract text)\b/i;
  function extension(filename){return String(filename||'').split('.').pop().toLowerCase();}
  function route({filename='',mimeType='',prompt=''}={}){
    const ext=extension(filename),mime=String(mimeType||'').toLowerCase(),ask=String(prompt||'');
    const image=IMAGE_EXT.has(ext)||/^image\/(png|jpeg|webp)$/.test(mime);
    const doc=DOC_EXT.has(ext)||mime==='application/pdf';
    if(VISUAL_RE.test(ask)&&!DOCUMENT_RE.test(ask))return 'image-edit';
    // A screenshot of a letter is a document task, not an expensive image edit.
    if(DOCUMENT_RE.test(ask))return 'document';
    if(doc)return 'document';
    if(image)return 'needs-intent';
    return 'needs-intent';
  }
  function limits(tier){return TIERS[tier]||TIERS.free;}
  function validate({tier='free',kind='document',used=0,bytes=0}={}){
    const l=limits(tier),limit=kind==='image-edit'?l.imageEditsPerMonth:l.documentExportsPerMonth;
    if(!Number.isFinite(bytes)||bytes<0||bytes>l.maxUploadMB*1024*1024)return {allowed:false,reason:'upload_limit'};
    if(!Number.isSafeInteger(used)||used<0)return {allowed:false,reason:'invalid_usage'};
    if(used>=limit)return {allowed:false,reason:'quota_exceeded'};
    return {allowed:true,reason:'ok'};
  }
  return Object.freeze({TIERS,route,limits,validate});
});
