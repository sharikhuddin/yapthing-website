'use strict';
(()=>{
const modes=[
{id:'swift',name:'Yap Swift',speed:'Fast',description:'Short, direct answers. One search provider when current facts are needed.',instruction:'Keep the answer concise and direct. Prefer a short answer with only essential details.'},
{id:'balance',name:'Yap Balance',speed:'Balanced',description:'Everyday questions and work. Automatic search with fallback when a provider is unavailable.',instruction:'Give a clear answer with useful detail and practical examples when helpful.'},
{id:'depth',name:'Yap Depth',speed:'More time',description:'Complex questions. Adds a second research source when web research succeeds.',instruction:'Analyze the question carefully. Explain relevant tradeoffs, assumptions and uncertainty. Do not invent evidence.'},
{id:'story',name:'Yap Story',speed:'Varies with length',description:'Writing and creative ideas. Searches when facts need checking; focuses on a polished draft.',instruction:'For writing requests produce a polished, natural draft in the requested tone. For factual questions prioritize accuracy and cite available evidence.'}
];
let selected='balance';try{const saved=localStorage.getItem('yap.response-mode');if(modes.some(m=>m.id===saved))selected=saved;}catch{}
const picker=document.createElement('details');picker.id='yap-response-modes';
const summary=document.createElement('summary'),panel=document.createElement('div');panel.className='yap-mode-panel';picker.append(summary,panel);
const note=document.createElement('p');note.textContent='Response styles and search strategies. These are not separate AI models. Actual speed depends on your connection and the response service.';panel.append(note);
const buttons=[];
function refresh(){summary.textContent=modes.find(m=>m.id===selected).name+' ▾';for(const [button,mode] of buttons)button.setAttribute('aria-pressed',String(mode.id===selected));}
for(const mode of modes){const button=document.createElement('button');button.type='button';const title=document.createElement('strong'),speed=document.createElement('span'),desc=document.createElement('small');title.textContent=mode.name;speed.textContent=mode.speed;desc.textContent=mode.description;button.append(title,speed,desc);button.onclick=()=>{selected=mode.id;try{localStorage.setItem('yap.response-mode',selected)}catch{}refresh();picker.open=false;summary.focus();};buttons.push([button,mode]);panel.append(button);}
document.querySelector('.topline')?.append(picker);refresh();
document.addEventListener('click',e=>{if(!picker.contains(e.target))picker.open=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picker.open){picker.open=false;summary.focus();}});
window.YapResponseModes={current:()=>({...modes.find(m=>m.id===selected)})};
})();
