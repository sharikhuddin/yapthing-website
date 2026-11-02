'use strict';
(function(root,factory){const policy=factory();if(typeof module==='object'&&module.exports)module.exports=policy;if(root)root.YapCodeUsagePolicy=policy;})(typeof window==='undefined'?null:window,function(){
 const configs=Object.freeze({
  free:Object.freeze({monthlyCredits:3,maxMinutes:2,maxCloudTasks:0,maxParallel:1}),
  plus:Object.freeze({monthlyCredits:40,maxMinutes:10,maxCloudTasks:0,maxParallel:1}),
  pro:Object.freeze({monthlyCredits:120,maxMinutes:20,maxCloudTasks:0,maxParallel:2})
 });
 const units=Object.freeze({inspect:0,read:0,github_diff:0,github_status:0,local_models:0,draft_code:1,draft_project:2,write:2,check:1,github_clone:2,github_pr:3});
 const plan=t=>Object.hasOwn(configs,t)?t:'free';
 // Cloud tasks are never authorized by this browser quote helper. A paid, server-side
 // purchased-credit wallet and atomic reservation must authorize them separately.
 function quote({tier='free',kind,minutes=1,remaining=0,parallel=0}={}){
  if(typeof kind!=='string'||kind.startsWith('cloud_'))return {allowed:false,reason:'Cloud coding requires separately purchased credits and server approval'};
  const config=configs[plan(tier)],unit=units[kind];
  if(unit===undefined)return {allowed:false,reason:'Unsupported coding action'};
  const duration=Number(minutes),available=Number(remaining),active=Number(parallel);
  if(!Number.isFinite(duration)||duration<0||duration>config.maxMinutes)return {allowed:false,reason:'This task exceeds the plan runtime limit'};
  if(!Number.isSafeInteger(active)||active<0||active>=config.maxParallel)return {allowed:false,reason:'Concurrent Work task limit reached'};
  if(!Number.isSafeInteger(available)||available<0||available<unit)return {allowed:false,reason:'Insufficient Work credits',cost:unit};
  return {allowed:true,cost:unit,remaining:available,after:available-unit,maxMinutes:config.maxMinutes,requiresApproval:unit>0};
 }
 function usageRatio(remaining,limit){const l=Number(limit),r=Number(remaining);return Number.isFinite(l)&&l>0&&Number.isFinite(r)?Math.max(0,Math.min(1,(l-r)/l)):null;}
 function warning(remaining,limit){const r=usageRatio(remaining,limit);return r===null?'unknown':r>=1?'exhausted':r>=.9?'critical':r>=.75?'high':'normal';}
 return Object.freeze({configs,units,plan,quote,usageRatio,warning});
});