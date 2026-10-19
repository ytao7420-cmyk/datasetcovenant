import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {abi} from 'genlayer-js';

// Import the actual browser module with fake transport/storage. No browser,
// wallet extension, RPC request or chain transaction is used in these tests.
const url=new URL('../src/chain.js',import.meta.url);
const config=JSON.parse(await readFile(new URL('../public/deployment.json',import.meta.url)));
const original=await readFile(url,'utf8');
const actor='0x'+'1'.repeat(40),analyst='0x'+'2'.repeat(40),hash='0x'+'3'.repeat(64),otherHash='0x'+'4'.repeat(64);
const key='datasetcovenant.pending.v1';
const method='acknowledge',args=['case-one','assessment-one'];
const state={id:'case-one',owner:actor,acknowledgement:{assessment_digest:'assessment-one'}};
function receipt(spec={}){const p={hash,method,args,actor,address:config.address,...spec};return {hash:p.hash,from_address:p.actor,to_address:p.address,data:{calldata:{raw:[...abi.calldata.encode(abi.calldata.makeCalldataObject(p.method,p.args,undefined))]}},statusName:'FINALIZED',result_name:'MAJORITY_AGREE',leader_only:false,consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS',result:{status:'return'}}]}};}
let serial=0;
async function harness({storage,write,getTransaction,readContract,failSet}={}){
 const values=storage??new Map(),events=[],calls={writes:0,reads:0,receipts:0};
 globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(failSet?.(k,v))throw Error('Storage unavailable');values.set(k,v);},removeItem:k=>values.delete(k)};
 const provider={isMetaMask:true,request:async({method})=>method==='eth_chainId'?'0xf22f':[actor]};
 const handlers=new Map();globalThis.window={ethereum:provider,addEventListener:(name,fn)=>handlers.set(name,fn),dispatchEvent:()=>handlers.get('eip6963:announceProvider')?.({detail:{info:{uuid:'metamask',rdns:'io.metamask'},provider}})};
 const reader={getTransaction:async q=>{calls.receipts++;return getTransaction?getTransaction(q):receipt();},readContract:async q=>{calls.reads++;return readContract?readContract(q):structuredClone(state);}};
 const writer={writeContract:async q=>{calls.writes++;return write?write(q,{values,calls}):hash;}};
 globalThis.__datasetClient=options=>options.account?writer:reader;
 let source=original.replace("import { createClient, abi } from 'genlayer-js';","import { abi } from 'genlayer-js';\nconst createClient=globalThis.__datasetClient;");
 source=source.replace("import deployment from '../public/deployment.json';",'const deployment='+JSON.stringify(config)+';');
 source=source.replace(/from '([^']+)'/g,(match,path)=>`from '${path.startsWith('.')?new URL(path,url).href:import.meta.resolve(path)}'`);
 const module=await import('data:text/javascript;base64,'+Buffer.from(source+'\n// test '+serial++).toString('base64'));
 await module.connectWallet();module.onStatus(s=>events.push(s));
 return {module,values,events,calls,send:()=>module.sendWrite(method,args,s=>events.push(s))};
}
function pending(extra={}){return {version:2,chainId:config.chainId,hash:null,method,args,actor,address:config.address,phase:'BROADCAST_INTENT',...extra};}

