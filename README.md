# DatasetCovenant

A usable research review desk built around a GenLayer Intelligent Contract. A researcher freezes the intended statistical use of a dataset before a different analyst captures official metadata. Validators independently assess whether the definition supports the intended population, construct and exclusions; deterministic code checks geography and non-null year coverage. The researcher acknowledges the exact assessment digest. A revision is a separate immutable covenant and cannot inherit the old acknowledgement.

This is a **metadata-use attestation**, not a certificate of data accuracy, representativeness, scientific fitness or causality. The bounded first adapter covers World Bank WDI `SL.UEM.TOTL.ZS` (modeled ILO unemployment estimate), USA annual records for 2020–2023. All demonstration use cases and account roles are project-controlled synthetic scenarios.

## Run

Node 22+ and Python 3. Install with `npm ci`, then `npm run dev`. `npm run build` produces `dist/`. No backend or API secret is required. The browser uses `genlayer-js@1.1.8`, GenLayer Studionet (61999), and an explicitly selected MetaMask provider. No private key is placed in browser assets.

- Recorded evidence: inspect actual archived chain state, citations and transaction links, without connecting a wallet. An absent archive is shown as unavailable, never simulated success.
- Live workspace: read a covenant by researcher address and ID, or connect the researcher wallet to commit a new intent. Switch to the nominated analyst account to capture official sources and request assessment. Switch back to the researcher to acknowledge the exact result. Every write is zero-value and uses `leaderOnly:false`.
- Acknowledgement records that the researcher received the result. It does **not** turn `CONTRADICTED` or `UNKNOWN` into support.

## Reproduce

```
npm test
npm run test:contract
npm run plan
```

Plan mode sends no transaction and creates no wallet. `npm run source` fetches fresh public official metadata and series into `public/evidence/`; changed hashes require a new covenant. After source/code review, the explicit harness can deploy with `node scripts/live-test.mjs --deploy --source-sha=<reviewed SHA256>` and run with `node scripts/live-test.mjs --run`. Add `--negative` to record an actual rejected old-digest acknowledgement on the revision. Harness private test keys and resumable broadcast journals remain in ignored `.local/` with restrictive permissions. Never publish that directory.

See [architecture](docs/architecture.md), [validation](docs/validation.md), and the [submission draft](docs/submission-draft.md). Source bytes, hashes, deployed address and recorded evidence are public files. State that has not yet been recorded on chain is not represented as proven.

## Official sources

- https://api.worldbank.org/v2/indicator/SL.UEM.TOTL.ZS?format=json
- https://api.worldbank.org/v2/country/USA/indicator/SL.UEM.TOTL.ZS?format=json&date=2020:2023&per_page=100

The source note defines unemployment relative to the labor force. The indicator name identifies a modeled ILO estimate. These fields do not establish undocumented demographic coverage, measurement accuracy or causal research design. Raw numeric observations are retained as source evidence; this app uses their presence, including genuine zero values, only for year-coverage checks.
