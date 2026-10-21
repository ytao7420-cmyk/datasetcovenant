// Browser-safe verification of the bytes committed by DatasetCovenant.
// Matching hashes establish content integrity, not source authenticity, consensus,
// transaction finality, or the truth of leader-authored explanatory prose.
const PROFILE='worldbank-unemployment-usa-2020-2023-v1';
const INDICATOR='SL.UEM.TOTL.ZS';
const META_URL='https://api.worldbank.org/v2/indicator/SL.UEM.TOTL.ZS?format=json';
const SERIES_URL='https://api.worldbank.org/v2/country/USA/indicator/SL.UEM.TOTL.ZS?format=json&date=2020:2023&per_page=100';
const DIMENSIONS=['population','geography','period','measurement','exclusions'];
const SEMANTIC=['population','measurement','exclusions'];
const STATUSES=['SUPPORTED','CONTRADICTED','UNKNOWN'];
const COMMITMENT=['id','owner','analyst','profile','intent','metadata_sha256','series_sha256','parent_id','parent_digest'];
const SHA=/^[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const ID=/^[a-zA-Z0-9_-]{1,64}$/;
const FORMAT='datasetcovenant-evidence';
const ensure=(condition,message)=>{if(!condition)throw new Error(message);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const keys=(value,expected)=>object(value)&&Object.keys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));
const equal=(left,right)=>canonical(left)===canonical(right);
const length=value=>Array.from(value).length;

function validUnicode(text){
 for(let i=0;i<text.length;i++){
  const unit=text.charCodeAt(i);
  if(unit>=0xd800&&unit<=0xdbff){const next=text.charCodeAt(++i);ensure(next>=0xdc00&&next<=0xdfff,'Unpaired Unicode surrogate');}
  else ensure(unit<0xdc00||unit>0xdfff,'Unpaired Unicode surrogate');
 }
}
function compareKeys(left,right){
 const a=Array.from(left),b=Array.from(right);
 for(let i=0;i<Math.min(a.length,b.length);i++){const difference=a[i].codePointAt(0)-b[i].codePointAt(0);if(difference)return difference;}
 return a.length-b.length;
}

// Contract records contain only bounded integers, strings, booleans, arrays and
// objects. Sort by Unicode code point to match Python sort_keys, including keys
// outside the BMP; retain Unicode text rather than escaping it to ASCII.
export function canonical(value){
 const ancestors=new Set();
 function visit(current){
  if(current===null||typeof current==='boolean')return JSON.stringify(current);
  if(typeof current==='string'){validUnicode(current);return JSON.stringify(current);}
  if(typeof current==='number'){ensure(Number.isFinite(current),'Non-finite JSON number');return JSON.stringify(current);}
  ensure(object(current)||Array.isArray(current),'Expected a plain JSON value');
  ensure(!ancestors.has(current),'Cyclic JSON value');ancestors.add(current);
  let encoded;
  if(Array.isArray(current)){
   ensure(Object.keys(current).length===current.length&&Array.from({length:current.length},(_,i)=>Object.hasOwn(current,i)).every(Boolean),'Sparse or extended JSON array');
   encoded='['+current.map(visit).join(',')+']';
  }else{
   encoded='{'+Object.keys(current).sort(compareKeys).map(key=>{validUnicode(key);return JSON.stringify(key)+':'+visit(current[key]);}).join(',')+'}';
  }
  ancestors.delete(current);return encoded;
 }
 return visit(value);
}

