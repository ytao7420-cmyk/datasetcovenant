// Offline verification only: no RPC client, private actor harness, wallet, or writes.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {abi} from 'genlayer-js';
import {canonical,sha256,verifyCovenantIntegrity,parseEvidenceEnvelope,compareCovenantState} from '../lib/evidence.js';
import {assertExecutionSucceeded,assertExpectedRollback,lifecycleStatus} from '../lib/receipt.js';

const IDS=['base-create','base-capture','base-assess','base-acknowledge','revision-create','revision-capture','revision-assess','revision-stale-acknowledge','revision-acknowledge'];
const BASE='browser-20261021-trend-bb81',REVISION='browser-20261021-causal-bb81';
const OWNER='0xcd1dabf73cc80edee8ba664c34a5d636b6e407f9',ANALYST='0xac1aeda44dece819cb462b6819b3b900164be409';
const ROLLBACK='Acknowledgement must bind the exact frozen assessment digest';
const HASH=/^0x[0-9a-f]{64}$/i;
const equal=(a,b)=>assert.equal(canonical(a),canonical(b));
const validTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const bodyWithoutDigest=value=>{const copy={...value};delete copy.digest;return copy;};
const leader=receipt=>{
 const receipts=receipt?.consensus_data?.leader_receipt;
 return (Array.isArray(receipts)?receipts:receipts?[receipts]:[]).filter(item=>item?.mode==='leader').at(-1);
};
function verifyRawStateRead(observation,covenant,address){
 assert.equal(observation.request.method,'gen_call');assert.ok(validTime(observation.observedAt));
 const params=observation.request.params[0];assert.equal(params.type,'read');assert.equal(params.to.toLowerCase(),address.toLowerCase());assert.equal(params.from,'0x'+'0'.repeat(40));
 assert.equal(observation.response.error,undefined);const result=observation.response.result;
 const encoded=typeof result==='string'?result:result.data;
 equal(JSON.parse(abi.calldata.decode(Uint8Array.from(Buffer.from(encoded,'hex')))),covenant);
}

