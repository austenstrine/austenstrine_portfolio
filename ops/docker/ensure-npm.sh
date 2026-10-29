#!/bin/sh
# Upgrade the npm CLI when a newer release is available for this Node major.
# npm's "new major available" notice can advertise versions that require a
# newer Node (e.g. npm 12 on Node 20); pick a line that matches engines.
set -eu

current="$(npm -v)"
node_major="$(node -p 'process.versions.node.split(".")[0]')"

case "$node_major" in
	20)
		# Stay on npm 10 for Node 20 images: npm 11+ ships a node-gyp that
		# tries to fetch headers at build time and can fail offline/flaky nets.
		# npm 12 requires Node 22+, despite the "new major available" notice.
		range='10'
		;;
	22|24|26)
		range=''
		;;
	*)
		range='10'
		;;
esac

if [ -z "$range" ]; then
	desired="$(npm view npm version 2>/dev/null || true)"
else
	# Older npm returns every matching version (plain or JSON array).
	desired="$(
		npm view "npm@${range}" version --json 2>/dev/null \
			| node -e '
				let raw = "";
				process.stdin.on("data", (chunk) => { raw += chunk; });
				process.stdin.on("end", () => {
					raw = raw.trim();
					if(!raw) {
						process.exit(0);
					}
					const parsed = JSON.parse(raw);
					const list = Array.isArray(parsed) ? parsed : [parsed];
					const last = list[list.length - 1];
					if(last) {
						process.stdout.write(String(last));
					}
				});
			' \
			|| true
	)"
fi

if [ -z "$desired" ]; then
	echo "ensure-npm: registry unavailable; keeping npm ${current}"
	exit 0
fi

if [ "$current" = "$desired" ]; then
	echo "ensure-npm: npm ${current} is current for Node ${node_major}"
	exit 0
fi

echo "ensure-npm: updating npm ${current} -> ${desired} (Node ${node_major})"
if npm install -g "npm@${desired}"; then
	echo "ensure-npm: now $(npm -v)"
	exit 0
fi

echo "ensure-npm: update to ${desired} failed; keeping ${current}" >&2
exit 0
