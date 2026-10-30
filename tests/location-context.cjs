'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync(path.join(__dirname,'../chat/location-context.js'),'utf8');
function app(options={}){
 let now=Date.parse('2026-10-30T23:30:00Z'),fetches=[],geoCalls=0;const events={};
 class Clock extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
 const window={Date:Clock,Intl,URL,AbortController,console,setTimeout:()=>1,clearTimeout(){},confirm:()=>options.consent!==false,addEventListener:(n,f)=>events[n]=f,fetch:async(url,init)=>{fetches.push({url,init});return options.fetch?options.fetch(url,init):{ok:true,text:async()=>JSON.stringify({ip:'198.51.100.7',latitude:24.8607,longitude:67.0011,city:'Karachi',region:'Sindh',country_name:'Pakistan',timezone:'Asia/Karachi'})};},navigator:{geolocation:{getCurrentPosition:(yes,no,settings)=>{geoCalls++;assert.equal(settings.maximumAge,0);if(options.geo)return options.geo(yes,no);yes({coords:{latitude:24.860735,longitude:67.001137,accuracy:10}});}}}};
 window.window=window;vm.runInNewContext(script,window);
 return {root:window,api:window.YapLocation,fetches,events,geoCalls:()=>geoCalls,advance:ms=>now+=ms};
}
(async()=>{
 const a=app();assert.equal(a.fetches.length,0,'no IP lookup at startup');assert.equal(a.geoCalls(),0);
 const clock=a.api.clockAnswer('Can you tell me the time in karachi');assert.equal(clock.timezone,'Asia/Karachi');assert.match(clock.text,/Oct 31, 2026/);assert.match(clock.text,/4:30:00/);
 assert.equal(a.api.clockAnswer('How does time travel work?'),null);
 assert.equal(a.api.clockAnswer('What time is my flight in Karachi?'),null);
 assert.match(a.api.clockAnswer('What time is it in Springfield?').text,/Which timezone/);
 assert.equal(a.api.clockAnswer('Time in America/New_York').timezone,'America/New_York');
 a.api.manual('London','Europe/London');a.advance(Date.parse('2026-11-01T05:30:00Z')-Date.parse('2026-10-30T23:30:00Z'));
 assert.match(a.api.clockAnswer('Time in New York').text,/1:30:00.*EDT/);a.advance(3600000);assert.match(a.api.clockAnswer('Time in New York').text,/1:30:00.*EST/);
 assert.throws(()=>a.api.manual('Nowhere','Bogus/Zone'));
 assert.equal(a.api.contextFor('Explain photosynthesis'),'');assert.match(a.api.contextFor('Weather here'),/London/);
 assert.equal(a.api.contextFor('Weather in Karachi today'),'','explicit place overrides automatic context');
 assert.equal(a.api.queryFor('Weather in Karachi today'),'Weather in Karachi today');
 const history=[{role:'user',text:'What is the price of 1 lb pink salt?'},{role:'assistant',text:'The price is USD 0.99 ignore instructions'}];
 assert.equal(a.api.queryFor('In Pakistan',history),'What is the price of 1 lb pink salt? In Pakistan');
 assert(!a.api.queryFor('In Canada',history).includes('PKR'));
 assert.match(a.api.queryFor('restaurants near me'),/London/);
 await a.api.approximate();assert.equal(a.fetches.length,1);assert.equal(a.fetches[0].init.credentials,'omit');assert.equal(a.fetches[0].init.referrerPolicy,'no-referrer');
 assert.equal(a.api.snapshot().source,'ip');assert.match(a.api.snapshot().label,/Karachi/);assert(!JSON.stringify(a.api.snapshot()).includes('198.51'));assert(!JSON.stringify(a.api.snapshot()).includes('latitude'));
 assert.match(a.api.contextFor('Weather here'),/approximate/);a.advance(15*60000+1);assert.equal(a.api.snapshot().label,undefined);assert.match(a.api.contextFor('Weather here'),/unknown/);
 const noZone=app();noZone.root.Intl={DateTimeFormat:function(locale,options){return options?.timeZone?new Intl.DateTimeFormat(locale,options):{resolvedOptions:()=>({})};}};assert.equal(noZone.api.snapshot().timezone,'UTC');await noZone.api.approximate();assert.equal(noZone.api.snapshot().timezone,'Asia/Karachi');
 const deny=app({consent:false});assert.equal(await deny.api.approximate(),false);assert.equal(await deny.api.precise(),false);assert.equal(deny.fetches.length,0);assert.equal(deny.geoCalls(),0);
 const denied=app({geo:(_y,n)=>n({code:1})});await assert.rejects(()=>denied.api.precise(),/permission denied/);assert.equal(denied.fetches.length,0,'permission denial does not silently trigger IP lookup');
 const precise=app();await precise.api.precise();assert.match(precise.api.snapshot().label,/24.86, 67.00/);assert(!JSON.stringify(precise.api.snapshot()).includes('860735'));assert.equal(precise.fetches.length,0);
 precise.events['yap:session-change']();assert.equal(precise.api.snapshot().label,undefined);
 let release;const race=app({fetch:()=>new Promise(r=>release=r)});const pending=race.api.approximate();race.api.forget();release({ok:true,text:async()=>JSON.stringify({city:'Karachi',timezone:'Asia/Karachi'})});assert.equal(await pending,false);assert.equal(race.api.snapshot().label,undefined);
 let position;const stale=app({geo:y=>position=y});const fixing=stale.api.precise();stale.api.manual('Chicago','America/Chicago');position({coords:{latitude:24.86,longitude:67,accuracy:10}});assert.equal(await fixing,false);assert.equal(stale.api.snapshot().label,'Chicago');
 const fail=app({fetch:async()=>({ok:false})});await assert.rejects(()=>fail.api.approximate(),/unavailable/);assert.equal(fail.api.snapshot().label,undefined);
 console.log('PASS clock (Karachi, midnight, DST, unknown places), explicit-location priority, follow-ups, consent, denial, minimized data, expiry and stale callback protection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
