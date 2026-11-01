'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),p=require('../chat/yapcode-usage-policy.js');
test('unknown plan fails closed',()=>assert.equal(p.plan('enterprise'),'free'));
test('no subscription includes paid cloud coding',()=>{for(const tier of ['free','plus','pro'])for(const kind of ['cloud_code','cloud_verify'])assert.equal(p.quote({tier,kind,remaining:999}).allowed,false);});
test('plan credit allowances do not enable cloud execution',()=>{for(const tier of ['plus','pro'])assert.equal(p.configs[tier].maxCloudTasks,0);});
test('local task quota prevents overspend',()=>{assert.equal(p.quote({tier:'plus',kind:'github_pr',remaining:2}).allowed,false);assert.equal(p.quote({tier:'plus',kind:'github_pr',remaining:3}).after,0);});
test('reject malformed credit balances and concurrency',()=>{for(const remaining of [NaN,Infinity,-1,'invalid',2.5])assert.equal(p.quote({tier:'plus',kind:'check',remaining}).allowed,false);assert.equal(p.quote({tier:'pro',kind:'check',remaining:20,parallel:2}).allowed,false);});
test('invalid kind or unreasonable duration is denied',()=>{assert.equal(p.quote({tier:'pro',kind:'shell',remaining:999}).allowed,false);assert.equal(p.quote({tier:'pro',kind:'check',remaining:10,minutes:999}).allowed,false);});
test('usage warnings display thresholds',()=>{assert.equal(p.warning(22,100),'high');assert.equal(p.warning(5,100),'critical');assert.equal(p.warning(0,100),'exhausted');});