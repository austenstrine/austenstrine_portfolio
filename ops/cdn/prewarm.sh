#!/bin/sh
# Pre-encode PeM stock image variants so first shopper traffic hits warm cache.
set -eu

BASE="${CDN_PREWARM_URL:-http://127.0.0.1:8088}"
ORIGIN="${CDN_ORIGIN_DIR:-/data/origin}"
STOCK_ROOT="${ORIGIN%/}/media/catalog/stock"

if [ ! -d "$STOCK_ROOT" ]; then
	echo "prewarm: no stock origin at $STOCK_ROOT (skip)"
	exit 0
fi

ok=0
fail=0
file_count=0

warm_one() {
	rel="$1"
	qs="$2"
	url="${BASE}${rel}?${qs}"
	if curl -fsS -o /dev/null --max-time 60 "$url"; then
		ok=$((ok + 1))
	else
		fail=$((fail + 1))
		echo "prewarm: fail $url" >&2
	fi
}

# shellcheck disable=SC2044
for file in $(find "$STOCK_ROOT" -type f \( -name 'hero.jpg' -o -name 'alt-1.jpg' -o -name 'alt-2.jpg' \) | sort); do
	file_count=$((file_count + 1))
	rel="${file#"$ORIGIN"}"
	rel="/${rel#/}"
	warm_one "$rel" 'w=160&h=160&fit=cover&q=72'
	warm_one "$rel" 'w=180&h=240&fit=cover&q=72'
	warm_one "$rel" 'w=192&h=128&fit=cover&q=72'
	warm_one "$rel" 'w=200&h=200&fit=cover&q=72'
	warm_one "$rel" 'w=480&h=288&fit=cover&q=70'
	warm_one "$rel" 'w=640&h=800&fit=cover&q=72'
	warm_one "$rel" 'w=800&h=800&fit=cover&q=72'
	warm_one "$rel" 'w=900&h=540&fit=cover&q=72'
	warm_one "$rel" 'w=1200&h=900&fit=cover&q=72'
	warm_one "$rel" 'w=1400&h=840&fit=cover&q=72'
done

if [ "$file_count" -eq 0 ]; then
	echo "prewarm: no stock JPEGs under $STOCK_ROOT (skip)"
	exit 0
fi

echo "prewarm: ok=$ok fail=$fail base=$BASE files=$file_count"
[ "$fail" -eq 0 ]
