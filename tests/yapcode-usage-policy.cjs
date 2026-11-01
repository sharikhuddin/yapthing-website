'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),p=require('../chat/yapcode-usage-policy.js');
test('unknown plan fails closed to free',()=>assert.equal(p.plan('enterprise'),'free'));
test('free tier never gets autonomous cloud execution',()=>assert.equal(p.quote({tier:'free',kind:'cloud_code',remaining:100}).allowed,false));
test('task reservation never exceeds remaining credits',()=>{assert.equal(p.quote({tier:'plus',kind:'github_pr',remaining:2}).allowed,false);assert.equal(p.quote({tier:'plus',kind:'github_pr',remaining:3}).after,0);});
test('monthly cloud and concurrency ceilings prevent overuse',()=>{assert.equal(p.quote({tier:'plus',kind:'cloud_code',remaining:30,cloudUsed:5}).allowed,false);assert.equal(p.quote({tier:'pro',kind:'check',remaining:20,parallel:2}).allowed,false);});
test('invalid task and unreasonable duration fail closed',()=>{assert.equal(p.quote({tier:'pro',kind:'shell',remaining:999}).allowed,false);assert.equal(p.quote({tier:'pro',kind:'check',remaining:10,minutes:999}).allowed,false);});
test('usage warnings display threshold',()=>{assert.equal(p.warning(22,100),'high');assert.equal(p.warning(5,100),'critical');assert.equal(p.warning(0,100),'exhausted');});
