import { createClient, abi } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import deployment from '../public/deployment.json';
import { assertExecutionSucceeded, terminalStatus, consensusResult } from '../lib/receipt.js';

const readClient = createClient({ chain: studionet });
let walletClient;
let walletAddress = '';
let connectedProvider;
const announcedProviders = new Map();
if (typeof window !== 'undefined') {
  // Keep listening: extensions may announce after the application has loaded.
  window.addEventListener('eip6963:announceProvider', event => {
    const detail = event.detail;
    if (typeof detail?.provider?.request !== 'function' || typeof detail?.info?.uuid !== 'string' || typeof detail?.info?.rdns !== 'string') return;
    if (!announcedProviders.has(detail.info.uuid)) announcedProviders.set(detail.info.uuid, detail);
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}
let listener = () => {};
let busy = false;
const notify = (status, message, hash = '') => listener({status, message, hash});
const pendingKey = 'datasetcovenant.pending.v1';
const allowedActions = ['create_covenant','capture_sources','assess','acknowledge'];
const isHash = value => /^0x[0-9a-f]{64}$/i.test(value || '');
function savePending(pending) {
  const serialized=JSON.stringify(pending);
  localStorage.setItem(pendingKey,serialized);
  if(localStorage.getItem(pendingKey)!==serialized) throw Error('Could not persist the transaction recovery record. No further transaction will be sent.');
}
function validatePending(pending) {
  if(!pending||pending.address?.toLowerCase()!==deployment.address.toLowerCase()||(pending.chainId!==undefined&&pending.chainId!==deployment.chainId)) throw Error('The saved transaction belongs to a different contract or network. Inspect its record.');
  if(!/^0x[0-9a-f]{40}$/i.test(pending.actor||'')||!allowedActions.includes(pending.method)||!Array.isArray(pending.args)) throw Error('The saved transaction intent is invalid. Keep it for manual inspection.');
}
export function assertReceiptMatchesIntent(pending,receipt) {
  validatePending(pending);
  if(!isHash(pending.hash)||String(receipt?.hash).toLowerCase()!==pending.hash.toLowerCase()) throw Error('Transaction hash differs from the saved intent.');
  if(String(receipt.from_address??receipt.from).toLowerCase()!==pending.actor.toLowerCase()) throw Error('Transaction actor differs from the saved intent.');
  if(String(receipt.to_address??receipt.to).toLowerCase()!==pending.address.toLowerCase()) throw Error('Transaction contract differs from the saved intent.');
  const expected=abi.calldata.encode(abi.calldata.makeCalldataObject(pending.method,pending.args,undefined));
  const raw=receipt.data?.calldata?.raw;
  if(!Array.isArray(raw)||raw.length!==expected.length||raw.some((byte,i)=>byte!==expected[i])) throw Error('Transaction calldata differs from the exact saved method and arguments.');
  if(receipt.leader_only!==false) throw Error('Transaction does not establish the intended full validator run.');
  return receipt;
}
function definitiveFailure(receipt) {
  if (!terminalStatus(receipt)) return false;
  if (['MAJORITY_DISAGREE','NO_MAJORITY','DISAGREE','TIMEOUT','DETERMINISTIC_VIOLATION'].includes(consensusResult(receipt))) return true;
  const status=String(receipt.statusName || receipt.status_name || receipt.status).toUpperCase();
  if (!['ACCEPTED','FINALIZED','5','7'].includes(status)) return true;
  const list=receipt.consensus_data?.leader_receipt;
  const leader=(Array.isArray(list)?list:[list]).filter(x=>x?.mode==='leader').at(-1);
  return leader?.execution_result==='ERROR' || leader?.result?.status==='error';
}
export function onStatus(callback) { listener = callback || (() => {}); }
export const getWalletAddress = () => walletAddress;
export const loadDeployment = async () => getConfig();
export const txUrl = hash => /^0x[0-9a-f]{64}$/i.test(hash || '') ? `${deployment.explorer}/tx/${hash}` : '';
export const DEPLOYMENT = deployment;
export function getConfig() { return {...deployment, ready: deployment.deployed && /^0x[0-9a-fA-F]{40}$/.test(deployment.address)}; }
function requireDeployment() { if (!getConfig().ready) throw new Error('The project contract has not been deployed yet.'); }
function provider() {
  if (!connectedProvider) throw new Error('Connect MetaMask first.');
  return connectedProvider;
}
async function discoverMetaMask() {
  const announced = () => [...announcedProviders.values()].find(detail => detail.info.rdns === 'io.metamask')?.provider;
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  if (!announced()) await new Promise(resolve => setTimeout(resolve, 250));
  if (announced()) return announced();
  // Older MetaMask versions may expose only the legacy injected provider.
  const injected = window.ethereum;
  const candidates = [...(Array.isArray(injected?.providers) ? injected.providers : []), injected];
  const legacy = candidates.find(candidate => typeof candidate?.request === 'function' && candidate.isMetaMask && !candidate.isSubWallet && !candidate.isSubwallet && ![...announcedProviders.values()].some(detail => detail.provider === candidate && detail.info.rdns !== 'io.metamask'));
  if (!legacy) throw new Error('MetaMask was not found. Enable MetaMask for this site, then reconnect.');
  return legacy;
}
async function ensureNetwork(p) {
  let id = await p.request({method:'eth_chainId'});
  if (Number(id) !== deployment.chainId) {
    try { await p.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xf22f'}]}); }
    catch (e) {
      if (e.code !== 4902 && e?.data?.originalError?.code !== 4902) throw e;
      await p.request({method:'wallet_addEthereumChain',params:[{chainId:'0xf22f',chainName:'GenLayer Studio',nativeCurrency:{name:'GEN',symbol:'GEN',decimals:18},rpcUrls:[deployment.rpc],blockExplorerUrls:[deployment.explorer]}]});
    }
    id = await p.request({method:'eth_chainId'});
  }
  if (Number(id) !== deployment.chainId) throw new Error('Switch your wallet to GenLayer Studio (61999) before submitting.');
}
export async function connectWallet() {
  const p = await discoverMetaMask();
  const accounts = await p.request({method:'eth_requestAccounts'});
  if (!accounts[0]) throw new Error('No wallet account was selected.');
  await ensureNetwork(p);
  walletAddress = accounts[0];
  walletClient = createClient({chain:studionet,account:walletAddress,provider:p});
  connectedProvider = p;
  notify('connected',`Connected ${walletAddress}`);
  return walletAddress;
}
async function read(method,args=[]) {
  requireDeployment();
  const value = await readClient.readContract({address:deployment.address,functionName:method,args});
  return typeof value === 'string' ? JSON.parse(value) : value;
}
export const readContract = (method, args=[]) => read(method, args);

export async function waitForExecution(hash, {attempts=90, interval=4000, pending}={}) {
  for (let n=0;n<attempts;n++) {
    let receipt;
    try { receipt = await readClient.getTransaction({hash}); }
    catch (e) {
      if (n === attempts-1) throw new Error(`Could not retrieve transaction ${hash}. Use its explorer link before retrying.`);
      notify('pending','Waiting for the network to return the transaction…',hash);
      await new Promise(r=>setTimeout(r,interval)); continue;
    }
    notify('pending',`Consensus status: ${receipt.statusName || receipt.status}. Waiting for execution…`,hash);
    if (terminalStatus(receipt)) {
      if(pending) assertReceiptMatchesIntent(pending,receipt);
      return assertExecutionSucceeded(receipt);
    }
    await new Promise(r=>setTimeout(r,interval));
  }
  throw new Error(`The network is still processing ${hash}. Do not resubmit blindly; use “Resume pending transaction”.`);
}
async function verifyAction(method,args,actor=walletAddress) {
  const owner=method==='create_covenant'||method==='acknowledge'?actor:args[0];
  const id=method==='create_covenant'||method==='acknowledge'?args[0]:args[1];
  const value=await read('get_covenant',[owner,id]);
  if(value.id!==id||value.owner.toLowerCase()!==owner.toLowerCase())throw Error('Covenant read-back mismatch.');
  if(method==='create_covenant'&&(JSON.stringify(value.intent)!==JSON.stringify(JSON.parse(args[2])))){
    const expected=JSON.parse(args[2]);if(Object.keys(expected).some(k=>JSON.stringify(expected[k])!==JSON.stringify(value.intent[k])))throw Error('Frozen intent does not match the submitted intent.');
  }
  if(method==='create_covenant'&&(value.analyst?.toLowerCase()!==args[1].toLowerCase()||value.metadata_sha256!==args[3]||value.series_sha256!==args[4]||value.parent_id!==args[5]||value.parent_digest!==args[6])) throw Error('Frozen analyst, source or parent commitments differ from the submitted call.');
  if(method==='capture_sources'&&(!value.source?.digest||value.source.metadata_sha256!==value.metadata_sha256||value.source.series_sha256!==value.series_sha256))throw Error('Frozen source read-back mismatch.');
  if(method==='assess'&&(!value.assessment?.digest||value.assessment.intent_digest!==value.intent_digest||value.assessment.source_digest!==value.source?.digest))throw Error('Assessment read-back mismatch.');
  if(method==='acknowledge'&&value.acknowledgement?.assessment_digest!==args[1])throw Error('Acknowledgement read-back mismatch.');
  return value;
}
async function write(method,args) {
  requireDeployment();
  if (busy) throw new Error('Another transaction is still being processed.');
  if (localStorage.getItem(pendingKey)) throw new Error('A transaction is pending. Resume its status before creating another.');
  if (!walletClient) throw new Error('Connect your wallet first.');
  busy=true;
  let hash,pending;
  try {
    const p=provider();
    const accounts=await p.request({method:'eth_accounts'});
    if (accounts[0]?.toLowerCase()!==walletAddress.toLowerCase()) throw new Error('Your wallet account changed. Reconnect before submitting.');
    await ensureNetwork(p);
    // Persist the full intention before the wallet can sign or broadcast. A lost
    // response must never turn a second click into an automatic replacement call.
    pending={version:2,chainId:deployment.chainId,hash:null,method,args:JSON.parse(JSON.stringify(args)),actor:walletAddress,address:deployment.address,phase:'BROADCAST_INTENT',intendedAt:new Date().toISOString()};
    savePending(pending);
    notify('signing','Review the zero-value Studionet transaction in your wallet.');
    hash=await walletClient.writeContract({address:deployment.address,functionName:method,args:pending.args,value:0n,leaderOnly:false});
    if(!isHash(hash)) throw Error('The wallet returned no valid transaction hash. The broadcast outcome is unknown; inspect wallet activity before recovering.');
    pending={...pending,hash,phase:'PENDING',submittedAt:new Date().toISOString()};
    savePending(pending);
    notify('pending','Transaction submitted. Waiting for validator consensus…',hash);
    let receipt;
    try {receipt=await waitForExecution(hash,{pending});} catch(e) {
      // Keep uncertain transactions recoverable; clear only known terminal failures.
      try {const failed=assertReceiptMatchesIntent(pending,await readClient.getTransaction({hash}));if(definitiveFailure(failed)) localStorage.removeItem(pendingKey);} catch {}
      throw e;
    }
    const value=await verifyAction(pending.method,pending.args,pending.actor);
    localStorage.removeItem(pendingKey);
    notify('success','Execution succeeded and the resulting contract state was read back.',hash);
    return {hash,value};
  } catch(e) {
    // EIP-1193 4001 explicitly means the user rejected the signing request.
    // Transport/RPC errors and missing hashes remain uncertain and recoverable.
    if(pending&&!hash&&e.code===4001) localStorage.removeItem(pendingKey);
    const uncertain=pendingTransaction();
    const message=e.shortMessage||e.message||'Transaction failed.';
    notify(uncertain&&!uncertain.hash?'unknown':'error',uncertain&&!uncertain.hash?`${message} Broadcast outcome is unknown. Inspect wallet activity and attach its transaction hash; do not resend.`:message,hash);
    throw e;
  }
  finally {busy=false;}
}
export function pendingTransaction() {try {return JSON.parse(localStorage.getItem(pendingKey));} catch{return null;}}
export async function resumePendingTransaction(recoveredHash='') {
  const pending=pendingTransaction();
  if(!pending) throw new Error('There is no pending transaction.');
  validatePending(pending);
  if(pending.hash&&recoveredHash&&pending.hash.toLowerCase()!==recoveredHash.toLowerCase()) throw Error('A saved hash cannot be replaced by a different transaction.');
  if(!pending.hash&&!isHash(recoveredHash)) throw Error('The broadcast outcome is unknown. Inspect wallet activity or the actor history, then supply the exact transaction hash. No transaction will be resent.');
  if(busy) throw new Error('A transaction is already processing.');
  busy=true;
  try {
    if(!pending.hash) {
      const recovered={...pending,hash:recoveredHash};
      assertReceiptMatchesIntent(recovered,await readClient.getTransaction({hash:recoveredHash}));
      Object.assign(pending,recovered,{phase:'PENDING',recoveredAt:new Date().toISOString()});
      savePending(pending);
    }
    await waitForExecution(pending.hash,{pending});
    await verifyAction(pending.method,pending.args,pending.actor);
    localStorage.removeItem(pendingKey);
    notify('success','Pending transaction completed; contract state verified.',pending.hash);
    return pending;
  } catch(e) {
    try {if(pending.hash){const failed=assertReceiptMatchesIntent(pending,await readClient.getTransaction({hash:pending.hash}));if(definitiveFailure(failed)) localStorage.removeItem(pendingKey);}}catch{}
    notify('error',e.message,pending.hash); throw e;
  } finally{busy=false;}
}
export async function sendWrite(method,args,onProgress) {
  if(!allowedActions.includes(method)) throw new Error('Unknown DatasetCovenant action.');
  onStatus(onProgress);
  return write(method,args);
}
export const getPending = pendingTransaction;
export async function resumePending(onProgress,recoveredHash='') { onStatus(onProgress); return resumePendingTransaction(recoveredHash); }
export async function loadDemo() {
  const response=await fetch(`${import.meta.env.BASE_URL}evidence/demo.json`);
  if(!response.ok) throw new Error('Recorded evidence is not available yet. Switch to Live to inspect the contract.');
  let data;
  try {data=await response.json();} catch {throw new Error('Recorded evidence is unavailable: invalid archive response.');}
  if(!data?.recordedAt||!data?.contractAddress||!data?.transactions?.length||!data?.covenants?.length) throw new Error('The demonstration has not been recorded yet.');
  return data;
}

