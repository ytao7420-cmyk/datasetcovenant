export const dimensions=['population','geography','period','measurement','exclusions'];
export const displayText=value=>value==null?'':typeof value==='string'?value:['number','boolean'].includes(typeof value)?String(value):'[Invalid display value]';
export const escapeHTML=value=>displayText(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const shorten=value=>typeof value==='string'&&value?`${value.slice(0,9)}…${value.slice(-6)}`:'Not recorded';
export function aggregate(statuses,use='DESCRIPTIVE_ONLY') {return statuses.includes('CONTRADICTED')?'CONTRADICTED':statuses.includes('UNKNOWN')||use==='CAUSAL_EFFECT'?'UNKNOWN':'SUPPORTED';}
export function validAddress(value){return /^0x[0-9a-f]{40}$/i.test(value);}
export function pendingStage(covenant){return !covenant?'Commit intent':!covenant.source?'Capture sources':!covenant.assessment?'Run assessment':!covenant.acknowledgement?'Acknowledge exact digest':'Receipt complete';}
export function verifyBindings(c){if(!c?.assessment)return false;const a=c.assessment;return a.intent_digest===c.intent_digest&&a.source_digest===c.source?.digest&&(!c.acknowledgement||c.acknowledgement.assessment_digest===a.digest&&c.acknowledgement.intent_digest===c.intent_digest&&c.acknowledgement.source_digest===c.source.digest);}
