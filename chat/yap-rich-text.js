'use strict';
/* YapThing rich answer renderer. Strict text-node DOM: never interpret model HTML. */
(()=>{
 const doc=()=>document,bt=String.fromCharCode(96);
 const node=(tag,cls)=>{const n=doc().createElement(tag);if(cls)n.className=cls;return n};
 const safeLink=url=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
 function addLink(parent,label,url,onLink){
  const safe=safeLink(url);if(!safe){parent.append(doc().createTextNode(label));return}
  const a=node('a');a.href=safe;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;
  if(onLink)a.addEventListener('click',e=>{e.preventDefault();onLink(safe)});
  parent.append(a);
 }
 function inline(parent,source,options={},depth=0){
  const str=String(source||'');
  if(depth>3||str.length>35000){parent.append(doc().createTextNode(str));return}
  const pattern=/(\x60[^\x60\n]+\x60|\*\*[^\n*]+(?:\*[^*\n]+)?\*\*|__[^\n_]+__|(?<!\w)\*[^\n*]+\*|(?<!\w)_[^\n_]+_|(?:\[[^\]\n]{1,160}\]\(https?:\/\/[^\s)<>]+\))|\[\d{1,2}\]|https?:\/\/[^\s<>"'\x60]+)/g;
  let last=0,match;
  while((match=pattern.exec(str))){
   if(match.index>last)parent.append(doc().createTextNode(str.slice(last,match.index)));
   const raw=match[0];
   if(raw.startsWith(bt)){const element=node('code','yp-inline-code');element.textContent=raw.slice(1,-1);parent.append(element);}
   else if(raw.startsWith('**')||raw.startsWith('__')){
    const element=node('strong');inline(element,raw.slice(2,-2),options,depth+1);parent.append(element);
   }else if(raw.startsWith('*')||raw.startsWith('_')){
    const element=node('em');inline(element,raw.slice(1,-1),options,depth+1);parent.append(element);
   }else if(raw.startsWith('[')&&raw.includes('](')){
    const i=raw.indexOf('](');addLink(parent,raw.slice(1,i),raw.slice(i+2,-1),options.onLink);
   }else if(/^\[\d{1,2}\]$/.test(raw)){
    const ref=Array.isArray(options.sources)?options.sources[Number(raw.slice(1,-1))-1]:null;
    if(ref?.url&&safeLink(ref.url))addLink(parent,raw,ref.url,options.onLink);
    else parent.append(doc().createTextNode(raw));
   }else{
    const cleaned=raw.replace(/[.,!?;:]+$/,'');
    addLink(parent,cleaned,cleaned,options.onLink);
    if(cleaned.length<raw.length)parent.append(doc().createTextNode(raw.slice(cleaned.length)));
   }
   last=pattern.lastIndex;
  }
  if(last<str.length)parent.append(doc().createTextNode(str.slice(last)));
 }
 const fence=line=>line.match(/^ {0,3}(\x60{3,}|~{3,})([A-Za-z0-9#+_.-]{0,28})(?:[ \t].*)?$/);
 const header=line=>line.match(/^ {0,3}(#{1,4})\s+(.+?)\s*#*\s*$/);
 const marker=line=>line.match(/^(\s{0,10})([-*+]|\d{1,4}[.)])\s+(.+)$/);
 const quote=line=>/^ {0,3}>\s?/.test(line);
 const rule=line=>/^ {0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line);
 const separator=line=>/^\s*\|?\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)+\s*\|?\s*$/ .test(line);
 const splitCells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/).map(c=>c.trim().replace(/\\\|/g,'|'));
 const startsBlock=(lines,i)=>Boolean(fence(lines[i])||header(lines[i])||marker(lines[i])||quote(lines[i])||rule(lines[i])||(i+1<lines.length&&lines[i].includes('|')&&separator(lines[i+1])));
 function copyButton(content){
  const button=node('button','yp-copy');button.type='button';button.textContent='Copy code';button.setAttribute('aria-label','Copy code block');
  button.addEventListener('click',async()=>{
   try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(content);
    else{
     const input=node('textarea');input.value=content;input.style.cssText='position:fixed;left:-200vw;top:0';doc().body.append(input);input.select();
     const success=doc().execCommand?.('copy');input.remove();if(!success)throw Error('Clipboard unavailable');
    }
    button.textContent='Copied';button.setAttribute('aria-label','Code copied');
   }catch{button.textContent='Select code to copy';button.setAttribute('aria-label','Select code to copy');}
  });
  return button;
 }
 function codeBlock(lines,start){
  const m=fence(lines[start]),lang=(m?.[2]||'Code').slice(0,24),symbol=m[1][0],width=m[1].length;
  const body=[];let i=start+1;
  const closing=new RegExp('^ {0,3}'+(symbol===bt?'\\x60':'~')+'{'+width+',}\\s*$');
  while(i<lines.length&&!closing.test(lines[i])){body.push(lines[i]);i++;}
  const root=node('div','yp-code-block'),head=node('div','yp-code-header'),label=node('span','yp-code-language');
  label.textContent=lang;const content=body.join('\n');head.append(label,copyButton(content));
  const pre=node('pre'),code=node('code');code.textContent=content;pre.append(code);root.append(head,pre);
  return {node:root,next:i<lines.length?i+1:i};
 }
 function addList(lines,start,options){
  const root=node('div','yp-list-group'),stack=[];let i=start;
  while(i<lines.length){
   const m=marker(lines[i]);if(!m)break;
   const indent=m[1].length,type=/^\d/.test(m[2])?'ol':'ul';
   while(stack.length&&(stack.at(-1).indent>indent||(stack.at(-1).indent===indent&&stack.at(-1).type!==type)))stack.pop();
   if(!stack.length||indent>stack.at(-1).indent){
    const list=node(type);
    if(type==='ol'){const n=Number(m[2].match(/^\d+/)?.[0]||1);if(n>1)list.start=n;}
    if(stack.length&&stack.at(-1).last)stack.at(-1).last.append(list);else root.append(list);
    stack.push({indent,type,list,last:null});
   }
   const li=node('li'),body=node('span','yp-li-text');inline(body,m[3],options);li.append(body);stack.at(-1).list.append(li);stack.at(-1).last=li;i++;
   while(i<lines.length&&/^ {2,}\S/.test(lines[i])&&!marker(lines[i])&&!startsBlock(lines,i)){
    const continuation=node('span','yp-li-continuation');continuation.append(doc().createTextNode(' '));inline(continuation,lines[i].trim(),options);li.append(continuation);i++;
   }
  }
  return {node:root,next:i};
 }
 function addTable(lines,start,options){
  const heads=splitCells(lines[start]);if(heads.length<2||heads.length>10)return null;
  const wrap=node('div','yp-table-scroll'),table=node('table'),thead=node('thead'),tr=node('tr');
  for(const heading of heads){const th=node('th');inline(th,heading,options);tr.append(th)}
  thead.append(tr);table.append(thead);
  const tbody=node('tbody');let i=start+2,count=0;
  while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()&&count<75){
   const cells=splitCells(lines[i]),row=node('tr');
   for(let k=0;k<heads.length;k++){const cell=node('td');inline(cell,cells[k]||'',options);row.append(cell)}
   tbody.append(row);i++;count++;
  }
  table.append(tbody);wrap.append(table);wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Answer table');wrap.tabIndex=0;
  return {node:wrap,next:i};
 }
 function render(target,answer,options={}){
  target.replaceChildren();target.classList.add('yap-prose');
  const src=String(answer??'').replace(/\r\n?/g,'\n').slice(0,42000),lines=src.split('\n').slice(0,1400);
  let i=0;
  while(i<lines.length){
   const line=lines[i];if(!line.trim()){i++;continue}
   if(fence(line)){const b=codeBlock(lines,i);target.append(b.node);i=b.next;continue}
   const h=header(line);
   if(h){const level=Math.min(4,Math.max(2,h[1].length+1)),el=node('h'+level);inline(el,h[2],options);target.append(el);i++;continue}
   if(rule(line)){target.append(node('hr'));i++;continue}
   if(i+1<lines.length&&line.includes('|')&&separator(lines[i+1])){
    const tbl=addTable(lines,i,options);if(tbl){target.append(tbl.node);i=tbl.next;continue}
   }
   if(marker(line)){const list=addList(lines,i,options);target.append(list.node);i=list.next;continue}
   if(quote(line)){const block=node('blockquote'),body=[];while(i<lines.length&&quote(lines[i])){body.push(lines[i].replace(/^ {0,3}>\s?/,''));i++;}const p=node('p');inline(p,body.join(' '),options);block.append(p);target.append(block);continue}
   const body=[line.trim()];i++;while(i<lines.length&&lines[i].trim()&&!startsBlock(lines,i)){body.push(lines[i].trim());i++;}
   const para=node('p');inline(para,body.join(' '),options);target.append(para);
  }
  if(!target.childNodes.length){const para=node('p');para.textContent=src;target.append(para)}
  return target;
 }
 window.YapRichText=Object.freeze({render});
})();
