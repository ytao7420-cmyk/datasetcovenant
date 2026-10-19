// No transaction is sent without --deploy or --run. Separate private actors stay in ignored .local/.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ROOT,LOCAL,CHAIN_ID,RPC,EXPLORER,reader,readJson,readJsonContract,saveJson,acquireLock,testActor,Journal} from './runtime.mjs';
import {canonical,sha256,verifyCovenant,verifyArchive} from './verify-evidence.mjs';
import {summarizeReceipt} from '../lib/receipt.js';
const args=process.argv.slice(2),has=n=>args.includes(n),opt=n=>{const inline=args.find(a=>a.startsWith(n+'='));if(inline)return inline.slice(n.length+1);const i=args.indexOf(n);return i<0?undefined:args[i+1];};
const source=await readFile(new URL('contracts/datasetcovenant.py',ROOT),'utf8'),sourceSha256=sha256(source);
const presets=await readJson(new URL('public/presets.json',ROOT));
if(has('--plan')||!has('--deploy')&&!has('--run')){
 console.log(JSON.stringify({planOnly:true,sourceSha256,chainId:CHAIN_ID,value:'0',leaderOnly:false,successfulWorkflowWrites:12,optionalNegativeWrites:1,deployCommand:`node scripts/live-test.mjs --deploy --source-sha=${sourceSha256}`,runCommand:'node scripts/live-test.mjs --run',negativeCommand:'node scripts/live-test.mjs --run --negative',scenarios:presets.map(p=>({id:p.id,expected:p.expect,parent:p.parent??null})),notice:'All actors are controlled test accounts. Live evidence will be recorded only after actual successful transactions.'},null,2));process.exit(0);
}
if(has('--deploy'))assert.equal(opt('--source-sha'),sourceSha256,'Reviewed exact source digest required before deployment.');
const unlock=await acquireLock();try{
 let config=await readJson(new URL('public/deployment.json',ROOT));
 if(has('--deploy')){
  const deployer=await testActor('deployer');const journal=await Journal.load(new URL(`deployment-${sourceSha256}.json`,LOCAL),{sourceSha256,chainId:CHAIN_ID,deployer:deployer.account.address});
  const receipt=await journal.transact('deploy',{kind:'deploy',actor:deployer.account.address,sourceSha256,args:[],value:'0',leaderOnly:false},()=>deployer.deployContract({code:source,args:[],leaderOnly:false}));
  const address=receipt.data?.contract_address??receipt.txDataDecoded?.contractAddress??receipt.to_address;assert.match(address??'',/^0x[\da-f]{40}$/i);assert.equal(sha256(await reader.getContractCode(address)),sourceSha256);
  config={deployed:true,network:'GenLayer Studionet',chainId:CHAIN_ID,rpc:RPC,explorer:EXPLORER,address,sourceSha256,deploymentTransaction:journal.state.transactions[0].hash,deploymentReceipt:summarizeReceipt(receipt),verifiedAt:new Date().toISOString()};
  await saveJson(new URL('public/deployment.json',ROOT),config);console.log(JSON.stringify(config));
 }
 if(has('--run')){
  assert.ok(config.deployed);assert.equal(config.sourceSha256,sourceSha256);assert.equal(config.chainId,CHAIN_ID);assert.equal(config.rpc,RPC);assert.equal(sha256(await reader.getContractCode(config.address)),sourceSha256);
  const official=await readJson(new URL('public/evidence/source-manifest.json',ROOT));
  for(const kind of ['metadata','series'])assert.equal(sha256(await readFile(new URL(`public/evidence/worldbank-${kind}.json`,ROOT),'utf8')),official[`${kind}Sha256`]);
  const researcher=await testActor('researcher'),analyst=await testActor('analyst');assert.notEqual(researcher.account.address.toLowerCase(),analyst.account.address.toLowerCase());
  const identity={chainId:CHAIN_ID,address:config.address,sourceSha256,presetDigest:sha256(canonical(presets)),metadataSha256:official.metadataSha256,seriesSha256:official.seriesSha256,researcher:researcher.account.address,analyst:analyst.account.address};
  const journal=await Journal.load(new URL(`workflow-${config.address.toLowerCase()}.json`,LOCAL),identity);
  const read=id=>readJsonContract(config.address,'get_covenant',[researcher.account.address,id]);
  const send=(label,actor,method,callArgs)=>journal.transact(label,{kind:'call',actor:actor.account.address,address:config.address,method,args:callArgs,value:'0',leaderOnly:false},()=>actor.writeContract({address:config.address,functionName:method,args:callArgs,value:0n,leaderOnly:false}),{recoverLabel:opt('--recover-label'),recoverHash:opt('--recover-hash')});
  const covenants=[];let negativeTransactions=[];
  for(const preset of presets){
   const parent=preset.parent?covenants.find(c=>c.id===preset.parent):null;
   await send(preset.id+'-create',researcher,'create_covenant',[preset.id,analyst.account.address,JSON.stringify(preset.intent),official.metadataSha256,official.seriesSha256,parent?.id??'',parent?.intent_digest??'']);
   await send(preset.id+'-capture',analyst,'capture_sources',[researcher.account.address,preset.id]);
   await send(preset.id+'-assess',analyst,'assess',[researcher.account.address,preset.id]);
   let covenant=await read(preset.id);verifyCovenant(covenant,preset);console.log(JSON.stringify({id:preset.id,actual:covenant.assessment.verdict,expected:preset.expect,expectationMatched:covenant.assessment.verdict===preset.expect}));
   if(parent&&has('--negative')){
    const negative=await Journal.load(new URL(`negative-${config.address.toLowerCase()}.json`,LOCAL),{...identity,purpose:'old assessment cannot acknowledge new revision'});
    const callArgs=[preset.id,parent.assessment.digest];
    await negative.transactExpectedRollback('old-digest-rejected',{kind:'call',actor:researcher.account.address,address:config.address,method:'acknowledge',args:callArgs,value:'0',leaderOnly:false},()=>researcher.writeContract({address:config.address,functionName:'acknowledge',args:callArgs,value:0n,leaderOnly:false}),'Acknowledgement must bind the exact frozen assessment digest');
    negativeTransactions=negative.state.transactions;
    covenant=await read(preset.id);if(!journal.state.transactions.some(tx=>tx.label===preset.id+'-acknowledge'))assert.equal(covenant.acknowledgement,null);
   }
   await send(preset.id+'-acknowledge',researcher,'acknowledge',[preset.id,covenant.assessment.digest]);
   covenant=await read(preset.id);verifyCovenant(covenant,preset);assert.ok(covenant.acknowledgement);covenants.push(covenant);
  }
  await journal.refresh();
  const archive={recordedAt:new Date().toISOString(),chainId:CHAIN_ID,network:'GenLayer Studionet',contractAddress:config.address,contractSourceSha256:sourceSha256,actors:{researcher:researcher.account.address,analyst:analyst.account.address},notice:'Synthetic intended uses and project-controlled actors. Public official metadata; no scientific suitability, observation accuracy or causal certification.',transactions:journal.state.transactions,negativeTransactions,covenants};
  verifyArchive(archive,presets);await saveJson(new URL('public/evidence/demo.json',ROOT),archive);console.log(JSON.stringify({complete:true,writes:archive.transactions.length,negativeWrites:negativeTransactions.length}));
 }
}finally{await unlock();}
