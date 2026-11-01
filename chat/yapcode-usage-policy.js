'use strict';
(function(root,factory){const p=factory();if(typeof module==='object'&&module.exports)module.exports=p;if(root)root.YapCodeUsagePolicy=p;})(typeof window==='undefined'?null:window,function(){
 const configs=Object.freeze({
 free:{monthlyCredits:3,maxMinutes:2,maxCloudTasks:0,maxParallel:1},
 plus:{monthlyCredits:40,maxMinutes:10,maxCloudTasks:5,maxParallel:1},
 pro:{monthlyCredits:120,maxMinutes:20,maxCloudTasks:20,maxParallel:2}
 });
 const units=Object.freeze({inspect:0,read:0,github_diff:0,github_status:0,local_models:0,draft_code:1,draft_project:2,write:2,check:1,github_clone:2,github_pr:3,cloud_verify:5,cloud_code:10});
 const plan=t=>Object.hasOwn(configs,t)?t:'free';
 function quote({tier='free',kind,minutes=1,remaining=0,cloudUsed=0,parallel=0}){
  const config=configs[plan(tier)],unit=units[kind];
  if(unit===undefined)return {allowed:false,reason:'Unsupported coding action'};
  const estimatedMinutes=Number(minutes);
  if(!Number.isFinite(estimatedMinutes)||estimatedMinutes<0||estimatedMinutes>config.maxMinutes)return {allowed:false,reason:'This task exceeds the plan runtime limit'};
  const cloud=kind.startsWith('cloud_');
  if(cloud&&cloudUsed>=config.maxCloudTasks)return {allowed:false,reason:'Cloud coding allowance reached'};
  if(parallel>=config.maxParallel)return {allowed:false,reason:'Concurrent Work task limit reached'};
  if(remaining<unit)return {allowed:false,reason:'Insufficient Work credits',cost:unit,remaining};
  return {allowed:true,cost:unit,remaining,after:remaining-unit,maxMinutes:config.maxMinutes,cloudRemaining:Math.max(0,config.maxCloudTasks-cloudUsed-(cloud?1:0)),requiresApproval:unit>0};
 }
 function usageRatio(remaining,limit){const l=Number(limit),r=Number(remaining);return Number.isFinite(l)&&l>0&&Number.isFinite(r)?Math.max(0,Math.min(1,(l-r)/l)):null;}
 function warning(remaining,limit){const r=usageRatio(remaining,limit);return r===null?'unknown':r>=1?'exhausted':r>=.9?'critical':r>=.75?'high':'normal';}
 return Object.freeze({configs,units,plan,quote,usageRatio,warning});
});