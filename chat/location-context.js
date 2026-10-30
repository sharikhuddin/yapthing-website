'use strict';
/* Shared clock/location context. No lookup runs at startup. Automatic location
 * stays in memory for 15 minutes; raw IPs and precise coordinates are never kept. */
(function(root){
 const TTL=15*60*1000, clean=(s,n=100)=>String(s||'').replace(/[<>\x00-\x1f]/g,'').replace(/\s+/g,' ').trim().slice(0,n);
 const cities={karachi:'Asia/Karachi',lahore:'Asia/Karachi',islamabad:'Asia/Karachi',london:'Europe/London',chicago:'America/Chicago','new york':'America/New_York','los angeles':'America/Los_Angeles',toronto:'America/Toronto',vancouver:'America/Vancouver',sydney:'Australia/Sydney',melbourne:'Australia/Melbourne',perth:'Australia/Perth',auckland:'Pacific/Auckland',dubai:'Asia/Dubai',delhi:'Asia/Kolkata',mumbai:'Asia/Kolkata',kolkata:'Asia/Kolkata',dhaka:'Asia/Dhaka',tokyo:'Asia/Tokyo',singapore:'Asia/Singapore','hong kong':'Asia/Hong_Kong',beijing:'Asia/Shanghai',shanghai:'Asia/Shanghai',paris:'Europe/Paris',berlin:'Europe/Berlin',rome:'Europe/Rome',madrid:'Europe/Madrid',moscow:'Europe/Moscow',istanbul:'Europe/Istanbul',riyadh:'Asia/Riyadh',cairo:'Africa/Cairo',johannesburg:'Africa/Johannesburg',nairobi:'Africa/Nairobi',honolulu:'Pacific/Honolulu',phoenix:'America/Phoenix',denver:'America/Denver',utc:'UTC'};
 function zone(value){try{if(!value)return '';return new Intl.DateTimeFormat('en',{timeZone:String(value)}).resolvedOptions().timeZone;}catch{return '';}}
 function deviceZone(){try{return zone(new Intl.DateTimeFormat().resolvedOptions().timeZone);}catch{return '';}}
 let location=null,epoch=0,controller=null,pending=false;
 function snapshot(){
  if(location&&location.expires<=Date.now())location=null;
  const tz=deviceZone()||location?.timezone||'UTC';
  return {...(location||{}),timezone:location?.source==='manual'&&location.timezone?location.timezone:tz,
   clockSource:location?.source==='manual'&&location.timezone?'selected timezone':deviceZone()?'device timezone':location?.timezone?'approximate IP timezone':'UTC fallback'};
 }
 function forget(){notice='';epoch++;controller?.abort();controller=null;pending=false;location=null;draw();return snapshot();}
 function manual(city,timezone){
  const label=clean(city,80),tz=zone(timezone);
  if(!label||!tz)throw Error('Enter a city/region and valid IANA timezone, such as Asia/Karachi.');
  forget();location={label,timezone:tz,source:'manual',expires:Infinity};draw();return snapshot();
 }
 async function approximate(){
  if(pending)return false;
  if(!root.confirm?.('Use approximate IP location for this session? ipapi.co will receive your public IP address, but no chat text or account details. VPNs can give the wrong city. YapThing keeps only city, region, country and timezone in memory for 15 minutes. Local questions may share that city with search/AI providers.'))return false;
  const ticket=++epoch;controller?.abort();controller=new AbortController();const abort=controller;pending=true;
  const timer=root.setTimeout(()=>abort.abort(),8000);
  try{
   const response=await root.fetch('https://ipapi.co/json/',{signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Approximate location unavailable. Enter your city manually.');
   const raw=await response.text();if(raw.length>20000)throw Error('Invalid location response.');
   const data=JSON.parse(raw);if(data.error)throw Error('Approximate location unavailable. Enter your city manually.');
   const label=[data.city,data.region,data.country_name].map(x=>clean(x,60)).filter(Boolean).join(', ');
   if(!label)throw Error('No approximate city returned. Enter your city manually.');
   if(ticket!==epoch)return false;
   location={label,timezone:zone(data.timezone),source:'ip',expires:Date.now()+TTL};draw();return true;
  }finally{root.clearTimeout(timer);if(ticket===epoch){pending=false;controller=null;}}
 }
 async function precise(){
  if(pending)return false;
  if(!root.confirm?.('Use your device location once? Your browser will ask permission. YapThing immediately rounds it to about a 1 km grid and keeps only that rounded area in memory for 15 minutes. Local questions may send the rounded area to search/AI providers. No location is saved to your profile.'))return false;
  if(!root.navigator?.geolocation)throw Error('Device location is unavailable here. Enter a city or choose approximate IP location.');
  const ticket=++epoch;controller?.abort();pending=true;
  try{
   const position=await new Promise((resolve,reject)=>root.navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000,maximumAge:0}));
   if(ticket!==epoch)return false;
   const lat=Number(position.coords.latitude),lon=Number(position.coords.longitude);
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Device returned an invalid location.');
   const accuracy=Number(position.coords.accuracy),decimals=Number.isFinite(accuracy)&&accuracy<=1500?2:1;
   location={label:lat.toFixed(decimals)+', '+lon.toFixed(decimals)+' (rounded device area)',source:'device',expires:Date.now()+TTL};
   draw();return true;
  }catch(error){if(ticket!==epoch)return false;throw Error(error?.code===1?'Location permission denied. Enter a city or choose approximate IP location.':error?.code===3?'Location timed out. Enter a city or choose approximate IP location.':'Device location unavailable. Enter a city or choose approximate IP location.');}
  finally{if(ticket===epoch)pending=false;}
 }
 const explicitPlace=q=>/\b(?:in|for|near|around)\s+(?!(?:me|my|here|today|now|tomorrow)\b)[\p{L}][\p{L}\s,.'-]{1,70}(?:[?!.]|$)/iu.test(q);
 const localIntent=q=>!explicitPlace(q)&&(/\b(near me|nearby|around me|my (?:city|area|location)|here|local (?:weather|news|shops|stores|time|restaurants))\b/i.test(q)||/^(?:what(?:'s| is) (?:the )?)?(?:weather|forecast)(?:\s+(?:today|now|tomorrow))?[?!.]*$/i.test(q.trim()));
 function contextFor(q){
  if(!localIntent(q))return '';
  const s=snapshot();
  return s.label?'User-selected location context ('+s.source+(s.source==='ip'?', approximate; VPN may be wrong':'')+'): '+s.label+'. Use only for this local question; do not infer residence, identity, currency or legal jurisdiction.':
   'Location is unknown. Ask for the city/region needed for this local question. Device timezone does not establish location.';
 }
 function queryFor(text,history=[]){
  let q=clean(text,500);
  if(/^(?:in|for|near|around|what about|how about)\s+[\p{L}][\p{L}\s,.'-]{1,70}[?!.]?$/iu.test(q)){
   const prior=[...history].reverse().find(m=>(m.role==='user')&&(m.text||m.content)&&! /^(?:in|for|near|around|what about|how about)\s/i.test(m.text||m.content));
   if(prior)q=clean(prior.text||prior.content,Math.max(30,179-q.length))+' '+q;
  }
  if(localIntent(q)){const s=snapshot();if(s.label){const suffix=' — location: '+s.label.slice(0,100);q=q.slice(0,180-suffix.length)+suffix;}}
  return q.slice(0,180);
 }
 function clockAnswer(text){
  const q=clean(text,220).replace(/[?!.]+$/,'').trim();
  const match=q.match(/^(?:(?:can|could) you (?:please )?tell me |tell me |please tell me )?(?:(?:what(?:'s| is) (?:the )?(?:current |local )?(?:time|date)(?: is it)?|what time is it|(?:the )?(?:current |local )?time|today's date|date today))(?:\s+(?:in|at|for)\s+(.+))?$/i);
  if(!match)return null;
  const s=snapshot(),place=clean(match[1],80),tz=place?(cities[place.toLowerCase()]||zone(place)):s.timezone;
  if(!tz)return {text:'Which timezone do you mean for '+place+'? Use an IANA timezone such as Asia/Karachi. I have not guessed its time.',source:'clock'};
  const now=new Date(),formatted=new Intl.DateTimeFormat(undefined,{timeZone:tz,weekday:'short',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(now);
  return {text:(place?'In '+place:'The time in '+tz)+' is '+formatted+'.\n'+tz+' · device clock'+(place?'':' · '+s.clockSource)+'. This is the time when this reply was created.',source:'clock',timezone:tz,at:now.toISOString()};
 }
 let notice='';
 function draw(){
  const doc=root.document;if(!doc)return;const s=snapshot(),clock=doc.getElementById('yap-live-clock'),state=doc.getElementById('yap-location-state');
  if(clock){clock.textContent=new Intl.DateTimeFormat(undefined,{timeZone:s.timezone,hour:'numeric',minute:'2-digit',second:'2-digit'}).format(new Date())+' · '+s.timezone;clock.dateTime=new Date().toISOString();clock.title='Uses '+s.clockSource+' and your device clock. Check device clock settings if incorrect.';}
  if(state)state.textContent=notice|| (s.label?(s.source==='ip'?'Approximate IP: ':s.source==='manual'?'Selected city: ':'Rounded area: ')+s.label+(s.source==='manual'?'':' · expires after 15 minutes; VPN/location errors are possible'):'Location off. Device timezone is used for the clock only.');
 }
 function mount(){
  const doc=root.document;if(!doc||doc.getElementById('yap-location-controls'))return;
  const host=doc.querySelector('.statusline')||doc.querySelector('#chat-workspace .chat-bottom')||doc.querySelector('.app-header');if(!host)return;
  const wrap=doc.createElement('details');wrap.id='yap-location-controls';wrap.className='yap-location-controls';
  const summary=doc.createElement('summary'),clock=doc.createElement('time');clock.id='yap-live-clock';clock.setAttribute('aria-live','off');summary.append(clock);wrap.append(summary);
  const box=doc.createElement('div');box.className='yap-location-options';
  const state=doc.createElement('p');state.id='yap-location-state';state.setAttribute('role','status');box.append(state);
  const note=doc.createElement('p');note.textContent='Location is optional. A timezone is not proof of your city. Automatic location stays in memory for 15 minutes. Search/AI may receive your selected city or rounded area only for local questions. Use Forget location to stop sharing it.';box.append(note);
  const city=doc.createElement('input');city.placeholder='City / region';city.setAttribute('aria-label','City or region');city.maxLength=80;
  const timezone=doc.createElement('input');timezone.placeholder='Timezone, e.g. Asia/Karachi';timezone.setAttribute('aria-label','IANA timezone');timezone.value=snapshot().timezone;city.addEventListener('change',()=>{const known=cities[city.value.trim().toLowerCase()];if(known)timezone.value=known;});box.append(city,timezone);
  function button(label,action){const b=doc.createElement('button');b.type='button';b.textContent=label;b.onclick=async()=>{b.disabled=true;notice='';try{await action();}catch(e){notice=e.message;}finally{b.disabled=false;draw();}};box.append(b);}
  button('Use entered city',()=>manual(city.value,timezone.value));button('Use device location once',precise);button('Use approximate IP location',approximate);button('Forget location',()=>{forget();city.value='';timezone.value=snapshot().timezone;});
  const link=doc.createElement('a');link.href='https://ipapi.co/privacy/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='IP location provider privacy';box.append(link);wrap.append(box);host.append(wrap);draw();
  root.setInterval?.(()=>{if(doc.visibilityState!=='hidden')draw();},1000);
  doc.addEventListener?.('visibilitychange',draw);
 }
 root.YapLocation=Object.freeze({snapshot,revision:()=>epoch,forget,manual,approximate,precise,contextFor,queryFor,clockAnswer,localIntent,explicitPlace});
 root.addEventListener?.('yap:session-change',forget);root.addEventListener?.('pagehide',forget);
 if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount);else mount();
})(typeof window!=='undefined'?window:globalThis);
