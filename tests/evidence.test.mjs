import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonical,sha256,verifyCovenantIntegrity,createEvidenceEnvelope,parseEvidenceEnvelope,compareCovenantState} from '../lib/evidence.js';

const archive=JSON.parse(await readFile(new URL('../public/evidence/demo.json',import.meta.url),'utf8'));
const copy=value=>structuredClone(value);
const fixture=()=>copy(archive.covenants[0]);
const rehash=async(record,field='digest')=>{const contents={...record};delete contents[field];record[field]=await sha256(canonical(contents));};
const rehashAssessment=async c=>{await rehash(c.assessment);if(c.acknowledgement){c.acknowledgement.assessment_digest=c.assessment.digest;await rehash(c.acknowledgement);}};

test('browser SHA-256 uses exact UTF-8 text and matches the standard vector',async()=>{
 assert.equal(await sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 const text='研究者 😀\n\t"quoted"';assert.equal(await sha256(text),createHash('sha256').update(text).digest('hex'));
 assert.notEqual(await sha256(text),await sha256(text+' '));
});
test('canonical JSON recursively sorts keys and preserves arrays and Unicode',()=>{
 assert.equal(canonical({z:[{b:2,a:'研究😀\n'}],a:{to:2023,from:2020}}),'{"a":{"from":2020,"to":2023},"z":[{"a":"研究😀\\n","b":2}]}');
 assert.equal(canonical({'😀':1,'\ue000':2}),'{"":2,"😀":1}');
 assert.notEqual(canonical([1,2]),canonical([2,1]));
});
test('canonical JSON rejects values that cannot be faithful contract JSON',()=>{
 for(const invalid of [undefined,NaN,Infinity,{x:undefined},[,1],new Date(),{x:'\ud800'}])assert.throws(()=>canonical(invalid));
 const cycle={};cycle.self=cycle;assert.throws(()=>canonical(cycle));
});
test('every recorded covenant passes all four content digests and references',async()=>{
 for(const c of archive.covenants){const result=await verifyCovenantIntegrity(c);assert.equal(result.ok,true,JSON.stringify(result.checks));assert.equal(result.scope.hasAssessment,true);assert.equal(result.scope.authenticity,'not-established');}
});
test('partial stages verify without claiming an assessment exists',async()=>{
 const c=fixture();c.source=null;c.assessment=null;c.acknowledgement=null;
 const committed=await verifyCovenantIntegrity(c);assert.equal(committed.ok,true);assert.equal(committed.scope.hasAssessment,false);assert.equal(committed.scope.stage,'intent');
 c.source=fixture().source;const captured=await verifyCovenantIntegrity(c);assert.equal(captured.ok,true);assert.equal(captured.scope.stage,'source');
 c.assessment=fixture().assessment;const assessed=await verifyCovenantIntegrity(c);assert.equal(assessed.ok,true);assert.equal(assessed.scope.stage,'assessment');
});
test('object insertion order never changes a valid commitment digest',async()=>{
 const reversed=value=>Array.isArray(value)?value.map(reversed):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reversed(v)])):value;
 assert.equal((await verifyCovenantIntegrity(reversed(fixture()))).ok,true);
});
for(const [name,mutate] of [
 ['intent narrative',c=>c.intent.population+=' changed'],
 ['source raw bytes',c=>c.source.metadata_raw+=' '],
 ['source copied lines',c=>c.source.lines[3]+=' invented'],
 ['source availability',c=>c.source.records[0].available=false],
 ['assessment explanation',c=>c.assessment.dimensions.population.reason='A modified but plausible explanation.'],
 ['assessment status',c=>c.assessment.dimensions.population.status='UNKNOWN'],
 ['assessment quotation',c=>c.assessment.dimensions.population.citations[0].quote+=' invented'],
 ['acknowledgement actor',c=>c.acknowledgement.researcher=c.analyst],
 ['acknowledgement verdict',c=>c.acknowledgement.verdict='CONTRADICTED']
])test('unchanged digest rejects tampered '+name,async()=>{const c=fixture();mutate(c);assert.equal((await verifyCovenantIntegrity(c)).ok,false);});
test('rehashing cannot disguise raw-source commitment reference mismatches',async()=>{
 const c=fixture();c.source.metadata_sha256='f'.repeat(64);await rehash(c.source);c.assessment.source_digest=c.source.digest;await rehashAssessment(c);c.acknowledgement.source_digest=c.source.digest;await rehash(c.acknowledgement);
 assert.equal((await verifyCovenantIntegrity(c)).ok,false);
});
test('rehashing cannot disguise acknowledgement identity or verdict mismatches',async()=>{
 for(const field of ['researcher','analyst','verdict','intent_digest','source_digest','assessment_digest']){const c=fixture();c.acknowledgement[field]=field==='verdict'?'UNKNOWN':field.includes('digest')?'f'.repeat(64):'0x'+'a'.repeat(40);await rehash(c.acknowledgement);assert.equal((await verifyCovenantIntegrity(c)).ok,false,field);}
});
test('rehashing cannot disguise citation or deterministic verdict mismatches',async()=>{
 for(const mutate of [c=>c.assessment.dimensions.population.citations[0].quote='fabricated quote',c=>c.assessment.dimensions.population.citations[0].line=999,c=>c.assessment.verdict='CONTRADICTED',c=>c.assessment.dimensions.period.status='UNKNOWN',c=>c.assessment.use='CAUSAL_EFFECT']){
  const c=fixture();mutate(c);await rehashAssessment(c);assert.equal((await verifyCovenantIntegrity(c)).ok,false);
 }
});
test('partial records reject impossible stage order and malformed input',async()=>{
 const c=fixture();c.source=null;assert.equal((await verifyCovenantIntegrity(c)).ok,false);
 for(const input of [null,[],{},'not a record']){const result=await verifyCovenantIntegrity(input);assert.equal(result.ok,false);assert.ok(result.checks.some(item=>!item.ok&&item.error));}
});
test('integrity result never claims independent verification of leader prose',async()=>{
 const c=fixture();c.assessment.dimensions.population.reason='This source allegedly establishes universal causal validity.';await rehashAssessment(c);
 const result=await verifyCovenantIntegrity(c);assert.equal(result.ok,true);assert.equal(result.scope.semanticExplanations,'leader-authored-not-independently-verified');
});
test('evidence envelope preserves complete supplied provenance without inventing time or chain',()=>{
 const c=fixture(),provenance={chainId:61999,address:archive.contractAddress,contractSourceSha256:archive.contractSourceSha256,observedAt:archive.recordedAt,transactions:archive.transactions,custom:{origin:'user-provided',nested:[1,2]}};
 const envelope=createEvidenceEnvelope(c,provenance);assert.deepEqual(envelope.provenance,provenance);assert.deepEqual(parseEvidenceEnvelope(JSON.stringify(envelope)),envelope);
 envelope.covenant.id='changed';assert.notEqual(c.id,'changed');assert.deepEqual(createEvidenceEnvelope(c).provenance,{});
 const parsed=parseEvidenceEnvelope(c);assert.deepEqual(parsed.covenant,c);assert.deepEqual(parsed.provenance,{});assert.equal(parsed.legacy,true);
});
test('envelope parsing preserves extra provenance and rejects malformed envelopes',()=>{
 const envelope={...createEvidenceEnvelope(fixture(),{custom:'retained'}),importNotes:{from:'local file'}};assert.deepEqual(parseEvidenceEnvelope(envelope),envelope);
 for(const input of ['invalid JSON',null,[],{format:'datasetcovenant-evidence',version:99,covenant:fixture(),provenance:{}},{format:'datasetcovenant-evidence',version:1,covenant:null,provenance:{}},{format:'datasetcovenant-evidence',version:1,covenant:fixture()}])assert.throws(()=>parseEvidenceEnvelope(input));
});
test('state comparison requires valid equal complete records and reports differing paths',async()=>{
 const c=fixture();const same=await compareCovenantState(c,copy(c));assert.equal(same.match,true);assert.deepEqual(same.differences,[]);
 const changed=copy(c);changed.assessment.dimensions.population.reason+=' changed';const different=await compareCovenantState(c,changed);assert.equal(different.match,false);assert.ok(different.differences.includes('assessment.dimensions.population.reason'));assert.equal(different.freshIntegrity.ok,false);
 const advanced=fixture();advanced.acknowledgement=null;const stageChange=await compareCovenantState(advanced,c);assert.equal(stageChange.match,false);assert.equal(stageChange.recordedIntegrity.ok,true);assert.ok(stageChange.differences.includes('acknowledgement'));
});
