import test from 'node:test';import assert from 'node:assert/strict';
import {aggregate,validAddress,verifyBindings,escapeHTML,pendingStage} from '../src/model.js';
import {assertExecutionSucceeded,terminalStatus,summarizeReceipt} from '../lib/receipt.js';
import {canonical,sha256,verifyDigest} from '../scripts/verify-evidence.mjs';
test('causal request never inherits support from descriptive dimensions',()=>{assert.equal(aggregate(['SUPPORTED','SUPPORTED'],'CAUSAL_EFFECT'),'UNKNOWN');assert.equal(aggregate(['CONTRADICTED','UNKNOWN'],'CAUSAL_EFFECT'),'CONTRADICTED');});
test('missing dimension remains unknown',()=>assert.equal(aggregate(['SUPPORTED','UNKNOWN']),'UNKNOWN'));
test('digest binds the complete ordered-independent record',()=>{const r={b:2,a:1};r.digest=sha256(canonical(r));verifyDigest(r);assert.throws(()=>verifyDigest({...r,a:2}));});
test('acknowledgement cannot point at another revision',()=>{const c={intent_digest:'i2',source:{digest:'s2'},assessment:{digest:'a2',intent_digest:'i2',source_digest:'s2'},acknowledgement:{intent_digest:'i1',source_digest:'s1',assessment_digest:'a1'}};assert.equal(verifyBindings(c),false);});
test('no assessment is no success',()=>{assert.equal(verifyBindings({intent_digest:'i'}),false);assert.equal(pendingStage({source:{}}),'Run assessment');});
test('addresses cannot accept arbitrary URLs',()=>{assert.equal(validAddress('https://evil.example'),false);assert.equal(validAddress('0x'+'1'.repeat(40)),true);});
test('all external text is escaped',()=>assert.equal(escapeHTML('<img src=x onerror="a">'),'&lt;img src=x onerror=&quot;a&quot;&gt;'));
const receipt={statusName:'ACCEPTED',result_name:'MAJORITY_AGREE',leader_only:false,consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS',result:{status:'return'}}]}};
test('accepted lifecycle still requires VM execution and actual validator agreement',()=>{assertExecutionSucceeded(receipt);assert.throws(()=>assertExecutionSucceeded({...receipt,leader_only:true}));assert.throws(()=>assertExecutionSucceeded({...receipt,result_name:'NO_MAJORITY'}));assert.throws(()=>assertExecutionSucceeded({...receipt,consensus_data:{leader_receipt:[{mode:'leader',execution_result:'ERROR',result:{status:'rollback'}}]}}));});
test('timeouts are terminal without implying success',()=>{assert.equal(terminalStatus({statusName:'VALIDATORS_TIMEOUT'}),true);assert.throws(()=>assertExecutionSucceeded({statusName:'VALIDATORS_TIMEOUT'}));});

test('receipt summaries keep accepted execution distinct from finalized lifecycle',()=>{const accepted=summarizeReceipt(receipt);assert.equal(accepted.execution,'SUCCESS');assert.equal(accepted.status,'ACCEPTED');assert.equal(accepted.finalized,false);assert.equal(accepted.finalityPending,true);const final=summarizeReceipt({...receipt,statusName:'FINALIZED'});assert.equal(final.finalized,true);assert.equal(final.finalityPending,false);});
