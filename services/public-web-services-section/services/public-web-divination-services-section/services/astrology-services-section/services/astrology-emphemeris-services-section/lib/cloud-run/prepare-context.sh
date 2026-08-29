#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
gateway_dir=$(CDPATH= cd -- "$script_dir/../.." && pwd)
context_dir=${1:-}
registry=${NPM_REGISTRY:-http://127.0.0.1:4873/}

if [[ -z "$context_dir" || "$context_dir" != /tmp/* ]]; then
  echo "usage: $0 /tmp/exact-build-context" >&2
  exit 64
fi
if [[ ! -f "$gateway_dir/package-lock.json" ]]; then
  echo "gateway package-lock.json is required; generate it only from the published release closure" >&2
  exit 66
fi
if [[ -e "$context_dir" ]] && [[ -n "$(find "$context_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo "build context must be empty: $context_dir" >&2
  exit 73
fi

mkdir -p "$context_dir/app"
cp "$gateway_dir/package.json" "$gateway_dir/package-lock.json" "$context_dir/app/"
cp -R "$gateway_dir/src" "$context_dir/app/src"

npm ci --prefix "$context_dir/app" --omit=dev --ignore-scripts --registry "$registry"
npm ls --prefix "$context_dir/app" --omit=dev --all >/dev/null

if find "$context_dir/app/node_modules" -type l ! -path '*/node_modules/.bin/*' -print -quit | grep -q .; then
  echo "refusing linked dependency in deployment closure" >&2
  exit 65
fi
if find "$context_dir/app/node_modules" -type f -name '*.node' -print -quit | grep -q .; then
  echo "refusing host-built native module in prepared deployment closure" >&2
  exit 65
fi

cp "$script_dir/Dockerfile" "$context_dir/Dockerfile"
cp "$script_dir/cloudbuild.yaml" "$context_dir/cloudbuild.yaml"
printf '%s\n' "$context_dir"
