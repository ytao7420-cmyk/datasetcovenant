# Validation and reviewer procedure

## Current evidence boundary

Implementation checks: **23 Python invariant tests and 72 JavaScript tests pass**. Production bundle builds. These are local tests with explicitly mocked GenLayer HTTP/model/consensus for Python. They do not prove actual network consensus or robustness against every prompt injection.

## Recorded live result — 2026-10-19

The source-hash-pinned contract was deployed on GenLayer Studionet61999 and its RPC-read code matched SHA-256 `9f10d3c10d6416fd20a1889ca3c8087b7720aaa5a61684ab0c282aecc9089dd2`.

- Contract: `0x9080E0C21432C8B3e66061bB9495645ca1c214B5`
- Deployment: `0x72b538ff51c41ea3212fda5cdfe8411770c5d9177c29761af34ad2ba60db0f5f`
- Actual workflow: **12 successful full-validator calls**, all `MAJORITY_AGREE`, `leaderOnly:false`, VM execution `SUCCESS`.
- `labor-force`: **SUPPORTED**, with an exact researcher acknowledgement.
- `all-adults`: **CONTRADICTED**, with a receipt acknowledging the contradiction without overriding it.
- `causal-revision`: **UNKNOWN**; parent approval did not transfer. Its own exact digest was acknowledged only after the stale-digest attempt failed.
- Separate negative call: `0x65eba5fb76907219b9428fcf6f45caa7cd7eec5d1b79f48901a35efc35d0b727`, actual full-validator majority agreement on the explicit VM rollback `Acknowledgement must bind the exact frozen assessment digest`. This is one expected failed execution, not one of the12 successful workflow calls.

Raw official source bytes and hashes were compared with contract state. The harness read the revision after the rejected call and confirmed its acknowledgement was still null, then submitted the correct new digest. Full public records are in `public/evidence/demo.json`; deployment receipt in `public/deployment.json`. All actor accounts are project-controlled; this is real testnet execution of synthetic intended uses, not independent human approval.

## Reproduce independent checks

`npm ci && npm test && npm run test:contract && npm run build`.

Tests cover distinct actors; immutable IDs/sources; source-hash changes; wrong country, indicator and duplicated years; incomplete page; null versus genuine zero; deterministic country and period checks; causal UNKNOWN; source citation bounds; independent semantic disagreement; substantive citation audit rejection; exact digest acknowledgement; wrong actor; changed-parent mismatch; and stale approval rejected on a revision. JavaScript tests cover digest corruption, acknowledgement binding, unsafe markup, and lifecycle/consensus/execution distinction.

### Fresh public RPC recheck — 2026-10-21

[The timestamped report](../public/evidence/recheck-2026-10-21.json) records 19/19 successful observations between 10:04:07 and 10:04:49 UTC: configured chain identity, deployed code SHA-256, all three complete covenant states, twelve successful workflow receipts, the exact stale-digest rollback receipt, and the deployment receipt. Every transaction receipt was `FINALIZED`; successful workflow calls matched the complete archived ABI calldata, actor, contract, full-validator flag and successful majority execution. The historical negative call matched the exact rollback payload. The revision now has its later valid acknowledgement; the report does not claim its current acknowledgement is absent.

Inspect `node scripts/recheck-public.mjs --plan`, then run `node scripts/recheck-public.mjs` for account-free reads only. The script permits four declared public RPC methods, applies request/time budgets, and records failures or unavailable reads explicitly. It imports no private actor harness and submits no transaction. These CLI observations are distinct from the separately recorded [current production browser-wallet demonstration](browser-demo-20261021.md), which has nine finalized calls: eight successful writes and one expected failed stale-digest call.

## Reproduction scenarios (expected outcomes matched the recorded run)

1. `labor-force`: national descriptive trend, modeled ILO percentage of total labor force, without undocumented demographic assumptions. Expected SUPPORTED.
2. `all-adults`: claims all adult residents, including those outside the labor force, as denominator. Expected CONTRADICTED.
3. `causal-revision`: revision of the first intention, now seeking a causal effect. Expected UNKNOWN even if all five metadata dimensions are otherwise supported. Acknowledgement of the original is not inherited.

A leader model may return another valid conservative outcome. The harness records actual outcomes and separately prints expectation comparison; it never substitutes a fixture. `npm run verify` checks the archive's complete commitments, source bytes, country/indicator/year scope, copied quotes, deterministic statuses, assessment/acknowledgement digests, revision links and transaction success fields.

Optional `--negative` performs a real zero-value call trying to acknowledge the causal revision with the previous assessment digest. Success means the harness observes an explicit full-consensus VM rollback with exact payload `Acknowledgement must bind the exact frozen assessment digest` and no new receipt from that invalid call. It is a separately labeled failed execution, never counted as a successful workflow transaction.

## Browser review

Open recorded evidence, switch through all three cases, expand a source citation, inspect acknowledgement and parent binding, then follow a transaction explorer link. The application should show actual majority-consensus evidence and clearly label project-controlled actors. In Live workspace, read the researcher address and covenant ID from the archive without connecting a wallet. A write requires the correct account for each role. Use Download evidence envelope to retain the complete supplied provenance. Import the envelope and inspect each actual SHA-256 check. Use Compare with fresh on-chain state for a separately timestamped RPC observation. Content integrity does not authenticate transaction summaries or leader prose.

The static checker validates archived summaries and integrity, not a fresh RPC read by itself. The live harness obtains receipt evidence from RPC and re-reads completed state. Fresh browser reads query the contract and show current on-chain state.

### Observed Chrome check (2026-10-19)