test('persists exact intent before broadcast; lost response survives reload and blocks a second write',async()=>{
 const h=await harness({write:async(request,{values})=>{const p=JSON.parse(values.get(key));assert.equal(p.phase,'BROADCAST_INTENT');assert.equal(p.hash,null);assert.equal(p.actor,actor);assert.deepEqual(p.args,request.args);throw Error('RPC response lost after broadcast');}});
 await assert.rejects(h.send(),/response lost/);assert.equal(h.calls.writes,1);assert.equal(h.module.getPending().hash,null);assert.equal(h.events.at(-1).status,'unknown');
 await assert.rejects(h.send(),/pending/);assert.equal(h.calls.writes,1);
 const reloaded=await harness({storage:h.values});await assert.rejects(reloaded.module.resumePendingTransaction(),/outcome is unknown/);assert.equal(reloaded.calls.writes,0);assert.ok(reloaded.values.has(key));
});
test('storage failure before broadcast prevents signing or sending',async()=>{const h=await harness({failSet:()=>true});await assert.rejects(h.send(),/Storage unavailable/);assert.equal(h.calls.writes,0);});
test('a lost hash-save retains the pre-broadcast record and exposes the returned hash',async()=>{const h=await harness({failSet:(_k,v)=>Boolean(JSON.parse(v).hash)});await assert.rejects(h.send(),/Storage unavailable/);assert.equal(h.calls.writes,1);assert.equal(h.module.getPending().hash,null);assert.equal(h.events.at(-1).hash,hash);});
test('an invalid wallet hash remains unknown instead of clearing or sending again',async()=>{const h=await harness({write:async()=>undefined});await assert.rejects(h.send(),/no valid transaction hash/);assert.equal(h.module.getPending().hash,null);await assert.rejects(h.send(),/pending/);assert.equal(h.calls.writes,1);});
test('explicit EIP-1193 signing rejection clears only the rejected intention',async()=>{const h=await harness({write:async()=>{const e=Error('User rejected');e.code=4001;throw e;}});await assert.rejects(h.send(),/User rejected/);assert.equal(h.module.getPending(),null);});
test('supplied hash recovers after reload without any new write',async()=>{const h=await harness({storage:new Map([[key,JSON.stringify(pending())]])});const result=await h.module.resumePendingTransaction(hash);assert.equal(result.hash,hash);assert.equal(h.calls.writes,0);assert.equal(h.module.getPending(),null);assert.equal(h.calls.reads,1);});
test('wrong actor, contract, method or argument cannot attach a supplied hash',async()=>{
 for(const spec of [{actor:analyst},{address:analyst},{method:'assess'},{args:['another-case','assessment-one']}]){
  const h=await harness({storage:new Map([[key,JSON.stringify(pending())]]),getTransaction:async()=>receipt(spec)});
  await assert.rejects(h.module.resumePendingTransaction(hash),/differs/);assert.equal(h.module.getPending().hash,null);assert.equal(h.calls.reads,0);assert.equal(h.calls.writes,0);
 }
});
test('an RPC response with the wrong hash, absent calldata or leader-only execution cannot attach',async()=>{
 for(const change of [r=>{r.hash=otherHash;},r=>{delete r.data.calldata;},r=>{r.leader_only=true;}]){const r=receipt();change(r);const h=await harness({storage:new Map([[key,JSON.stringify(pending())]]),getTransaction:async()=>r});await assert.rejects(h.module.resumePendingTransaction(hash));assert.equal(h.module.getPending().hash,null);}
});
test('known pending hash cannot be replaced and normal resume performs no broadcast',async()=>{const h=await harness({storage:new Map([[key,JSON.stringify(pending({hash}))]])});await assert.rejects(h.module.resumePendingTransaction(otherHash),/cannot be replaced/);await h.module.resumePendingTransaction();assert.equal(h.calls.writes,0);assert.equal(h.module.getPending(),null);});
test('successful wallet response and receipt must match the saved call before clearing',async()=>{const h=await harness({getTransaction:async()=>receipt({actor:analyst})});await assert.rejects(h.send(),/actor differs/);assert.equal(h.module.getPending().hash,hash);assert.equal(h.calls.reads,0);});
test('a mismatched failed receipt cannot erase a saved pending intention',async()=>{const r=receipt({actor:analyst});r.consensus_data.leader_receipt[0].execution_result='ERROR';const h=await harness({storage:new Map([[key,JSON.stringify(pending({hash}))]]),getTransaction:async()=>r});await assert.rejects(h.module.resumePendingTransaction(),/actor differs/);assert.equal(h.module.getPending().hash,hash);});
test('verified execution with a missing acknowledgement stays recoverable',async()=>{const h=await harness({readContract:async()=>({...state,acknowledgement:null})});await assert.rejects(h.send(),/Acknowledgement/);assert.equal(h.module.getPending().hash,hash);});
test('matching successful write verifies state and clears the saved hash',async()=>{const h=await harness();const result=await h.send();assert.equal(result.hash,hash);assert.equal(h.module.getPending(),null);assert.equal(h.calls.writes,1);assert.equal(h.calls.reads,1);});
test('older hash journal resumes with receipt binding; wrong network never reads',async()=>{const legacy={hash,method,args,actor,address:config.address};const h=await harness({storage:new Map([[key,JSON.stringify(legacy)]])});await h.module.resumePendingTransaction();assert.equal(h.calls.writes,0);const bad=await harness({storage:new Map([[key,JSON.stringify(pending({hash,chainId:1}))]])});await assert.rejects(bad.module.resumePendingTransaction(),/network/);assert.equal(bad.calls.receipts,0);});
test('read-back must retain the exact analyst, source hashes and parent commitments',async()=>{const intent={population:'Labor force'};const createArgs=['case-one',analyst,JSON.stringify(intent),'a'.repeat(64),'b'.repeat(64),'parent','c'.repeat(64)];const spec={method:'create_covenant',args:createArgs};const record={id:'case-one',owner:actor,intent,analyst,metadata_sha256:createArgs[3],series_sha256:createArgs[4],parent_id:'parent',parent_digest:'different'};const h=await harness({getTransaction:async()=>receipt(spec),readContract:async()=>record});await assert.rejects(h.module.sendWrite(spec.method,spec.args),/parent commitments/);assert.equal(h.module.getPending().hash,hash);});
