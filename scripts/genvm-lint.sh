#!/usr/bin/env bash
# Real GenVM AST + pinned SDK validation; no wallet, keys, or chain writes.
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python_bin="${DATASETCOVENANT_PYTHON:-python3}"
cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}"
venv_dir="$cache_dir/datasetcovenant-ci/genvm-linter-28450e6"
export GENVM_REPO="genlayerlabs/genvm-manager"
export GENVM_VERSION="v0.6.0-rc10"
export GENVM_SOURCE_MODE="release"
bundle="$HOME/.cache/genvm-linter/genvm-universal-genlayerlabs-genvm-manager-${GENVM_VERSION}.tar.xz"
bundle_sha256="d3c6ba368dbd5cad01e484e19573906b4ffed41f46a48191bdc579c81cf801af"

"$python_bin" -c 'import sys; assert sys.version_info[:2] == (3, 12), "GenVM CI requires Python 3.12"'
if [[ ! -x "$venv_dir/bin/python" ]]; then
  "$python_bin" -m venv "$venv_dir"
fi
"$venv_dir/bin/python" -m pip install --disable-pip-version-check \
  'click==8.5.0' 'numpy==2.5.4' 'pyright==1.1.414' \
  'nodeenv==1.11.0' 'typing_extensions==4.16.0' \
  'genvm-linter @ git+https://github.com/genlayerlabs/genvm-linter.git@28450e665666300fc648dbe495110dfd0cb6a7b4'

mkdir -p "$(dirname "$bundle")"
if [[ ! -f "$bundle" ]]; then
  temporary_bundle="$(mktemp "${bundle}.XXXXXX")"
  trap 'rm -f "$temporary_bundle"' EXIT
  curl --fail --location --silent --show-error --retry 2 --max-time 600 \
    "https://github.com/${GENVM_REPO}/releases/download/${GENVM_VERSION}/genvm-universal.tar.xz" \
    --output "$temporary_bundle"
  "$venv_dir/bin/python" - "$temporary_bundle" "$bundle_sha256" <<'PY'
import hashlib
import sys
from pathlib import Path
actual = hashlib.file_digest(Path(sys.argv[1]).open("rb"), "sha256").hexdigest()
if actual != sys.argv[2]:
    raise SystemExit(f"GenVM release SHA-256 mismatch: {actual}")
PY
  mv "$temporary_bundle" "$bundle"
  trap - EXIT
fi
"$venv_dir/bin/python" - "$bundle" "$bundle_sha256" <<'PY'
import hashlib
import sys
from pathlib import Path
actual = hashlib.file_digest(Path(sys.argv[1]).open("rb"), "sha256").hexdigest()
if actual != sys.argv[2]:
    raise SystemExit(f"Cached GenVM release SHA-256 mismatch: {actual}")
PY

cd "$project_dir"
"$venv_dir/bin/genvm-lint" --version
"$venv_dir/bin/genvm-lint" check contracts/datasetcovenant.py --json
