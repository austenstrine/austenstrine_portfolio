#!/usr/bin/env bash
# postToolUse (Write|StrReplace|Edit): LOG-ONLY admin-crm remind on CRM-boundary paths.
# Fail-open. No additional_context (avoids clobbering host prefs-skills).
# No injection on PeM vendor UI (apps/web PeM) or shared ambiguous files.
set -u
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="${HOOK_DIR}/state"
mkdir -p "${STATE_DIR}" 2>/dev/null || true
LOG="${STATE_DIR}/admin-crm.log"

node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => { raw += c; });
process.stdin.on("end", () => {
  const empty = () => { process.stdout.write("{}"); };
  try {
    const j = JSON.parse(raw || "{}");
    const tool = String(j.tool_name || j.toolName || "");
    if (!/^(Write|StrReplace|Edit)$/.test(tool)) {
      empty();
      return;
    }
    const input = j.tool_input || j.toolInput || j.input || {};
    const path = String(
      input.path || input.file_path || input.filePath || input.target_file || ""
    ).replace(/\\/g, "/");
    if (!path) {
      empty();
      return;
    }
    // Strict allowlist — never apps/web PeM vendor UI; never shared nginx/compose.
    const hit =
      /(^|\/)apps\/crm(\/|$)/.test(path) ||
      /(^|\/)apps\/api\/src\/common\/app-origins(\.spec)?\.ts$/.test(path) ||
      /(^|\/)apps\/api\/src\/modules\/catalog\/guards\/crm-origin\.guard(\.spec)?\.ts$/.test(path) ||
      /(^|\/)ops\/tooling\/prefs-lint\/crm-boundary\.check\.sh$/.test(path);
    if (!hit) {
      empty();
      return;
    }
    const msg = [
      "[admin-crm hook]",
      "CRM-boundary path edit.",
      "Open skill admin-crm (~/.agents/skills/admin-crm/SKILL.md):",
      "separate apps/crm (not PeM vendor UI); admin routes CRM-origin only",
      "(crm.austenstrine.dev / crm.local.austenstrine.dev)."
    ].join(" ");
    process.stderr.write(msg + "\n");
    empty();
  } catch {
    empty();
  }
});
' 2>>"${LOG}" || printf '%s\n' '{}'
exit 0
