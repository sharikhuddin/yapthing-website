'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.YapWorkReset=api;})(typeof window==='undefined'?null:window,function(){
 function countdown(resetAt,now=Date.now()){
  const timestamp=Date.parse(String(resetAt||''));
  if(!Number.isFinite(timestamp))return null;
  const seconds=Math.max(0,Math.ceil((timestamp-now)/1000));
  const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60);
  return {seconds,label:days?days+'d '+hours+'h':hours?hours+'h '+minutes+'m':minutes+'m'};
 }
 function state(balance,now=Date.now()){
  const limit=Number(balance?.limit),remaining=Number(balance?.remaining);
  if(!Number.isSafeInteger(limit)||limit<=0||!Number.isSafeInteger(remaining)||remaining<0||remaining>limit)return {status:'unavailable',reason:'Usage balance unavailable'};
  const reset=countdown(balance?.reset_at,now);
  return {status:remaining===0?'paused':'available',remaining,limit,reset,canRequestWork:remaining>0};
 }
 return Object.freeze({countdown,state});
});