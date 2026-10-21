# Reproducible verification

## Final repair and browser evidence — 2026-10-21

[run 39590096882](https://github.com/ytao7420-cmyk/datasetcovenant/actions/runs/39590096882) passed for public commit `90b2d28e6240bf91b81e3e0116e9f342e8b9241d`. The hosted job completed successfully: official GenVM AST/exact-SDK validation, 23 Python tests, 72 JavaScript tests, production build, original archive verification, strict current-browser evidence verification (79 checks, nine finalized receipts, no pending evidence), and log upload. The corresponding browser code is published as Site v4, source `0b14048a652e2fcb3d8241b080d9e7a71d3ba5c3`; it uses the unchanged contract. The nine wallet calls are documented accurately as v2/v3 observations, followed by the v4 recovery correction. This section is a documentation-only follow-up to that verified source/evidence commit.

## Historical baseline — 2026-10-21

[Run 39582144118](https://github.com/ytao7420-cmyk/datasetcovenant/actions/runs/39582144118) completed with `success` for code commit `d0d3dc7fab7fbadb704418c991d8381593fc678c` on the public `main` branch. Official GenVM lint/exact SDK validation, 23 Python tests, 69 JavaScript tests, production build, archive verification and log upload all passed on the hosted Ubuntu runner. This records an actual completed run, not only a workflow declaration.

## Workflow

The public [DatasetCovenant verification workflow](https://github.com/ytao7420-cmyk/datasetcovenant/actions/workflows/verify.yml) runs on every `main` or `codex/**` push, pull request, and manual dispatch. Its six required steps are:

1. **Official GenVM check:** AST safety checks and semantic/schema validation with the SDK selected by the existing contract's pinned `py-genlayer` header.
2. **Contract tests:** deterministic invariants under the explicitly mocked HTTP/model/consensus runtime in `tests/test_contract.py`.
3. **JavaScript tests:** evidence integrity, provenance presentation, receipt lifecycle, readback, and recovery regressions.
4. **Production build:** Vite compiles the browser application.
5. **Public archive verification:** rehash and validate the original checked-in evidence and receipt references.
6. **Current browser evidence:** strictly verify all nine recorded raw/decoded receipts, exact ABI, final states, rejection-time null acknowledgement, actual downloaded envelopes and pure-page screenshot hashes (`npm run verify:browser`). This is an offline check of recorded public evidence, not a new browser run or fresh RPC authentication.

Each command must exit successfully. `pipefail` preserves failures while saving logs as the commit-specific `verification-<sha>` artifact. The workflow does not run `npm run live`, sign transactions, handle private keys, or deploy a website. A passing run verifies the checked-out source and archived evidence; it does not replace a current production browser-wallet demonstration.

## Pinned inputs

- Node.js **24.19.0**, Python **3.12.14**, Ubuntu **24.04**. JavaScript dependencies use `npm ci` and `package-lock.json`.
- [Official `genlayerlabs/genvm-linter` source](https://github.com/genlayerlabs/genvm-linter/tree/28450e665666300fc648dbe495110dfd0cb6a7b4), commit **28450e665666300fc648dbe495110dfd0cb6a7b4**, package **0.11.1rc2**. The official [`check` implementation](https://github.com/genlayerlabs/genvm-linter/blob/28450e665666300fc648dbe495110dfd0cb6a7b4/src/genvm_linter/cli.py) combines AST linting and SDK validation. This is not `py_compile` or a replacement linter.
- Its runtime dependencies are fixed in `scripts/genvm-lint.sh`: Click **8.5.0**, NumPy **2.5.4**, Pyright **1.1.414**, Nodeenv **1.11.0**, and typing-extensions **4.16.0**.
- [Official GenVM manager release **v0.6.0-rc10**](https://github.com/genlayerlabs/genvm-manager/releases/tag/v0.6.0-rc10), `genvm-universal.tar.xz`. SHA-256: **d3c6ba368dbd5cad01e484e19573906b4ffed41f46a48191bdc579c81cf801af**. The script verifies both a new download and any cached copy before the official linter uses it. `GENVM_VERSION` and `GENVM_REPO` are fixed; there is no moving `latest` lookup. The contract runner hash is unchanged.
- All third-party GitHub Actions are pinned by commit SHA in the workflow.

The bundle checksum was obtained from the official release's GitHub asset digest and `SHA256SUMS`. A missing, changed, or corrupt bundle fails the run; validation is never silently skipped.

## Run locally

With Python 3.12 and Node.js 24.19.0 on `PATH`:

```sh
npm ci
bash scripts/genvm-lint.sh
npm run test:contract
npm test
npm run build
npm run verify
npm run verify:browser
```

Set `DATASETCOVENANT_PYTHON` to a Python 3.12 executable when `python3` points to another version. The linter uses an isolated cache virtual environment, and the official runner bundle is cached under `~/.cache/genvm-linter`. The first run downloads approximately 326 MB. No secrets are required.

For an audit, use a successful public workflow run for the exact revision being submitted and link its run URL in the resubmission notes. Do not cite an unexecuted workflow file as a successful hosted run.

## Local tool validation on 2026-10-21

The pinned official `genvm-lint check contracts/datasetcovenant.py --json` completed with `ok: true`: three AST checks and successful SDK validation of `DatasetCovenant` (six public methods: two views and four writes, zero constructor parameters). It reported informational `I200` because the release also contains a newer runner. The check still resolved the contract's exact existing `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` SDK from the release's legacy runner set. No contract source or runner header was changed to obtain this result. This local result is separate from the required public hosted CI run.
