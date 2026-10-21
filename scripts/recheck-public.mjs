// Public, account-free RPC reads only. This does not import the private actor
// harness, access .local/, sign messages, deploy, or submit transactions.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient,abi} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {canonical,sha256,compareCovenantState} from '../lib/evidence.js';
import {assertExecutionSucceeded,assertExpectedRollback,summarizeReceipt,lifecycleStatus} from '../lib/receipt.js';
import {retryAfterMs} from '../lib/read-scheduler.js';

const root=new URL('../',import.meta.url);
const config=JSON.parse(await readFile(new URL('public/deployment.json',root),'utf8'));
const archive=JSON.parse(await readFile(new URL('public/evidence/demo.json',root),'utf8'));
const output=new URL('public/evidence/recheck-2026-10-21.json',root);
const limits={requestTimeoutMs:12000,maxReadAttempts:2,minIntervalMs:2200,totalBudgetMs:180000};
const allowedMethods=new Set(['eth_chainId','gen_getContractCode','gen_call','eth_getTransactionByHash']);
const plannedTransactions=[...archive.transactions.map(tx=>({...tx,expectedOutcome:'SUCCESS'})),...(archive.negativeTransactions??[]).map(tx=>({...tx,expectedOutcome:'EXPECTED_ROLLBACK'}))];
assert.equal(config.chainId,studionet.id);
assert.equal(config.rpc,studionet.rpcUrls.default.http[0]);
assert.equal(archive.chainId,config.chainId);
assert.equal(archive.contractAddress.toLowerCase(),config.address.toLowerCase());
assert.equal(archive.transactions.length,12,'Expected the original twelve workflow calls.');
assert.equal(archive.negativeTransactions?.length,1,'Expected the separately archived stale-digest negative call.');

if(process.argv.includes('--plan')){
 console.log(JSON.stringify({readOnly:true,privateActorHarnessImported:false,reads:{chainIdentity:1,contractCode:1,covenants:archive.covenants.length,workflowReceipts:archive.transactions.length,negativeReceipts:archive.negativeTransactions.length,deploymentReceipt:1},allowedRpcMethods:[...allowedMethods],limits,output:output.pathname,notice:'CLI public RPC observations only; not a browser wallet demonstration.'},null,2));
 process.exit(0);
}
assert.equal(process.argv.length,2,'Supported option: --plan. The default run performs only the declared public reads.');

