'use strict';
(()=>{
const base='https://uemjkfvcadggyvhbqqyp.supabase.co/functions/v1/',key='sb_publishable_HqcXeSMELbRgGodOzr0kCA_VwZldmBJ';
const cache=new Map(),pending=new Map();
const actor=()=>window.YapWebAccount?.getUserId()||'guest';
const prefKey=()=> 'yap.preferences.v1.'+actor();
const enums={length:['balanced','concise','detailed'],tone:['plain','professional','friendly'],language:['English','Urdu','Spanish','Arabic']};
function preferences(){try{const p=JSON.parse(localStorage.getItem(prefKey())||'{}');return Object.fromEntries(Object.entries(enums).filter(([k,v])=>v.includes(p[k])).map(([k])=>[k,p[k]]));}catch{return {};}}
function learnExplicitStyle(text){
 const original=String(text||"").trim();
 if(original.length>130||original.includes("?")||actor()==="guest")return null;
 if(!/\b(?:remember|from now on|going forward|always|for future (?:answers|replies)|save (?:this|my) preference)\b/i.test(original))return null;
 let name="",value="";
 if(/\b(?:short|shorter|concise|brief|to the point)\b/i.test(original)){name="length";value="concise";}
 else if(/\b(?:detail|detailed|in depth|elaborate)\b/i.test(original)){name="length";value="detailed";}
 else if(/\b(?:professional|formal)\b/i.test(original)){name="tone";value="professional";}
 else if(/\b(?:friendly|casual|natural|conversational)\b/i.test(original)){name="tone";value="friendly";}
 else if(/\b(?:plain|straightforward)\b/i.test(original)){name="tone";value="plain";}
 if(!name||!enums[name]?.includes(value))return null;
 try{const updated={...preferences(),[name]:value};localStorage.setItem(prefKey(),JSON.stringify(updated));return "Got it. I'll use a "+value+" "+(name==="length"?"response length":"tone")+" for your YapThing replies on this device. You can change or clear it in Do more → Your preferences.";}catch{return null;}
}
async function account(slug){
 const uid=actor(),token=await window.YapWebAccount?.getToken();if(!token||uid==='guest')throw Error('Sign in to use this account service.');
 const r=await (window.YapWebAccount.authFetch||fetch)(base+slug,{headers:{authorization:'Bearer '+token,apikey:key},signal:AbortSignal.timeout(12000)});
 const d=await r.json();if(actor()!==uid)throw Error('Your account changed. Please try again.');if(!r.ok)throw Error(d.error||'Account service unavailable.');return d;
}
function parse(text){
 const q=String(text).trim();let m;
 if((m=q.match(/^(?:convert\s+)?(\d+(?:\.\d{1,6})?)\s+([a-z]{3})\s+(?:to|in)\s+([a-z]{3})[?.]?$/i)))return {kind:'currency',amount:Number(m[1]),from:m[2].toUpperCase(),to:m[3].toUpperCase()};
 if((m=q.match(/^\/?calculate\s+(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)[?]?$/i)))return {kind:'calculate',a:Number(m[1]),operator:m[2],b:Number(m[3])};
 if((m=q.match(/^(?:convert\s+)(\d+(?:\.\d+)?)\s*(km|mi|kg|lb|c|f)\s+to\s+(km|mi|kg|lb|c|f)[?.]?$/i)))return {kind:'units',amount:Number(m[1]),from:m[2].toLowerCase(),to:m[3].toLowerCase()};
 if(/^\/?(?:my plan|plan status|my usage|usage status)[?.]?$/i.test(q))return {kind:'plan'};
 if(/^\/?(?:my connections|connection status)[?.]?$/i.test(q))return {kind:'connections'};
 if(/^\/?(?:my preferences|show preferences)[?.]?$/i.test(q))return {kind:'preferences'};
 return null;
}
async function currency(t){
 if(!Number.isFinite(t.amount)||t.amount>1e12)throw Error('Enter an amount up to one trillion.');
 if(t.from===t.to)return {text:t.amount+' '+t.from+' = '+t.amount+' '+t.to,source:'calculator'};
 const pair=t.from+'/'+t.to;let row=cache.get(pair);
 if(!row||Date.now()-row.fetched>3600000){
  if(!pending.has(pair))pending.set(pair,(async()=>{
   const url='https://api.frankfurter.dev/v2/rate/'+pair;
   const r=await fetch(url,{signal:AbortSignal.timeout(10000),credentials:'omit',referrerPolicy:'no-referrer'});
   if(!r.ok)throw Error(r.status===429?'Currency provider is busy. Please try later.':'This currency pair is unavailable.');
   const d=await r.json();if(!Number.isFinite(d.rate)||d.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(d.date))throw Error('Currency response could not be verified.');
   const value={...d,url,fetched:Date.now()};if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(pair,value);return value;
  })().finally(()=>pending.delete(pair)));
  row=await pending.get(pair);
 }
 const result=(t.amount*row.rate).toLocaleString(undefined,{maximumFractionDigits:4});
 return {text:t.amount+' '+t.from+' ≈ '+result+' '+t.to+'\nReference rate dated '+row.date+'. Not a live trading or bank quote; fees may differ.\nSource: Frankfurter\n'+row.url+'\n\nNo AI request used.',source:'currency',sources:[{title:'Frankfurter reference rate',url:row.url}]};
}
async function run(task){
 if(task.kind==='currency')return currency(task);
 if(task.kind==='calculate'){if(task.operator==='/'&&task.b===0)throw Error('Division by zero is undefined.');const value=task.operator==='+'?task.a+task.b:task.operator==='-'?task.a-task.b:task.operator==='*'?task.a*task.b:task.a/task.b;if(!Number.isFinite(value))throw Error('Result is outside the supported range.');return {text:task.a+' '+task.operator+' '+task.b+' = '+Number(value.toPrecision(12))+'\nCalculated on your device. No AI request used.',source:'calculator'};}
 if(task.kind==='units'){const convert={'km:mi':v=>v/1.609344,'mi:km':v=>v*1.609344,'kg:lb':v=>v/0.45359237,'lb:kg':v=>v*0.45359237,'c:f':v=>v*9/5+32,'f:c':v=>(v-32)*5/9};const fn=convert[task.from+':'+task.to];if(!fn)throw Error('Use matching distance, weight or temperature units.');return {text:task.amount+' '+task.from+' = '+Number(fn(task.amount).toPrecision(10))+' '+task.to+'\nCalculated on your device. No AI request used.',source:'calculator'};}
 if(task.kind==='plan'){const [p,q]=await Promise.all([account('yap-plan-status'),account('yap-quota-status')]);return {text:'Your plan: '+p.plan+' ('+p.status+')\n'+Object.entries(q.features||{}).map(([name,v])=>name.replaceAll('_',' ')+': '+v.remaining+' of '+v.limit+' remaining').join('\n')+'\nPrepaid Yap Credits: '+Number(q.prepaid?.credits||0)+'\nResets: '+new Date(q.resetAt).toLocaleString()+'\nManage your subscription: https://yapthing.com/plans/',source:'account'};}
 if(task.kind==='connections'){const d=await window.YapPluginConnections.list();const items=Array.isArray(d.connections)?d.connections:Array.isArray(d.providers)?d.providers:[];return {text:items.length?'Your connected-service status:\n'+items.map(p=>(p.name||p.provider||'Service')+': '+(p.connected===true?'Connected':p.status||'Not connected')).join('\n'):'Manage supported account connections at https://yapthing.com/plugins/. No additional connection status was returned.',source:'account'};}
 return {text:'Your saved response preferences:\n'+(Object.entries(preferences()).map(([k,v])=>k+': '+v).join('\n')||'No preferences saved.')+'\nSaved on this device for this account. Change or clear them in Do more → Your preferences.',source:'preferences'};
}
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
function fill(text){const input=document.getElementById('prompt');input.value=text;input.dispatchEvent(new Event('input'));dialog.close();input.focus();}
const dialog=el('dialog');dialog.id='yap-services';dialog.setAttribute('aria-labelledby','yap-services-title');
const title=el('h2','A little more Yap');title.id='yap-services-title';const close=el('button','Close');close.type='button';close.onclick=()=>dialog.close();dialog.append(close,title,el('p','Get things done in this conversation. Connected services may require sign-in or their own allowance.'));
const groups=[
 ['Payments & finance',[['Convert currency','Convert 100 USD to PKR'],['My plan & usage','My plan'],['Buy extra Yap Credits','Buy extra Yap Credits']]],
 ['AI & automation',[['Research a topic','Research '],['Improve my project','Refactor my project code to improve usability. Inspect the selected files, propose a focused fix and tests, and show the changes for review.']]],
 ['Location & travel',[['Local time','What time is it in Karachi?'],['Travel research','Find current travel information for ']]],
 ['Communication',[['Read connected Gmail','/plugin gmail inbox'],['Draft a message','Draft a message about ']]],
 ['Social & identity',[['My connections','My connections']]],
 ['Utilities & data',[['Calculate','Calculate 125 * 8'],['Convert units','Convert 10 km to mi']]]
];
for(const [name,items] of groups){const section=el('section');section.append(el('h3',name));for(const [label,prompt] of items){const b=el('button',label);b.type='button';b.onclick=()=>{if(label==='Improve my project'){dialog.close();window.YapImprovementDraft?.open();}else if(label==='Buy extra Yap Credits'){window.location.assign('/plans/#topups');}else fill(prompt);};section.append(b);}dialog.append(section);}
const memory=el('section');memory.append(el('h3','Your preferences'),el('p','Only save what you choose. Preferences stay on this device for this account and are sent with cloud replies. This does not train the model.'));
const inputs={};for(const [name,values] of Object.entries(enums)){const label=el('label',name[0].toUpperCase()+name.slice(1)),select=el('select');select.id='yap-pref-'+name;label.htmlFor=select.id;select.append(new Option('Default',''));for(const value of values)select.append(new Option(value,value));inputs[name]=select;memory.append(label,select);}
const memoryNote=el('p');memoryNote.setAttribute('role','status');const save=el('button','Save preferences');save.type='button';save.onclick=()=>{try{localStorage.setItem(prefKey(),JSON.stringify(Object.fromEntries(Object.entries(inputs).filter(([,v])=>v.value).map(([k,v])=>[k,v.value]))));memoryNote.textContent='Preferences saved for this account on this device.';}catch{memoryNote.textContent='Preferences could not be saved in this browser.';}};
const forget=el('button','Clear preferences');forget.type='button';forget.onclick=()=>{try{localStorage.removeItem(prefKey());for(const v of Object.values(inputs))v.value='';memoryNote.textContent='Saved response preferences cleared.';}catch{memoryNote.textContent='Could not clear preferences.';}};memory.append(save,forget,memoryNote);dialog.append(memory);document.body.append(dialog);
function open(){for(const [k,v] of Object.entries(inputs))v.value=preferences()[k]||'';memoryNote.textContent='';dialog.showModal();}
const trigger=el('button','Do more');trigger.type='button';trigger.id='yap-services-open';trigger.onclick=open;
const attachment=document.querySelector('#yap-attachment-menu>div');if(attachment)attachment.append(trigger);else document.querySelector('.composer')?.append(trigger);
window.addEventListener('yap:session-change',()=>dialog.close());
window.YapChatServices={parse,run,preferences,learnExplicitStyle,open};
})();
