'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const policy=require('../chat/yap-media-policy.js');

test('letter screenshot edits use cheap document pathway',()=>{
  assert.equal(policy.route({filename:'letter.png',prompt:'Change the name and date in this invitation letter'}),'document');
});
test('genuine visual edits are not misrouted',()=>{
  assert.equal(policy.route({filename:'photo.jpg',prompt:'Remove the background'}),'image-edit');
});
test('ambiguous images request user intent rather than spend',()=>{
  assert.equal(policy.route({filename:'photo.webp',prompt:'help me with this'}),'needs-intent');
});
test('unauthenticated or unknown tier defaults to free',()=>{
  assert.equal(policy.limits('unknown').imageEditsPerMonth,0);
});
test('server must enforce quota; helper boundary values are deterministic',()=>{
  assert.equal(policy.validate({tier:'free',kind:'image-edit'}).reason,'quota_exceeded');
  assert.equal(policy.validate({tier:'plus',kind:'image-edit',used:3}).allowed,true);
  assert.equal(policy.validate({tier:'plus',kind:'image-edit',used:4}).reason,'quota_exceeded');
  assert.equal(policy.validate({tier:'pro',bytes:17*1024*1024}).reason,'upload_limit');
  assert.equal(policy.validate({tier:'plus',used:-1}).reason,'invalid_usage');
});