Chrome opened the recorded cases, expanded the official metadata citation and displayed the causal revision with UNKNOWN and separate acknowledgement. Live workspace then read the same researcher/covenant directly from Studionet without connecting or signing a wallet; the application showed SUCCESS and the exact recorded digest. This verifies browser reads, not a complete browser write workflow.

### Browser recovery regression checks

Thirty-three JavaScript tests import the actual browser transaction module with mocked transport and storage. They verify that the exact intended call is persisted before signing/broadcast; an unknown outcome survives reload and blocks another write; storage failure prevents sending; an explicit EIP-1193 user rejection clears the intent; and supplying an existing hash recovers without broadcasting. Recovery checks the receipt hash, actor, contract, full ABI calldata and full-validator flag, then verifies resulting contract state. A mismatched receipt cannot attach to or erase the pending intent. Delayed finality keeps the journal; only the exact provably unsigned operation may be explicitly released. A matched finalized rollback returns failed evidence without entering the success readback path; a historical accepted rollback retains `finalityPending:true` and its original receipt for explicit rejection review. The stale-test result also keeps the pending-finality wording visible. These tests are not a live-wallet network-disconnection experiment. The separate actual browser workflow below supplies current wallet evidence; the test suite itself submits no chain call.

## Review remediation — 2026-10-21

See [review-response.md](review-response.md) for the five reviewer requests, exact fixes, adversarial regression cases and remaining production steps. See [ci.md](ci.md) for the official GenVM check and hosted workflow. Hosted run `39582144118` passed for commit `d0d3dc7fab7fbadb704418c991d8381593fc678c`; it is historical evidence for that commit and does not validate the later v3 accepted-rollback label patch or final browser-evidence additions. [V3 hotfix run 39587599531](https://github.com/ytao7420-cmyk/datasetcovenant/actions/runs/39587599531) subsequently passed for `c7114e7` with 70 JavaScript tests; it does not cover the later v4 journal/resume correction or final 72-test/browser-evidence revision. A new successful final-commit CI run remains to be linked. The earlier 2026-10-19 Chrome read-only check above has not been relabeled as a current browser write demonstration.

The browser now distinguishes recorded-content SHA-256 integrity, independently reproduced semantic statuses/substantively checked citations, leader-authored explanatory prose, and fresh RPC state comparison. Imported provenance and recorded receipt summaries remain caller-supplied. Accepted successful execution remains pending finality and retains its journal until finalized, exact-call-bound execution and successful readback. Accepted rollback also retains its journal and remains explicitly pending finality. Read-only resume returns its raw failed receipt; only its finalized, matched known failure closes that operation as a failure. The resume UI preserves the current covenant when no successful state value is returned.


## Current production Chrome/MetaMask workflow — 2026-10-21

The updated hosted v2/v3 frontend has actual wallet-write evidence at the [public production site](https://datasetcovenant-genlayer-57.sales136152.chatgpt.site). The detailed [browser record](browser-demo-20261021.md) and [machine-readable index](../public/evidence/browser-workflow-2026-10-21.json) retain exact public hashes, page screenshots, exported envelopes and separately timed account-free receipt/state reads. This evidence is distinct from the historical CLI harness.

Nine zero-value calls are finalized: base create/capture/assess/exact acknowledgement, revision create/capture/assess, the expected failed stale-parent acknowledgement, and the correct exact revision acknowledgement. This is eight successful workflow writes plus one expected rollback, not nine successful executions. The base ID is `browser-20261021-trend-bb81` (`SUPPORTED`); the linked revision is `browser-20261021-causal-bb81` (`UNKNOWN`), assessment digest `8ae0cb96e9d89695811dc8c8eb8a16478d099ea0c715e34a9fe028da877093b7`. Browser observations of `ACCEPTED`/pending are kept distinct from later `FINALIZED` observations. The production UI also rejected an actually imported corrupted envelope, then passed integrity after the original envelope was re-imported.

Current browser negative call `0xc8d35b9bc0c2cf0ee4f31d87b5680478cc3fcf3e892a7d8cefd058a34f70d6a2` finalized with exact payload `Acknowledgement must bind the exact frozen assessment digest`. A fresh read at `2026-10-21T11:00:21.849Z` established null revision acknowledgement before the correct call. Correct acknowledgement `0x048be09eab161f9cfdf419777b6c52e2d85eb0fdad85c633288ce1dca22ce502` subsequently showed `SUCCESS`/`FINALIZED` and exact state readback in the production app. `revision-workflow-finalized.png` and the actual downloaded revision evidence envelope retain the final browser result; detailed file hashes and later RPC observations belong to the linked manifest.

The human operator personally handled MetaMask warnings/signature interactions for the first eight calls. The ninth used ordinary MetaMask Confirm, without a warning, under explicit authorization for this zero-value Studionet call. Two distinct project-controlled addresses establish role separation, not independent people. Published screenshots are pure webpage captures; native wallet/security screenshots with unrelated asset or browser context remain local.

The nine-call demonstration used hosted v2/v3. The v3 label patch explicitly displayed pending finality for an accepted stale-digest rollback. A later v4 correction also retains an accepted failed-call journal until finality and routes resume through read-only receipt refresh; it preserves the loaded covenant for failed results. The two new regressions bring the local total to 72 JavaScript tests, with 23 Python tests unchanged. This post-demo correction does not resend any existing transaction and is not represented as the version used to obtain the nine wallet signatures. v4 was published at the existing origin on 2026-10-21T11:09:19.736698Z (Sites source `0b14048a652e2fcb3d8241b080d9e7a71d3ba5c3`). A successful hosted CI run for the final repository revision remains to be linked before resubmission.
