'use strict';
(()=>{
const modes=[
{id:'auto',name:'Yap Auto',speed:'Recommended',description:'Automatically uses Gemini 3.1 Flash-Lite for simple questions or 3.5 Flash-Lite for more involved requests. No premium-model surprise charges.',instruction:'Answer directly with appropriate detail for the task. Do not invent sources.'},
{id:'swift',name:'Yap Swift',speed:'Fastest',description:'Gemini 3.1 Flash-Lite. Fast, low-cost responses for simple questions.',instruction:'Keep the answer concise and direct. Prefer a short answer with only essential details.'},
{id:'balance',name:'Yap Balance',speed:'Recommended',description:'Recommended for everyday chat, documents and photos. Gemini 3.5 Flash-Lite balances detail and usage.',instruction:'Give a clear answer with useful detail and practical examples when helpful.'},
{id:'depth',name:'Yap Depth',speed:'More time',description:'Gemini 3.8 Flash for harder questions and deeper research. Uses more processing and may take longer.',instruction:'Analyze the question carefully. Explain relevant tradeoffs, assumptions and uncertainty. Do not invent evidence.'},
{id:'story',name:'Yap Story',speed:'Varies with length',description:'Gemini 3.5 Flash-Lite with more room for polished writing and creative drafts.',instruction:'For writing requests produce a polished, natural draft in the requested tone. For factual questions prioritize accuracy and cite available evidence.'}
];
let selected='auto';try{const saved=localStorage.getItem('yap.response-mode');if(modes.some(m=>m.id===saved))selected=saved;}catch{}
const picker=document.createElement('details');picker.id='yap-response-modes';
const summary=document.createElement('summary'),panel=document.createElement('div');panel.className='yap-mode-panel';picker.append(summary,panel);
const heading=document.createElement('h3');heading.textContent='Make it your Yap';panel.append(heading);const note=document.createElement('p');note.textContent='Choose how YapThing responds. Auto is the default for new accounts and chooses a low-cost Gemini model. Depth explicitly uses a stronger Google model. Current research uses Brave first; photo editing uses its own image model. Speed varies.';panel.append(note);
const buttons=[];
function refresh(){const mode=modes.find(m=>m.id===selected);summary.replaceChildren();const icon=document.createElement('img');icon.src='yapthing-icon.svg';icon.alt='';const label=document.createElement('span');label.textContent=mode.name;const caret=document.createElement('span');caret.textContent='⌃';caret.setAttribute('aria-hidden','true');summary.append(icon,label,caret);summary.setAttribute('aria-label','Choose your Yap style. Current: '+mode.name);for(const [button,item] of buttons)button.setAttribute('aria-pressed',String(item.id===selected));}
for(const mode of modes){const button=document.createElement('button');button.type='button';const title=document.createElement('strong'),speed=document.createElement('span'),desc=document.createElement('small');title.textContent=mode.name;speed.textContent=mode.speed;desc.textContent=mode.description;button.append(title,speed,desc);button.onclick=()=>{selected=mode.id;try{localStorage.setItem('yap.response-mode',selected)}catch{}refresh();picker.open=false;summary.focus();};buttons.push([button,mode]);panel.append(button);}
const row=document.querySelector('.compose-row');if(row){row.classList.add('yap-compose-modes');row.insertBefore(picker,document.getElementById('send'));}refresh();
document.addEventListener('click',e=>{if(!picker.contains(e.target))picker.open=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picker.open){picker.open=false;summary.focus();}});
window.YapResponseModes={current:()=>({...modes.find(m=>m.id===selected)})};
})();
