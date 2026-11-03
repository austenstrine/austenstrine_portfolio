#!/usr/bin/env bash
# Clone/update github.com/austenstrine/golang-image-cdn into ops/cdn/src
# for the thin Dockerfile build context. Idempotent — safe under live.sh.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src_dir="${CDN_SOURCE_DIR:-$script_dir/src}"
repo_url="${CDN_SOURCE_REPO:-https://github.com/austenstrine/golang-image-cdn.git}"
ref="${CDN_SOURCE_REF:-master}"

mkdir -p "$(dirname "$src_dir")"

if [[ ! -d "$src_dir/.git" ]]; then
	echo "ensure-cdn-source: cloning ${repo_url}@${ref} → ${src_dir}"
	rm -rf "$src_dir"
	git clone --depth 1 --branch "$ref" "$repo_url" "$src_dir"
else
	echo "ensure-cdn-source: updating ${src_dir} to origin/${ref}"
	git -C "$src_dir" remote set-url origin "$repo_url"
	git -C "$src_dir" fetch --depth 1 origin "$ref"
	git -C "$src_dir" checkout -q --detach "FETCH_HEAD"
fi

if [[ ! -f "$src_dir/go.mod" || ! -f "$src_dir/Dockerfile" ]]; then
	echo "ensure-cdn-source: ${src_dir} is missing go.mod/Dockerfile" >&2
	exit 1
fi

echo "ensure-cdn-source: ready $(git -C "$src_dir" rev-parse --short HEAD) (${ref})"
