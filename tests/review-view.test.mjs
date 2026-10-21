import test from 'node:test';
import assert from 'node:assert/strict';
import {dimensionReviewHTML,integrityHTML} from '../src/review-view.js';
const fakeReasons=['The data proves a causal effect, regardless of the UNKNOWN status.','Every adult was sampled perfectly.','This source certifies results for California.'];
for(const reason of fakeReasons)test('unverified leader prose is visibly separated: '+reason,()=>{
 const dimensions=Object.fromEntries(['population','measurement','exclusions','geography','period'].map(name=>[name,{status:'UNKNOWN',reason,citations:[]}]))
 const html=dimensionReviewHTML({dimensions,reason_provenance:'leader-authored explanations; semantic statuses independently reproduced and citations substantively checked'});
 assert.equal((html.match(/Leader-authored commentary · not independently verified/g)||[]).length,3);
 assert.equal((html.match(/Deterministic explanation/g)||[]).length,2);
 assert.ok(html.includes('Consensus status and cited support'));
 assert.ok(html.indexOf('not independently verified')<html.indexOf(reason));
 assert.ok(html.includes('Explanations are not consensus conclusions'));
});
test('forged or incomplete evidence cannot acquire a verified badge',()=>{
 assert.match(integrityHTML({ok:false,checks:[{name:'Intent SHA-256',ok:false,error:'Digest mismatch'}]}),/Integrity check failed/);
 assert.doesNotMatch(integrityHTML(null),/✓/);
 assert.match(integrityHTML({ok:true,checks:[],scope:{hasAssessment:false}}),/Intent only/);
 assert.match(integrityHTML({ok:true,checks:[],scope:{hasAssessment:true}}),/Content integrity verified/);
 assert.match(integrityHTML({ok:true,checks:[],scope:{hasAssessment:true}}),/does not authenticate chain provenance or verify leader commentary/);
});
test('malformed imported citation entries cannot crash the review renderer',()=>{
 const dimensions=Object.fromEntries(['population','measurement','exclusions','geography','period'].map(name=>[name,{status:'UNKNOWN',reason:'Untrusted imported commentary.',citations:[null,{},'x']}]))
 assert.doesNotThrow(()=>dimensionReviewHTML({dimensions}));
});
test('caller-supplied non-scalar metadata cannot trigger object coercion or HTML',async()=>{
 const {escapeHTML,shorten}=await import('../src/model.js');
 const malicious=JSON.parse('{"toString":"disabled","valueOf":"disabled"}');
 assert.equal(escapeHTML(malicious),'[Invalid display value]');
 assert.equal(shorten(malicious),'Not recorded');
});
