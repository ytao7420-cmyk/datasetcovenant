# DatasetCovenant review remediation — 2026-10-21

This is a revision of existing Projects contribution `30e18ec0-fd28-4568-86ef-3d94a42bbc98`. It is not a new project or duplicate submission. The Studionet contract and pinned contract source are unchanged. The fixes concern browser evidence presentation, integrity verification, transaction finality/recovery, and reproducible validation.

| Reviewer request | Implemented change | Reproducible evidence |
| --- | --- | --- |
| Leader explanations are not independently checked | Semantic statuses/citation support and leader-authored prose have separate labels. Geography/period remain deterministic. Existing `reason_provenance` is visible. | `tests/review-view.test.mjs` uses fabricated causal, population, and geography explanations; `tests/test_contract.py` explicitly demonstrates the mocked consensus boundary with different leader/validator prose. These tests do not establish real-model resistance to misleading prose. |
| Browser only compares digest pointers | `lib/evidence.js` uses WebCrypto SHA-256 for the canonical intent, exact raw official metadata/series strings, source snapshot, assessment, and acknowledgement. It checks identity, binding, copied citations and deterministic rules separately. | `tests/evidence.test.mjs` changes raw bytes, intent, copied lines, availability, status, quotation, explanation and acknowledgement identity/verdict. Matching digest pointers do not hide corruption. Download/import retains a versioned provenance envelope; fresh RPC comparison is a distinct observation. |
| ACCEPTED presented as complete | Accepted execution returns `finalityPending:true`, keeps the saved transaction, and displays a pending-finality message. Only finalized execution with matching call and readback clears the journal. Refresh never broadcasts. | Delayed-finality, reload, cancellation, finalized rollback, wrong receipt, and failed-readback tests in `tests/chain-recovery.test.mjs`. Recorded transaction summaries expose their lifecycle and are explicitly caller-supplied records. |
| Crash before wallet signing permanently blocks writes | Version 3 journals start `UNSIGNED`. The provider wrapper persists `BROADCAST_POSSIBLE` before forwarding a signing/broadcast request. A user can release only the exact intact unsigned operation ID. | Tests cover pre-signing crash, rejection, storage failure at the boundary, response loss, changed operations, SDK fallback, legacy uncertainty, and mismatched recovery hashes. Uncertain broadcasts still require receipt-bound recovery. |
| Successful hosted CI and current production wallet demonstration | The public workflow performs official GenVM AST and exact-SDK validation, contract tests, JavaScript tests, production build and archive verification. | See `docs/ci.md` for exact pinned inputs. A successful run URL and the production wallet demonstration must be added below before resubmission. A workflow file or local test run alone is not hosted CI evidence. |

## Verification status

- Local official GenVM check: passed AST checks and exact contract SDK validation (6 methods: 2 views, 4 writes). A newer-runner informational notice does not change the pinned deployment.
- Local Python suite: 23 tests passed, with explicitly mocked HTTP/model/consensus.
- Local JavaScript suite: 69 tests passed, including browser-module transport/storage tests and real WebCrypto hashing under Node. This is not a Chrome wallet demonstration.
- Three original archived covenant records: full integrity verification passed.
- Fresh public RPC recheck at 2026-10-21 10:04 UTC: 19/19 observations passed, including all three complete states and finalized receipts for the twelve successful calls, exact stale-digest rollback and deployment. See [the complete read-only report](../public/evidence/recheck-2026-10-21.json). This did not submit any transaction and is not a browser-wallet demonstration.
- Production bundle: builds successfully.
- Public hosted CI: awaiting actual run; no success is claimed here yet.
- Updated production browser-wallet demonstration: pending Chrome access and actual wallet interaction; not yet recorded.
- Resubmission: not yet sent.

## Production browser demonstration procedure

Use the public website and MetaMask on GenLayer Studionet (61999), zero-value calls only. Two distinct project-controlled accounts are required: researcher R and nominated analyst A. Do not use real assets or share keys. Use a new unique ID so existing immutable records are preserved.

1. Open Recorded evidence. Confirm content integrity for all three examples. Export an evidence envelope and import it again. Deliberately alter a copied file's raw source text while keeping its digest pointers; the interface must show failed integrity checks rather than a verified receipt.
2. Compare the original recorded covenant with fresh contract state. Record the configured contract address, the observation time, and matching/different/unavailable result.
3. Connect R. Create a descriptive-use covenant, nominate A and retain the existing pinned raw source hashes. Record its wallet transaction hash. If ACCEPTED is observed, show the finalization-pending label, then refresh the saved transaction until FINALIZED.
4. Reconnect as A. Capture official source bytes and request assessment. For each call record exact hash, lifecycle, full-validator consensus/execution and readback.
5. Reconnect as R and acknowledge that exact assessment digest. Record finalized readback and export its evidence envelope.
6. Create a new causal-use revision with the original ID and exact intent digest as parent. Reconnect as A, capture and assess the revision.
7. Reconnect as R. Use **Test stale parent acknowledgement** before acknowledging the revision. The app sends the parent's assessment digest, then independently checks the exact full-validator rollback `Acknowledgement must bind the exact frozen assessment digest` and reads the revision to verify that acknowledgement is still absent. An arbitrary transport failure is not an expected-rejection pass.
8. Submit the revision's own exact assessment digest. Observe finalization, full readback and its separate acknowledgement. Export the revision envelope, record the transaction URLs, and capture screenshots of the production origin, pending/finalized state, rejected stale call and final receipts.

Retain the actual browser evidence with timestamps and public hashes. Do not relabel the earlier CLI harness run or a mocked transport test as this demonstration. If either role or network operation is unavailable, leave the demonstration explicitly incomplete and do not resubmit as though it passed.

## Public links

- Website: https://datasetcovenant-genlayer-57.sales136152.chatgpt.site
- Source: https://github.com/ytao7420-cmyk/datasetcovenant
- Contract: https://explorer-studio.genlayer.com/address/0x9080E0C21432C8B3e66061bB9495645ca1c214B5
- Workflow: https://github.com/ytao7420-cmyk/datasetcovenant/actions/workflows/verify.yml
