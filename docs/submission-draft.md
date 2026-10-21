# DatasetCovenant — Precommitted Statistical Use and Digest-Bound Review Receipts

Category: Projects

## One sentence
DatasetCovenant binds a researcher's intended dataset use to official metadata, independent GenLayer review, and an immutable counterpart receipt.

## Description
DatasetCovenant resolves a concrete data-handoff trust problem: an analyst can substitute a denominator or reuse approval after the research question changes. A researcher commits intended population, geography, period, measurement and exclusions; a different analyst captures hash-pinned official World Bank metadata and a bounded USA series. Validators independently assess semantic support and audit cited source passages. Deterministic code verifies geography and non-null year coverage, preserving missing versus zero. The researcher acknowledges the exact assessment digest; changed assumptions require a linked revision with new acknowledgement. The app supports actual contract writes, full transaction states, recorded evidence and live reads. Three synthetic scenarios exercise supported descriptive use, an incompatible denominator and a causal revision. Metadata support never certifies data accuracy or causal validity. All demonstration actors are project-controlled; Studionet only.

## Six short use steps
1. **Inspect recorded cases.** Open the website and select Recorded evidence. Review the national trend, denominator contradiction and causal revision.
2. **Inspect the source.** Expand any citation and Frozen official evidence. Compare the actual World Bank metadata and year coverage.
3. **Trace the receipt.** Review the researcher/analyst roles and intent, source and assessment digests. The causal revision has a distinct receipt.
4. **Verify on chain.** Follow a transaction link, or enter the recorded researcher address and covenant ID in Live workspace to read the contract.
5. **Create an intended use.** Connect a Studionet researcher wallet, nominate a different analyst, and commit a bounded intent and source hashes.
6. **Complete the review.** Reconnect as the analyst to capture and assess. Reconnect as the researcher to acknowledge the exact assessment digest.

## Expected reviewer result
Three recorded covenants expose actual consensus receipts, frozen official evidence, dimensions and digest-bound acknowledgements. A denominator conflict remains CONTRADICTED; causal design remains NOT_ESTABLISHED. Parent approval never carries into a changed intent. New live actions use real GenLayer calls with read-back verification.

## Project links
Website: https://datasetcovenant-genlayer-57.sales136152.chatgpt.site
GitHub: https://github.com/ytao7420-cmyk/datasetcovenant
Contract: https://explorer-studio.genlayer.com/address/0x9080E0C21432C8B3e66061bB9495645ca1c214B5
Proof: commit-pinned [validation](validation.md), [current browser evidence](browser-demo-20261021.md), and [browser manifest](../public/evidence/browser-workflow-2026-10-21.json); historical archive in public/evidence/demo.json

## Review revision (same contribution; do not submit as a new project)

Contribution ID: `30e18ec0-fd28-4568-86ef-3d94a42bbc98`.

Remediation: leader-authored prose now has its own unverified label; semantic statuses and audited citations have separate presentation. The browser recomputes canonical SHA-256 commitments and exact raw-source hashes, preserves imported provenance in an envelope, and supports a separate fresh RPC comparison. Accepted execution stays pending finality with a retained journal. An exact provably unsigned operation may be explicitly released; uncertain broadcasts cannot be resent. Regression coverage includes misleading explanations, corrupted evidence, delayed finality, finalized rollback, pre-signing crashes and mismatched recovery hashes. The contract is unchanged.

Local checks now pass **72 JavaScript tests and 23 Python tests**. Hosted production v2/v3 completed all nine Chrome/MetaMask calls: eight successful writes across the base and causal revision, plus one explicitly verified stale-parent rollback. The causal revision remains `UNKNOWN`, assessment digest `8ae0cb96e9d89695811dc8c8eb8a16478d099ea0c715e34a9fe028da877093b7`, with its own exact acknowledgement. See [the browser evidence](browser-demo-20261021.md) and its machine-readable index for finalized receipts, pre-valid-ack null state, screenshots, corrupted/original import results and actual exported envelopes.

The human operator personally handled wallet warnings/signature interactions for the first eight calls. The last call used ordinary MetaMask Confirm, with no warning, under explicit authorization for a zero-value test call. A later v4 correction retains accepted rollback journals through finality and supports read-only failed-receipt resume; its regressions submit no new wallet call. The nine observed calls remain evidence of v2/v3.

Attach the commit-pinned [review response](review-response.md), [validation procedure](validation.md), and a successful hosted CI run for the final revision. Earlier run `39582144118` covers commit `d0d3dc7fab7fbadb704418c991d8381593fc678c`, not the later v3/v4 corrections and browser additions. V3 hotfix [run 39587599531](https://github.com/ytao7420-cmyk/datasetcovenant/actions/runs/39587599531) passed for `c7114e7` with 70 JavaScript tests; it does not cover the final v4/72-test/browser-evidence revision. **This draft has not been resubmitted. Final v4 publication and its hosted CI evidence remain pending.**

## Existing-contribution response draft (under 1,000 characters; not sent)

Updated this existing project. Leader prose is separately labeled; the browser recomputes SHA-256 for intent, official raw bytes, source, assessment and acknowledgement, with separate fresh-RPC comparison. Accepted results retain pending-finality handling; exact unsigned intent can be released, uncertain broadcasts cannot be resent. Local checks: 72 JS / 23 Python tests. Hosted v2/v3 completed nine real Chrome/MetaMask calls: eight successful writes plus an exact stale-digest rollback, followed by the revision's own acknowledgement. The causal verdict remains UNKNOWN. The human handled warnings/signatures for the first eight; the last was an authorized ordinary zero-value Confirm. Post-demo v4 adds accepted-failure journal recovery; final hosted CI is still pending. CI39587599531 validates v3/70 tests, not this final v4/72-test revision. Evidence: https://github.com/ytao7420-cmyk/datasetcovenant/blob/main/docs/browser-demo-20261021.md
