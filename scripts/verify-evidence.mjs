import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function verifyDigest(record,field='digest') {const copy={...record};delete copy[field];assert.equal(sha256(canonical(copy)),record[field],`Invalid ${field}`);}
export function verifyCovenant(c,expected){
 const commitment=Object.fromEntries(['id','owner','analyst','profile','intent','metadata_sha256','series_sha256','parent_id','parent_digest','intent_digest'].map(k=>[k,c[k]]));
 verifyDigest(commitment,'intent_digest');assert.notEqual(c.owner,c.analyst);if(expected)assert.deepEqual(c.intent,expected.intent);
 const s=c.source;assert.ok(s);verifyDigest(s);assert.equal(sha256(s.metadata_raw),c.metadata_sha256);assert.equal(sha256(s.series_raw),c.series_sha256);
 const metadata=JSON.parse(s.metadata_raw)[1][0];assert.equal(metadata.id,'SL.UEM.TOTL.ZS');assert.equal(metadata.source.id,'2');
 assert.equal(s.lines[2],'Indicator name: '+metadata.name);assert.equal(s.lines[3],'Official definition: '+metadata.sourceNote);assert.equal(s.lines[4],'Source organization: '+metadata.sourceOrganization);
 const series=JSON.parse(s.series_raw);assert.equal(series[0].pages,1);assert.equal(series[1].length,4);
 const years=new Set();for(const r of series[1]){assert.equal(r.countryiso3code,'USA');assert.equal(r.country.id,'US');assert.equal(r.indicator.id,'SL.UEM.TOTL.ZS');assert.ok(['2020','2021','2022','2023'].includes(r.date));assert.ok(!years.has(r.date));years.add(r.date);}
 const records=series[1].map(r=>({year:Number(r.date),available:r.value!==null})).sort((a,b)=>a.year-b.year);assert.deepEqual(s.records,records);
 assert.equal(s.lines[8],'Non-null available years: '+records.filter(r=>r.available).map(r=>r.year).join(','));
 assert.equal(s.lines[9],'Null missing years: '+records.filter(r=>!r.available).map(r=>r.year).join(','));
 const a=c.assessment;assert.ok(a);verifyDigest(a);assert.equal(a.intent_digest,c.intent_digest);assert.equal(a.source_digest,s.digest);
 for(const d of Object.values(a.dimensions)){assert.ok(['SUPPORTED','CONTRADICTED','UNKNOWN'].includes(d.status));for(const citation of d.citations)assert.equal(citation.quote,s.lines[citation.line-1]);}
 assert.deepEqual(Object.keys(a.dimensions).sort(),['exclusions','geography','measurement','period','population']);
 assert.equal(a.dimensions.geography.status,c.intent.geography==='USA'?'SUPPORTED':'CONTRADICTED');
 const available=new Set(records.filter(r=>r.available).map(r=>r.year));const complete=Array.from({length:c.intent.period.to-c.intent.period.from+1},(_,i)=>i+c.intent.period.from).every(y=>available.has(y));
 assert.equal(a.dimensions.period.status,complete?'SUPPORTED':'UNKNOWN');
 const statuses=Object.values(a.dimensions).map(d=>d.status);let verdict=statuses.includes('CONTRADICTED')?'CONTRADICTED':statuses.includes('UNKNOWN')?'UNKNOWN':'SUPPORTED';if(c.intent.use==='CAUSAL_EFFECT'&&verdict!=='CONTRADICTED')verdict='UNKNOWN';assert.equal(a.verdict,verdict);
 if(c.acknowledgement){const ack=c.acknowledgement;verifyDigest(ack);assert.equal(ack.researcher,c.owner);assert.equal(ack.analyst,c.analyst);assert.equal(ack.intent_digest,c.intent_digest);assert.equal(ack.source_digest,s.digest);assert.equal(ack.assessment_digest,a.digest);assert.equal(ack.verdict,a.verdict);}
 return {id:c.id,verdict:a.verdict,acknowledged:!!c.acknowledgement};
}
export function verifyArchive(archive,presets){
 assert.equal(archive.chainId,61999);assert.match(archive.contractAddress,/^0x[\da-f]{40}$/i);assert.ok(archive.recordedAt);assert.ok(archive.transactions.length>=12);
 for(const tx of archive.transactions){assert.equal(tx.execution,'SUCCESS');assert.equal(tx.consensusResult,'MAJORITY_AGREE');assert.equal(tx.leaderOnly,false);assert.match(tx.hash,/^0x[\da-f]{64}$/i);}
 assert.equal(archive.covenants.length,presets.length);const results=archive.covenants.map((c,i)=>verifyCovenant(c,presets[i]));
 for(const c of archive.covenants){assert.ok(c.acknowledgement);if(c.parent_id){const parent=archive.covenants.find(p=>p.id===c.parent_id);assert.ok(parent);assert.equal(c.parent_digest,parent.intent_digest);assert.notEqual(c.assessment.digest,parent.assessment.digest);}}
 for(const tx of archive.negativeTransactions??[]){
  assert.equal(tx.execution,'ERROR');assert.equal(tx.consensusResult,'MAJORITY_AGREE');assert.equal(tx.leaderOnly,false);
  assert.equal(tx.expectedRollbackVerified,true);assert.equal(tx.outcome,'EXPECTED_REJECTION');
  assert.equal(tx.decodedRollback,'Acknowledgement must bind the exact frozen assessment digest');
  const revision=archive.covenants.find(c=>c.id===tx.spec.args[0]);assert.ok(revision?.parent_id);
  const parent=archive.covenants.find(c=>c.id===revision.parent_id);assert.equal(tx.spec.args[1],parent.assessment.digest);
  assert.notEqual(tx.spec.args[1],revision.assessment.digest);
 }
 return results;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const root=new URL('../',import.meta.url);const archive=JSON.parse(await readFile(new URL('public/evidence/demo.json',root),'utf8'));const presets=JSON.parse(await readFile(new URL('public/presets.json',root),'utf8'));
 console.log(JSON.stringify({verified:true,results:verifyArchive(archive,presets)},null,2));
}