const startedAt=new Date().toISOString(),deadline=Date.now()+limits.totalBudgetMs;
const report={format:'datasetcovenant-public-rpc-recheck',version:1,startedAt,observedAt:null,
 provenance:{observation:'CLI public read-only RPC recheck',rpc:config.rpc,network:config.network,chainId:config.chainId,address:config.address,archiveRecordedAt:archive.recordedAt,archiveSha256:await sha256(canonical(archive)),sdk:'genlayer-js 1.1.8',scriptSha256:await sha256(await readFile(new URL(import.meta.url),'utf8'))},
 limits,readOnly:true,privateActorHarnessImported:false,transactionsSubmitted:0,
 boundary:'Public CLI reads and local integrity/correspondence checks only. These are RPC observations, not production browser wallet E2E, hosted CI evidence, independent scientific verification, or proof of human independence. Historical rejection receipts do not prove a currently absent acknowledgement after a later valid acknowledgement.',
 chain:null,contractCode:null,covenants:[],transactions:[],deploymentReceipt:null,rpcRequests:[],summary:null};
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input?.url;
 assert.equal(url,config.rpc,'Only the configured public RPC endpoint may be queried.');
 assert.equal(options.method,'POST');
 const request=JSON.parse(options.body);
 assert.ok(allowedMethods.has(request.method),'Disallowed RPC method: '+request.method);
 assert.ok(Date.now()<deadline,'Public read time budget exhausted.');
 const entry={method:request.method,startedAt:new Date().toISOString()},began=Date.now();report.rpcRequests.push(entry);
 try{
  const response=await nativeFetch(input,{...options,signal:AbortSignal.timeout(Math.min(limits.requestTimeoutMs,Math.max(1,deadline-Date.now())))});
  entry.httpStatus=response.status;
  // Keep the timeout active while reading the response body, not only headers.
  const body=await response.text();entry.elapsedMs=Date.now()-began;
  if(!response.ok){const error=new Error('Public RPC HTTP '+response.status);error.status=response.status;error.retry_after_seconds=Number(response.headers.get('retry-after'));throw error;}
  return new Response(body,{status:response.status,headers:response.headers});
 }catch(error){entry.elapsedMs=Date.now()-began;entry.error=error.message??String(error);throw error;}
};
const reader=createClient({chain:studionet});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let nextStart=0;
function errorMessage(error){return String(error?.shortMessage??error?.details??error?.message??error).slice(0,1200);}
function jsonSafe(value){return JSON.parse(JSON.stringify(value,(_key,item)=>typeof item==='bigint'?item.toString():item instanceof Uint8Array?[...item]:item));}
async function read(label,operation){
 const attempts=[];
 for(let attempt=1;attempt<=limits.maxReadAttempts;attempt++){
  const pause=Math.max(0,nextStart-Date.now());
  if(Date.now()+pause>=deadline)return {status:'unavailable',observedAt:new Date().toISOString(),attempts,error:'Public read time budget exhausted before '+label};
  if(pause)await delay(pause);
  nextStart=Date.now()+limits.minIntervalMs;
  try{
   const value=await operation();attempts.push({attempt,ok:true,observedAt:new Date().toISOString()});
   return {status:'read',observedAt:new Date().toISOString(),attempts,value};
  }catch(error){
   attempts.push({attempt,ok:false,observedAt:new Date().toISOString(),error:errorMessage(error)});
   const limited=retryAfterMs(error),retryWait=limited===null?limits.minIntervalMs:limited+500;
   if(attempt===limits.maxReadAttempts||retryWait>60000||Date.now()+retryWait>=deadline)return {status:'unavailable',observedAt:new Date().toISOString(),attempts,error:errorMessage(error)};
   nextStart=Math.max(nextStart,Date.now()+retryWait);
  }
 }
}
function check(name,operation){try{operation();return {name,ok:true};}catch(error){return {name,ok:false,error:errorMessage(error)};}}
function result(readResult,checks,details={}){
 const {value,...observation}=readResult;
 return {...observation,status:readResult.status==='unavailable'?'unavailable':checks.every(item=>item.ok)?'passed':'failed',checks,...details};
}
function correspondence(receipt,expected){
 const spec=expected.spec;
 return [
  check('transaction.hash',()=>assert.equal(String(receipt.hash).toLowerCase(),expected.hash.toLowerCase())),
  check('transaction.actor',()=>assert.equal(String(receipt.from_address??receipt.from).toLowerCase(),spec.actor.toLowerCase())),
  check('transaction.contract',()=>assert.equal(String(receipt.to_address??receipt.to).toLowerCase(),spec.address.toLowerCase())),
  check('transaction.completeCalldata',()=>{
   const bytes=abi.calldata.encode(abi.calldata.makeCalldataObject(spec.method,spec.args,undefined));
   assert.ok(Array.isArray(receipt.data?.calldata?.raw),'Missing raw ABI calldata');
   assert.deepEqual(receipt.data.calldata.raw,[...bytes]);
  }),
  check('transaction.fullValidatorRun',()=>assert.equal(receipt.leader_only,false)),
  check('transaction.expectedExecution',()=>expected.expectedOutcome==='SUCCESS'?assertExecutionSucceeded(receipt):assertExpectedRollback(receipt,spec.expectedRollback)),
  check('transaction.finalized',()=>assert.equal(lifecycleStatus(receipt),'FINALIZED'))
 ];
}