export async function sha256(text){
 ensure(typeof text==='string','SHA-256 input must be text');validUnicode(text);
 ensure(globalThis.crypto?.subtle,'WebCrypto SHA-256 is unavailable in this browser context');
 const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

function validateIntent(intent){
 ensure(keys(intent,[...DIMENSIONS,'use']),'Intent fields differ from the contract schema');
 for(const dim of SEMANTIC)ensure(typeof intent[dim]==='string'&&length(intent[dim])>=10&&length(intent[dim])<=500,'Invalid narrative intent: '+dim);
 ensure(['USA','GLOBAL','USA_CALIFORNIA'].includes(intent.geography),'Invalid geography');
 ensure(['DESCRIPTIVE_ONLY','CAUSAL_EFFECT'].includes(intent.use),'Invalid intended use');
 const period=intent.period;
 ensure(keys(period,['from','to'])&&Number.isInteger(period.from)&&Number.isInteger(period.to)&&1900<=period.from&&period.from<=period.to&&period.to<=2100&&period.to-period.from<=20,'Invalid intended period');
}

function sourceContents(source){
 ensure(keys(source,['profile','metadata_url','series_url','metadata_sha256','series_sha256','metadata_raw','series_raw','records','lines','digest']),'Source fields differ from the contract schema');
 ensure(source.profile===PROFILE&&source.metadata_url===META_URL&&source.series_url===SERIES_URL,'Source adapter identity mismatch');
 for(const field of ['metadata_raw','series_raw'])ensure(typeof source[field]==='string'&&new TextEncoder().encode(source[field]).length>=100&&new TextEncoder().encode(source[field]).length<=30000,'Invalid bounded source body: '+field);
 const metadata=JSON.parse(source.metadata_raw),series=JSON.parse(source.series_raw);
 ensure(Array.isArray(metadata)&&metadata.length===2&&Array.isArray(metadata[1])&&metadata[1].length===1,'Unexpected official metadata shape');
 const meta=metadata[1][0];
 ensure(meta?.id===INDICATOR&&meta.source?.id==='2','Unexpected official indicator metadata');
 for(const field of ['name','sourceNote','sourceOrganization'])ensure(typeof meta[field]==='string'&&meta[field].length>0,'Incomplete official metadata');
 ensure(Array.isArray(series)&&series.length===2&&object(series[0])&&series[0].pages===1&&Array.isArray(series[1])&&series[1].length===4,'Series must be one complete bounded page');
 const years=new Set(),records=[];
 for(const row of series[1]){
  ensure(object(row)&&row.indicator?.id===INDICATOR&&row.countryiso3code==='USA'&&row.country?.id==='US'&&row.country?.value==='United States','Series country or indicator mismatch');
  ensure(typeof row.date==='string'&&/^\d+$/.test(row.date)&&Number(row.date)>=2020&&Number(row.date)<=2023&&!years.has(row.date),'Unexpected or duplicate series year');
  ensure(Object.hasOwn(row,'value')&&(row.value===null||typeof row.value==='number'&&Number.isFinite(row.value)&&row.value>=0&&row.value<=100),'Invalid unemployment observation');
  years.add(row.date);records.push({year:Number(row.date),available:row.value!==null});
 }
 records.sort((a,b)=>a.year-b.year);
 const lines=['Adapter: '+PROFILE,'Indicator id: '+INDICATOR,'Indicator name: '+meta.name,'Official definition: '+meta.sourceNote,
  'Source organization: '+meta.sourceOrganization,'Dataset collection: World Development Indicators','Country: United States (USA), national series',
  'Requested API interval: 2020-2023, annual records','Non-null available years: '+records.filter(row=>row.available).map(row=>row.year).join(','),
  'Null missing years: '+records.filter(row=>!row.available).map(row=>row.year).join(','),
  'Scope boundary: no sampling frame, demographic coverage, adjustment details or causal design are inferred beyond the official definition and source organization above.'];
 ensure(equal(source.records,records),'Source availability records differ from raw series');
 ensure(equal(source.lines,lines),'Source lines differ from deterministic raw-source extraction');
 return {records,lines};
}

function validateAssessment(assessment,intent,source){
 ensure(keys(assessment,['dimensions','verdict','use','causal_design','certification_scope','reason_provenance','intent_digest','source_digest','digest']),'Assessment fields differ from the contract schema');
 ensure(keys(assessment.dimensions,DIMENSIONS),'Assessment dimensions differ from the contract schema');
 for(const dim of DIMENSIONS){
  const row=assessment.dimensions[dim],semantic=SEMANTIC.includes(dim);
  ensure(keys(row,semantic?['status','reason','citations']:['status','reason','citations','mechanism']),'Unexpected assessment dimension fields: '+dim);
  ensure(STATUSES.includes(row.status)&&typeof row.reason==='string'&&length(row.reason)>=10&&length(row.reason)<=450,'Invalid assessment dimension: '+dim);
  ensure(Array.isArray(row.citations)&&row.citations.length<=4&&(row.status==='UNKNOWN'||row.citations.length>0),'Invalid citation count: '+dim);
  let previous=0;
  for(const citation of row.citations){
   ensure(keys(citation,['line','quote'])&&Number.isInteger(citation.line)&&citation.line>previous&&citation.line<=source.lines.length,'Invalid or unordered citation: '+dim);
   ensure(citation.quote===source.lines[citation.line-1],'Citation quote differs from its frozen source line: '+dim);previous=citation.line;
  }
 }
 const geography=assessment.dimensions.geography,period=assessment.dimensions.period;
 ensure(geography.status===(intent.geography==='USA'?'SUPPORTED':'CONTRADICTED')&&geography.mechanism==='deterministic country match'&&geography.reason==='The frozen record is USA national data; this adapter cannot establish a global or California series.'&&equal(geography.citations.map(c=>c.line),[7]),'Deterministic geography decision mismatch');
 const available=new Set(source.records.filter(row=>row.available).map(row=>row.year));
 const complete=Array.from({length:intent.period.to-intent.period.from+1},(_,i)=>i+intent.period.from).every(year=>available.has(year));
 const periodReason=complete?'All requested years have non-null official records.':'The frozen extract does not provide non-null records for every requested year; missing is not zero.';
 ensure(period.status===(complete?'SUPPORTED':'UNKNOWN')&&period.mechanism==='deterministic non-null coverage'&&period.reason===periodReason&&equal(period.citations.map(c=>c.line),[8,9,10]),'Deterministic period decision mismatch');
 const statuses=DIMENSIONS.map(dim=>assessment.dimensions[dim].status);
 let verdict=statuses.includes('CONTRADICTED')?'CONTRADICTED':statuses.includes('UNKNOWN')?'UNKNOWN':'SUPPORTED';
 if(intent.use==='CAUSAL_EFFECT'&&verdict!=='CONTRADICTED')verdict='UNKNOWN';
 ensure(assessment.verdict===verdict&&assessment.use===intent.use,'Assessment aggregate or intended-use mismatch');
 ensure(assessment.causal_design==='NOT_ESTABLISHED'&&assessment.certification_scope==='metadata support only; no accuracy, representativeness or causal certification'&&assessment.reason_provenance==='leader-authored explanations; semantic statuses independently reproduced and citations substantively checked','Assessment trust boundary mismatch');
}

export async function verifyCovenantIntegrity(c){
 const checks=[];
 const scope={integrity:'recorded-content-only',authenticity:'not-established',hasSource:!!c?.source,hasAssessment:!!c?.assessment,hasAcknowledgement:!!c?.acknowledgement,
  stage:c?.acknowledgement?'acknowledgement':c?.assessment?'assessment':c?.source?'source':'intent',
  semanticExplanations:'leader-authored-not-independently-verified',semanticCitationSupport:'not-reassessed-in-browser',parentRecordVerified:false};
 const check=async(name,operation)=>{try{await operation();checks.push({name,ok:true});}catch(error){checks.push({name,ok:false,error:error?.message??String(error)});}};
 const digest=async(name,record,field='digest')=>check(name,async()=>{
  ensure(object(record)&&SHA.test(record[field]),'Missing or invalid '+field);
  const body={...record};delete body[field];ensure(await sha256(canonical(body))===record[field],'SHA-256 does not match '+field);
 });
 if(!object(c)){await check('covenant.schema',()=>ensure(false,'Expected a covenant JSON object'));return {ok:false,checks,scope};}
 await check('covenant.schema',()=>{
  canonical(c);
  ensure(COMMITMENT.every(key=>Object.hasOwn(c,key))&&Object.hasOwn(c,'intent_digest')&&Object.keys(c).every(key=>[...COMMITMENT,'intent_digest','source','assessment','acknowledgement'].includes(key)),'Unexpected or missing covenant fields');
  ensure(typeof c.id==='string'&&ID.test(c.id)&&typeof c.owner==='string'&&ADDRESS.test(c.owner)&&typeof c.analyst==='string'&&ADDRESS.test(c.analyst)&&c.owner!==c.analyst,'Invalid covenant identity or parties');
  ensure(c.profile===PROFILE&&SHA.test(c.metadata_sha256)&&SHA.test(c.series_sha256),'Invalid profile or committed source hashes');
  ensure(typeof c.parent_id==='string'&&typeof c.parent_digest==='string'&&(c.parent_id?ID.test(c.parent_id)&&c.parent_id!==c.id&&SHA.test(c.parent_digest):c.parent_digest===''),'Invalid parent commitment reference');
  validateIntent(c.intent);
 });
 const commitment=Object.fromEntries([...COMMITMENT,'intent_digest'].map(key=>[key,c[key]]));
 await digest('intent.digest',commitment,'intent_digest');
 await check('covenant.stageOrder',()=>{
  ensure(!c.assessment||object(c.source),'Assessment requires frozen source');
  ensure(!c.acknowledgement||object(c.assessment)&&object(c.source),'Acknowledgement requires source and assessment');
  for(const key of ['source','assessment','acknowledgement'])ensure(c[key]===undefined||c[key]===null||object(c[key]),'Invalid covenant stage: '+key);
 });
 if(c.source){
  const s=c.source;
  await digest('source.digest',s);
  await check('source.metadataRawSha256',async()=>ensure(await sha256(s.metadata_raw)===c.metadata_sha256&&s.metadata_sha256===c.metadata_sha256,'Metadata bytes or source hash differ from commitment'));
  await check('source.seriesRawSha256',async()=>ensure(await sha256(s.series_raw)===c.series_sha256&&s.series_sha256===c.series_sha256,'Series bytes or source hash differ from commitment'));
  await check('source.extraction',()=>sourceContents(s));
 }
 if(c.assessment){
  const a=c.assessment;
  await digest('assessment.digest',a);
  await check('assessment.references',()=>ensure(a.intent_digest===c.intent_digest&&a.source_digest===c.source?.digest,'Assessment digest references differ from covenant'));
  await check('assessment.structureAndDeterministicRules',()=>validateAssessment(a,c.intent,c.source));
 }
 if(c.acknowledgement){
  const ack=c.acknowledgement;
  await digest('acknowledgement.digest',ack);
  await check('acknowledgement.referencesAndIdentities',()=>{
   ensure(keys(ack,['researcher','analyst','intent_digest','source_digest','assessment_digest','verdict','meaning','digest']),'Unexpected acknowledgement fields');
   ensure(ack.researcher===c.owner&&ack.analyst===c.analyst,'Acknowledgement parties differ from covenant');
   ensure(ack.intent_digest===c.intent_digest&&ack.source_digest===c.source?.digest&&ack.assessment_digest===c.assessment?.digest,'Acknowledgement digest references differ from covenant');
   ensure(!!c.assessment&&ack.verdict===c.assessment.verdict&&ack.meaning==='review received; does not override decision or certify suitability','Acknowledgement verdict or meaning differs from assessment');
  });
 }
 return {ok:checks.every(item=>item.ok),checks,scope};
}

const clone=value=>JSON.parse(canonical(value));
export function createEvidenceEnvelope(c,provenance={}){
 ensure(object(c)&&object(c.intent)&&typeof c.id==='string'&&typeof c.owner==='string','Expected a covenant record');
 ensure(object(provenance),'Evidence provenance must be a JSON object');
 return {format:FORMAT,version:1,covenant:clone(c),provenance:clone(provenance)};
}

// Import provenance is retained as supplied data. Importing a file does not make
// its chain, timestamp, receipt summaries, or origin independently verified.
export function parseEvidenceEnvelope(input){
 const value=typeof input==='string'?JSON.parse(input):clone(input);
 ensure(object(value),'Expected an evidence envelope or covenant object');
 if(Object.hasOwn(value,'format')||Object.hasOwn(value,'covenant')){
  ensure(value.format===FORMAT&&value.version===1,'Unsupported evidence format or version');
  ensure(object(value.provenance),'Evidence envelope must retain an explicit provenance object');
  createEvidenceEnvelope(value.covenant,value.provenance);return clone(value);
 }
 return {...createEvidenceEnvelope(value),legacy:true};
}

function differencePaths(left,right,path=''){
 if(Object.is(left,right))return [];
 if(Array.isArray(left)&&Array.isArray(right)){
  if(left.length!==right.length)return [path||'$'];
  return left.flatMap((value,index)=>differencePaths(value,right[index],path+'['+index+']'));
 }
 if(object(left)&&object(right))return [...new Set([...Object.keys(left),...Object.keys(right)])].sort().flatMap(key=>{
  const next=path?path+'.'+key:key;
  return !Object.hasOwn(left,key)||!Object.hasOwn(right,key)?[next]:differencePaths(left[key],right[key],next);
 });
 return [path||'$'];
}

export async function compareCovenantState(recorded,fresh){
 const [recordedIntegrity,freshIntegrity]=await Promise.all([verifyCovenantIntegrity(recorded),verifyCovenantIntegrity(fresh)]);
 const differences=differencePaths(recorded,fresh);
 return {match:recordedIntegrity.ok&&freshIntegrity.ok&&differences.length===0,differences,recordedIntegrity,freshIntegrity,scope:'full-covenant-content-comparison'};
}
