'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),p=require('../chat/yap-work-reset.js');
test('reset countdown is nonnegative and shows time remaining',()=>{assert.equal(p.countdown('2026-11-04T00:00:00Z',Date.parse('2026-11-02T00:00:00Z')).label,'2d 0h');assert.equal(p.countdown('2026-11-01T00:00:00Z',Date.parse('2026-11-02T00:00:00Z')).seconds,0)});
test('zero balance pauses new Work',()=>{const s=p.state({limit:40,remaining:0,reset_at:'2026-11-30T00:00:00Z'});assert.equal(s.canRequestWork,false);assert.equal(s.status,'paused')});
test('invalid balance fails closed',()=>{assert.equal(p.state({limit:100,remaining:999}).status,'unavailable');assert.equal(p.state({limit:40,remaining:-1}).status,'unavailable')});
test('positive balance permits requesting a server-side quote',()=>assert.equal(p.state({limit:40,remaining:12}).canRequestWork,true));