try{
 const chainRead=await read('chain identity',()=>reader.request({method:'eth_chainId'}));
 report.chain=result(chainRead,chainRead.status==='unavailable'?[]:[check('chain.id',()=>assert.equal(Number(chainRead.value),config.chainId))],{returnedChainId:chainRead.value??null});
 const codeRead=await read('deployed contract source',()=>reader.getContractCode(config.address));
 const localSourceSha256=await sha256(await readFile(new URL('contracts/datasetcovenant.py',root),'utf8'));
 const observedSha256=codeRead.status==='unavailable'?null:await sha256(codeRead.value);
 report.contractCode=result(codeRead,codeRead.status==='unavailable'?[]:[check('contractCode.deploymentDigest',()=>assert.equal(observedSha256,config.sourceSha256)),check('contractCode.archiveDigest',()=>assert.equal(observedSha256,archive.contractSourceSha256)),check('contractCode.localSourceDigest',()=>assert.equal(observedSha256,localSourceSha256))],{observedSha256,expectedSha256:config.sourceSha256,localSourceSha256});
 console.log(JSON.stringify({stage:'contractCode',status:report.contractCode.status,observedSha256}));
 for(const recorded of archive.covenants){
  const stateRead=await read('covenant '+recorded.id,()=>reader.readContract({address:config.address,functionName:'get_covenant',args:[recorded.owner,recorded.id]}));
  let checks=[],fresh=null,comparison=null;
  if(stateRead.status!=='unavailable'){
   try{
    fresh=typeof stateRead.value==='string'?JSON.parse(stateRead.value):stateRead.value;
    comparison=await compareCovenantState(recorded,fresh);
    checks=[check('covenant.completeFreshStateMatchesArchive',()=>assert.equal(comparison.match,true)),...comparison.freshIntegrity.checks];
   }catch(error){checks.push({name:'covenant.decodeAndCompare',ok:false,error:errorMessage(error)});}
  }
  const observation=result(stateRead,checks,{owner:recorded.owner,id:recorded.id,comparison:comparison?{match:comparison.match,differences:comparison.differences,scope:comparison.scope}:null,covenant:fresh});
  report.covenants.push(observation);console.log(JSON.stringify({stage:'covenant',id:recorded.id,status:observation.status}));
 }
 for(const transaction of plannedTransactions){
  const receiptRead=await read('receipt '+transaction.label,()=>reader.getTransaction({hash:transaction.hash}));
  const receipt=receiptRead.status==='unavailable'?null:receiptRead.value;
  const checks=receipt?correspondence(receipt,transaction):[];
  if(receipt&&transaction.expectedOutcome==='EXPECTED_ROLLBACK'){
   const revision=archive.covenants.find(c=>c.id===transaction.spec.args[0]),parent=archive.covenants.find(c=>c.id===revision?.parent_id);
   checks.push(check('negative.usesParentAssessmentDigest',()=>assert.equal(transaction.spec.args[1],parent?.assessment?.digest)),check('negative.differsFromRevisionAssessmentDigest',()=>assert.notEqual(transaction.spec.args[1],revision?.assessment?.digest)));
  }
  const observation=result(receiptRead,checks,{label:transaction.label,hash:transaction.hash,expectedOutcome:transaction.expectedOutcome,archivedSpec:transaction.spec,summary:receipt?summarizeReceipt(receipt):null,receipt:receipt?jsonSafe(receipt):null});
  report.transactions.push(observation);console.log(JSON.stringify({stage:'receipt',label:transaction.label,status:observation.status,lifecycle:observation.summary?.status??null}));
 }
 const deploymentRead=await read('deployment receipt',()=>reader.getTransaction({hash:config.deploymentTransaction}));
 const deploymentReceipt=deploymentRead.status==='unavailable'?null:deploymentRead.value;
 const deploymentChecks=deploymentReceipt?[
  check('deployment.hash',()=>assert.equal(String(deploymentReceipt.hash).toLowerCase(),config.deploymentTransaction.toLowerCase())),
  check('deployment.address',()=>assert.equal(String(deploymentReceipt.data?.contract_address??deploymentReceipt.txDataDecoded?.contractAddress??deploymentReceipt.to_address).toLowerCase(),config.address.toLowerCase())),
  check('deployment.execution',()=>assertExecutionSucceeded(deploymentReceipt)),
  check('deployment.finalized',()=>assert.equal(lifecycleStatus(deploymentReceipt),'FINALIZED'))
 ]:[];
 report.deploymentReceipt=result(deploymentRead,deploymentChecks,{hash:config.deploymentTransaction,summary:deploymentReceipt?summarizeReceipt(deploymentReceipt):null,receipt:deploymentReceipt?jsonSafe(deploymentReceipt):null});
}catch(error){report.runError=errorMessage(error);}
finally{
 globalThis.fetch=nativeFetch;
 report.observedAt=new Date().toISOString();
 const observations=[report.chain,report.contractCode,...report.covenants,...report.transactions,report.deploymentReceipt].filter(Boolean);
 report.summary={passed:observations.filter(item=>item.status==='passed').length,failed:observations.filter(item=>item.status==='failed').length,unavailable:observations.filter(item=>item.status==='unavailable').length,expectedObservations:19,observedItems:observations.length,workflowReceiptsPassed:report.transactions.filter(item=>item.expectedOutcome==='SUCCESS'&&item.status==='passed').length,negativeReceiptsPassed:report.transactions.filter(item=>item.expectedOutcome==='EXPECTED_ROLLBACK'&&item.status==='passed').length,covenantsPassed:report.covenants.filter(item=>item.status==='passed').length};
 report.summary.complete=observations.length===19&&report.summary.failed===0&&report.summary.unavailable===0&&!report.runError;
 await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output:output.pathname,summary:report.summary,notice:report.boundary},null,2));
 if(!report.summary.complete)process.exitCode=1;
}