export async function verifyBrowserEvidence(manifest,{allowPending=false,evidenceDirectory=new URL('../public/evidence/',import.meta.url)}={}){
 const checks=[],pending=[];
 const check=async(name,operation)=>{try{await operation();checks.push({name,ok:true});}catch(error){checks.push({name,ok:false,error:error?.message??String(error)});}};
 const wait=(item,reason)=>pending.push({item,reason});
 await check('manifest.schema',()=>{
  assert.equal(manifest.format,'datasetcovenant-browser-workflow-evidence');assert.equal(manifest.version,1);
  assert.equal(manifest.chainId,61999);assert.equal(manifest.address.toLowerCase(),'0x9080e0c21432c8b3e66061bb9495645ca1c214b5');
  assert.equal(manifest.rpc,'https://studio.genlayer.com/api');assert.equal(manifest.roles.researcher,OWNER);assert.equal(manifest.roles.analyst,ANALYST);
  assert.equal(manifest.contractSourceSha256,'9f10d3c10d6416fd20a1889ca3c8087b7720aaa5a61684ab0c282aecc9089dd2');
  assert.equal(manifest.scenarios.base.id,BASE);assert.equal(manifest.scenarios.revision.id,REVISION);assert.equal(manifest.expectedTransactionCount,9);
  equal(manifest.transactions.map(tx=>tx.id),IDS);assert.ok(validTime(manifest.recordedAt));
 });
 await check('manifest.digest',async()=>assert.equal(await sha256(canonical(bodyWithoutDigest(manifest))),manifest.digest));
 const states={};
 for(const name of ['base','revision']){
  const snapshot=manifest.states?.[name];
  if(!snapshot?.covenant){wait('state.'+name,'No complete covenant snapshot supplied yet');continue;}
  states[name]=snapshot.covenant;
  await check('state.'+name+'.digest',async()=>assert.equal(await sha256(canonical(snapshot.covenant)),snapshot.sha256));
  await check('state.'+name+'.integrity',async()=>{const verified=await verifyCovenantIntegrity(snapshot.covenant);assert.equal(verified.ok,true,JSON.stringify(verified.checks.filter(item=>!item.ok)));});
  await check('state.'+name+'.identity',()=>{assert.equal(snapshot.covenant.id,name==='base'?BASE:REVISION);assert.equal(snapshot.covenant.owner,OWNER);assert.equal(snapshot.covenant.analyst,ANALYST);assert.ok(validTime(snapshot.observedAt));});
  await check('state.'+name+'.rawRpcCorrespondence',()=>verifyRawStateRead(snapshot.rawRpcRead,snapshot.covenant,manifest.address));
  if(!snapshot.covenant.assessment||!snapshot.covenant.acknowledgement)wait('state.'+name,'Assessment or exact-digest acknowledgement not recorded yet');
 }
 if(states.base)await check('state.base.useAndVerdict',()=>{assert.equal(states.base.intent.use,'DESCRIPTIVE_ONLY');assert.equal(states.base.assessment.verdict,'SUPPORTED');});
 if(states.revision)await check('state.revision.parentAndCausalBoundary',()=>{
  assert.equal(states.revision.parent_id,BASE);assert.equal(states.revision.parent_digest,states.base.intent_digest);assert.equal(states.revision.intent.use,'CAUSAL_EFFECT');
  if(states.revision.assessment){assert.equal(states.revision.assessment.verdict,'UNKNOWN');assert.equal(states.revision.assessment.causal_design,'NOT_ESTABLISHED');assert.notEqual(states.revision.assessment.digest,states.base.assessment.digest);}
 });
 let verifiedTransactions=0;
 for(const tx of manifest.transactions??[]){
  if(!tx.receipt||!tx.rawReceipt){wait(tx.id,'No supplied public RPC receipt yet');continue;}
  const scenario=tx.id.startsWith('base-')?'base':'revision',c=states[scenario];
  if(!c){wait(tx.id,'Cannot bind transaction without its covenant snapshot');continue;}
  const receipt=tx.receipt,raw=tx.rawReceipt;
  await check(tx.id+'.receiptDigests',async()=>{
   assert.equal(await sha256(canonical(receipt)),tx.receiptSha256);assert.equal(await sha256(canonical(raw)),tx.rawReceiptSha256);assert.ok(validTime(tx.rpcObservedAt));
  });
  await check(tx.id+'.identityAndRawCorrespondence',()=>{
   assert.match(tx.hash,HASH);assert.equal(String(receipt.hash).toLowerCase(),tx.hash.toLowerCase());assert.equal(String(raw.hash).toLowerCase(),tx.hash.toLowerCase());
   const actor=/create|acknowledge/.test(tx.id)?OWNER:ANALYST;
   for(const item of [receipt,raw]){assert.equal(String(item.from_address??item.from).toLowerCase(),actor);assert.equal(String(item.to_address??item.to).toLowerCase(),manifest.address.toLowerCase());assert.equal(item.leader_only,false);}
   assert.equal(BigInt(raw.value),0n);assert.equal(raw.status,lifecycleStatus(receipt));assert.equal(raw.result,receipt.result);
   assert.ok(Array.isArray(receipt.data?.calldata?.raw));assert.equal(typeof raw.data?.calldata,'string');assert.deepEqual([...Buffer.from(raw.data.calldata,'base64')],receipt.data.calldata.raw);
   const rawLeader=leader(raw),decodedLeader=leader(receipt);assert.ok(rawLeader&&decodedLeader);assert.equal(rawLeader.execution_result,decodedLeader.execution_result);assert.equal(rawLeader.result,decodedLeader.result.raw);
  });
  await check(tx.id+'.completeAbi',()=>{
   const bytes=Uint8Array.from(receipt.data.calldata.raw),decoded=abi.calldata.decode(bytes),method=decoded.get('method'),args=decoded.get('args');
   assert.equal(decoded.has('kwargs'),false);assert.deepEqual([...abi.calldata.encode(decoded)],[...bytes]);
   const suffix=tx.id.slice(scenario.length+1);
   if(suffix==='create'){
    assert.equal(method,'create_covenant');assert.equal(args.length,7);assert.equal(args[0],c.id);assert.equal(args[1].toLowerCase(),ANALYST);equal(JSON.parse(args[2]),c.intent);
    equal(args.slice(3),[c.metadata_sha256,c.series_sha256,c.parent_id,c.parent_digest]);
   }else{
    const methods={capture:'capture_sources',assess:'assess',acknowledge:'acknowledge','stale-acknowledge':'acknowledge'};assert.equal(method,methods[suffix]);
    const expected=suffix==='stale-acknowledge'?[REVISION,states.base.assessment.digest]:suffix==='acknowledge'?[c.id,c.assessment.digest]:[OWNER,c.id];
    assert.deepEqual(args,expected);assert.deepEqual([...abi.calldata.encode(abi.calldata.makeCalldataObject(method,expected,undefined))],[...bytes]);
   }
  });
  if(lifecycleStatus(receipt)!=='FINALIZED')wait(tx.id,'Observed lifecycle '+lifecycleStatus(receipt)+' is not FINALIZED');
  else{
   await check(tx.id+'.finalizedOutcome',()=>{
    assert.equal(raw.status,'FINALIZED');
    if(tx.id==='revision-stale-acknowledge'){
     assertExpectedRollback(receipt,ROLLBACK);const bytes=Buffer.from(leader(raw).result,'base64');assert.equal(bytes[0],1);assert.equal(bytes.subarray(1).toString('utf8'),ROLLBACK);
    }else assertExecutionSucceeded(receipt);
   });
   if(checks.at(-1).ok)verifiedTransactions++;
  }
  if(!tx.browserObservation?.finalizedReadback)wait(tx.id,'Finalized browser readback is not recorded yet');
  else await check(tx.id+'.browserEvidence',()=>{
   assert.equal(tx.browserObservation.source,'production Chrome observation');assert.equal(tx.browserObservation.transactionHash,tx.hash);assert.ok(Array.isArray(tx.browserObservation.screenshotIds)&&tx.browserObservation.screenshotIds.length>0);
   for(const id of tx.browserObservation.screenshotIds)assert.ok(manifest.screenshots.some(shot=>shot.id===id),'Missing browser screenshot '+id);
  });
 }
 const negative=manifest.negativeTest;
 if(!negative?.stateAfterRejection)wait('negativeTest','No separately observed acknowledgement-null state after rejection');
 else await check('negativeTest.exactRollbackAndAckNull',async()=>{
  const c=negative.stateAfterRejection;
  assert.equal(c.id,REVISION);assert.equal(c.owner,OWNER);assert.equal(c.acknowledgement,null);assert.ok(c.assessment);assert.equal(c.assessment.verdict,'UNKNOWN');assert.notEqual(c.assessment.digest,states.base.assessment.digest);
  assert.equal(negative.attemptedAssessmentDigest,states.base.assessment.digest);assert.equal(negative.expectedRollback,ROLLBACK);
  assert.equal((await verifyCovenantIntegrity(c)).ok,true);assert.equal(await sha256(canonical(c)),negative.stateSha256);assert.ok(validTime(negative.rpcObservedAt));
  verifyRawStateRead(negative.rawRpcStateRead,c,manifest.address);assert.equal(negative.rpcObservedAt,negative.rawRpcStateRead.observedAt);
  const stale=manifest.transactions.find(tx=>tx.id==='revision-stale-acknowledge'),correct=manifest.transactions.find(tx=>tx.id==='revision-acknowledge');
  assert.equal(negative.transactionHash,stale.hash);assert.ok(Date.parse(negative.rpcObservedAt)>=Date.parse(stale.rpcObservedAt));
  if(correct?.rawReceipt?.created_at)assert.ok(Date.parse(negative.rpcObservedAt)<Date.parse(correct.rawReceipt.created_at),'Ack-null observation must precede the later correct acknowledgement creation');
 });
 for(const download of manifest.downloads??[]){
  await check('download.'+download.scenario+'.exactBytesAndState',async()=>{
   assert.equal(Buffer.byteLength(download.jsonText,'utf8'),download.sizeBytes);assert.equal(await sha256(download.jsonText),download.sha256);
   const envelope=parseEvidenceEnvelope(download.jsonText),snapshot=states[download.scenario];assert.ok(snapshot);assert.equal((await compareCovenantState(snapshot,envelope.covenant)).match,true);
   assert.equal(envelope.provenance.chainId,manifest.chainId);assert.equal(envelope.provenance.address.toLowerCase(),manifest.address.toLowerCase());assert.equal(envelope.provenance.contractSourceSha256,manifest.contractSourceSha256);
  });
 }
 for(const scenario of ['base','revision'])if(!(manifest.downloads??[]).some(item=>item.scenario===scenario))wait('download.'+scenario,'Final actual browser download not supplied yet');
 if(manifest.integrityDemo){
  await check('integrityDemo.singleByteTamper',async()=>{
   const {original,corrupted}=manifest.integrityDemo;for(const file of [original,corrupted]){assert.equal(await sha256(file.jsonText),file.sha256);assert.equal(Buffer.byteLength(file.jsonText),file.sizeBytes);}
   const a=Buffer.from(original.jsonText),b=Buffer.from(corrupted.jsonText);assert.equal(a.length,b.length);assert.equal([...a].filter((byte,i)=>byte!==b[i]).length,1);
   const good=parseEvidenceEnvelope(original.jsonText),bad=parseEvidenceEnvelope(corrupted.jsonText);assert.equal((await verifyCovenantIntegrity(good.covenant)).ok,true);
   const verification=await verifyCovenantIntegrity(bad.covenant);assert.equal(verification.ok,false);equal(verification.checks.filter(item=>!item.ok).map(item=>item.name),['source.digest','source.metadataRawSha256','source.extraction']);
   delete good.covenant.source.metadata_raw;delete bad.covenant.source.metadata_raw;equal(good,bad);
   for(const id of ['corrupted-evidence-rejected','original-envelope-import-verified'])assert.ok(manifest.screenshots.some(shot=>shot.id===id));
  });
 }else wait('integrityDemo','No browser import integrity evidence supplied');
 const directory=evidenceDirectory instanceof URL?fileURLToPath(evidenceDirectory):resolve(evidenceDirectory);
 for(const shot of manifest.screenshots??[]){
  await check('screenshot.'+shot.id,async()=>{
   assert.equal(shot.kind,'pure-page-tab-screenshot');assert.ok(/^browser-screenshots\/[a-z0-9-]+\.(?:png|jpg)$/.test(shot.path));assert.ok(!/wallet|warning|metamask/i.test(shot.path),'Native wallet/Chrome screenshots must not be published');
   const path=resolve(directory,shot.path);assert.ok(path.startsWith(resolve(directory)+sep));const bytes=await readFile(path);
   assert.equal(bytes.length,shot.sizeBytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),shot.sha256);
   if(shot.mediaType==='image/png'){assert.ok(shot.path.endsWith('.png'));assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);}
   else {assert.equal(shot.mediaType,'image/jpeg');assert.ok(shot.path.endsWith('.jpg'));assert.deepEqual([...bytes.subarray(0,3)],[255,216,255]);assert.deepEqual([...bytes.subarray(-2)],[255,217]);}
   assert.ok(validTime(shot.captureFileTime));assert.equal(shot.timeMeaning,'Screenshot file modification time only; not a blockchain timestamp.');
  });
 }
 const complete=pending.length===0&&verifiedTransactions===9&&checks.every(item=>item.ok);
 await check('manifest.completionClaim',()=>assert.equal(manifest.status==='complete',complete));
 if(!allowPending&&pending.length)checks.push({name:'completion.required',ok:false,error:'Pending evidence: '+pending.map(item=>item.item).join(', ')});
 return {ok:checks.every(item=>item.ok),complete,verifiedTransactions,pending,checks,scope:'Offline integrity and internal correspondence checks of recorded public evidence. No fresh RPC query or independent provenance authentication.'};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),allowPending=args.includes('--allow-pending');
 assert.ok(args.every(value=>value==='--allow-pending'),'Supported option: --allow-pending');
 const path=new URL('../public/evidence/browser-workflow-2026-10-21.json',import.meta.url),manifest=JSON.parse(await readFile(path,'utf8'));
 const result=await verifyBrowserEvidence(manifest,{allowPending,evidenceDirectory:dirname(fileURLToPath(path))});
 console.log(JSON.stringify({...result,checks:result.checks.filter(item=>!item.ok),checksPassed:result.checks.filter(item=>item.ok).length},null,2));
 if(!result.ok)process.exitCode=1;
}
