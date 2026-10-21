import {escapeHTML as e,dimensions} from './model.js';
const semantic=new Set(['population','measurement','exclusions']);
const pill=value=>`<span class="pill ${e(String(value??'pending').toLowerCase())}">${e(value??'PENDING')}</span>`;
export function dimensionReviewHTML(assessment){
 if(!assessment)return '<p class="empty">No assessment yet. No result is implied by capturing a source.</p>';
 return `<div class="notice"><b>Explanations are not consensus conclusions.</b><p>Consensus checks semantic statuses and cited support. The leader writes the three semantic explanations; validators do not independently verify that prose.</p><p>Recorded provenance: ${e(assessment.reason_provenance??'Not supplied')}</p></div>`+dimensions.map(name=>{
 const row=assessment.dimensions?.[name];if(!row)return `<p class="error">Missing ${e(name)} result.</p>`;
 const isSemantic=semantic.has(name);
 return `<article class="dimension"><div><h4>${e(name)}</h4>${pill(row.status)}</div><small>${isSemantic?'Consensus status and cited support':'Deterministic status from frozen source'}</small><div class="commentary"><b>${isSemantic?'Leader-authored commentary · not independently verified':'Deterministic explanation'}</b><p>${e(row.reason)}</p></div>${(Array.isArray(row.citations)?row.citations:[]).filter(cite=>cite&&typeof cite==='object').map(cite=>`<details><summary>Checked citation · source line ${e(cite.line)}</summary><blockquote>${e(cite.quote)}</blockquote></details>`).join('')}</article>`;
 }).join('');
}
export function integrityHTML(report,comparison){
 let title=!report?'Checking SHA-256…':!report.ok?'Integrity check failed':!report.scope?.hasAssessment?'Intent only · content integrity verified':'Content integrity verified';
 let html=`<div class="integrity ${report?.ok?'verified':''}"><b>${e(title)}</b><p>SHA-256 checks recorded content and digest bindings. It does not authenticate chain provenance or verify leader commentary.</p>`;
 if(report)html+=`<details><summary>Individual integrity checks</summary><ul>${report.checks.map(c=>`<li>${c.ok?'✓':'✕'} ${e(c.name)}${c.error?' — '+e(c.error):''}</li>`).join('')}</ul></details>`;
 if(comparison)html+=`<p class="chain-comparison"><b>Fresh RPC comparison: ${comparison.status==='unavailable'?'unavailable':comparison.match?'matching':'different'}</b> · ${e(comparison.observedAt)}<br>${e(comparison.error??'Compared the full covenant with the configured Studionet contract. This is an RPC observation, not an independent authenticity proof.')}</p>`;
 return html+'</div>';
}
