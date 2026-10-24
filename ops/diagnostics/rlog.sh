#!/usr/bin/env bash
# Host resource sampler for dssh rlog. Survives container restarts: docker
# failures are logged and skipped, never fatal. Fsyncs so a hard reset keeps
# the last ticks.
set -u

out_dir="${DSSH_RLOG_DIR:-.}"
interval="${DSSH_RLOG_INTERVAL:-1}"
targets="${DSSH_RLOG_TARGETS:-}"
max_bytes="${DSSH_RLOG_HISTORY_MAX_BYTES:-16777216}"
mkdir -p "$out_dir"

latest="$out_dir/latest.txt"
history="$out_dir/history.log"
tmp="$out_dir/.latest.tmp"
pidfile="$out_dir/rlog.pid"
stats_file="$out_dir/.docker-stats.stream"
stats_pid=""
stats_key=""
gpu_cache="n/a"
gpu_skip_until=0

printf '%s\n' "$$" > "$pidfile"

now_s() {
  if [[ -n "${EPOCHREALTIME-}" ]]; then
    printf '%s' "$EPOCHREALTIME"
  else
    date +%s.%N
  fi
}

sleep_remaining() {
  local start="$1" remain
  remain="$(awk -v s="$start" -v i="$interval" -v n="$(now_s)" 'BEGIN {
    r = i - (n - s)
    if (r < 0.05) r = 0
    printf "%.3f", r
  }')"
  if awk -v r="$remain" 'BEGIN { exit !(r > 0) }'; then
    sleep "$remain" || true
  fi
}

stop_stats_stream() {
  local child
  if [[ -n "${stats_pid:-}" ]]; then
    kill "$stats_pid" 2>/dev/null || true
  fi
  while read -r child; do
    [[ -z "$child" ]] && continue
    kill "$child" 2>/dev/null || true
    kill -9 "$child" 2>/dev/null || true
  done < <(pgrep -P $$ -f 'docker stats' 2>/dev/null || true)
  if [[ -n "${stats_pid:-}" ]]; then
    kill -9 "$stats_pid" 2>/dev/null || true
    wait "$stats_pid" 2>/dev/null || true
  fi
  stats_pid=""
  stats_key=""
}

trap 'stop_stats_stream' EXIT INT TERM

ensure_stats_stream() {
  local key="$1"
  shift
  if [[ -n "$stats_pid" ]] && kill -0 "$stats_pid" 2>/dev/null && [[ "$stats_key" == "$key" ]]; then
    local size
    size="$(stat -c%s "$stats_file" 2>/dev/null || echo 0)"
    if [[ "$size" -lt 1048576 ]]; then
      return 0
    fi
  fi
  stop_stats_stream
  stats_key="$key"
  : > "$stats_file"
  if [[ $# -eq 0 || "$key" == "none" ]]; then
    return 0
  fi
  docker stats --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}|{{.PIDs}}' "$@" 2>/dev/null \
    | sed -u 's/\x1B\[[0-9;?]*[A-Za-z]//g' >>"$stats_file" &
  stats_pid=$!
}

latest_stats_line() {
  local n="$1"
  [[ -f "$stats_file" ]] || return 0
  awk -F'|' -v n="$n" '{
    gsub(/\033\[[0-9;?]*[A-Za-z]/, "")
    gsub(/\r/, "")
    if ($1 == n) line = $0
  } END { if (line != "") print line }' "$stats_file"
}

sample_gpu() {
  local now gpu
  now="${EPOCHSECONDS:-$(date +%s)}"
  if (( now < gpu_skip_until )); then
    printf '%s' "$gpu_cache"
    return 0
  fi
  gpu=""
  if command -v timeout >/dev/null 2>&1; then
    gpu="$(timeout 0.3 nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv,noheader 2>/dev/null | head -n1 || true)"
  else
    gpu="$(nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv,noheader 2>/dev/null | head -n1 || true)"
  fi
  if [[ -z "$gpu" || "$gpu" == *"failed"* || "$gpu" == *"NVIDIA-SMI"* ]]; then
    gpu_cache="n/a"
    gpu_skip_until=$((now + 30))
  else
    gpu_cache="$gpu"
    gpu_skip_until=$((now + 1))
  fi
  printf '%s' "$gpu_cache"
}

fsync_file() {
  local path="$1"
  if sync -d "$path" 2>/dev/null; then
    return 0
  fi
  sync "$path" 2>/dev/null || sync || true
}

rotate_history_if_needed() {
  local size stamp dest n
  [[ -f "$history" ]] || return 0
  size="$(stat -c%s "$history" 2>/dev/null || echo 0)"
  if [[ "$size" -lt "$max_bytes" ]]; then
    return 0
  fi
  fsync_file "$history"
  stamp="$(date +%Y-%m-%dT%H%M%S)"
  dest="$out_dir/history-$stamp.log"
  n=1
  while [[ -e "$dest" ]]; do
    dest="$out_dir/history-$stamp-$n.log"
    n=$((n + 1))
  done
  mv -f "$history" "$dest" 2>/dev/null || true
}

psi_avg10() {
  local file="$1"
  awk '{
    for (i = 1; i <= NF; i++) {
      if ($i ~ /^avg10=/) {
        split($i, a, "=")
        print a[2]
        exit
      }
    }
  }' "$file" 2>/dev/null || echo n/a
}

sample_system() {
  local stamp="${1:-$(date -Is)}"
  local mem_line swap_line disk gpu dirty
  mem_line="$(free -h 2>/dev/null | awk '/^Mem:/{printf "%s used / %s  avail %s", $3, $2, $7}')"
  swap_line="$(free -h 2>/dev/null | awk '/^Swap:/{printf "%s / %s", $3, $2}')"
  dirty="$(awk '/^Dirty:/{printf "%.1fMi", $2/1024}' /proc/meminfo 2>/dev/null || echo n/a)"
  disk="$(df -h / 2>/dev/null | awk 'NR==2{printf "%s used / %s (%s)", $3, $2, $5}')"
  gpu="$(sample_gpu)"

  echo "HOST"
  printf '  time   %s\n' "$stamp"
  printf '  load   %s\n' "$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null || echo n/a)"
  printf '  mem    %s  dirty %s\n' "${mem_line:-n/a}" "$dirty"
  printf '  swap   %s\n' "${swap_line:-n/a}"
  printf '  psi    cpu %s  mem %s  io %s\n' \
    "$(psi_avg10 /proc/pressure/cpu)" \
    "$(psi_avg10 /proc/pressure/memory)" \
    "$(psi_avg10 /proc/pressure/io)"
  printf '  disk   %s\n' "${disk:-n/a}"
  printf '  gpu    %s\n' "$gpu"
  printf '  fds    %s open\n' "$(awk '{print $1}' /proc/sys/fs/file-nr 2>/dev/null || echo n/a)"
  echo
  echo "TOP RSS"
  printf '  %-7s %8s %6s %6s  %s\n' PID RSS CPU% MEM% COMM
  ps -eo pid,rss,pcpu,pmem,comm --sort=-rss 2>/dev/null \
    | awk 'NR>1 && NR<=9 {printf "  %-7s %7sk %5s%% %5s%%  %s\n", $1, $2, $3, $4, $5}'
  echo
  local kernel
  kernel="$(dmesg -T --level=err,warn 2>/dev/null | tail -n 8 || true)"
  echo "KERNEL"
  if [[ -n "$kernel" ]]; then
    printf '%s\n' "$kernel" | sed 's/^/  /'
  else
    echo "  none"
  fi
  echo
}

sample_containers() {
  if [[ -z "$targets" ]]; then
    echo "CONTAINERS"
    echo "  (none configured — set dssh_rlog_containers)"
    echo
    return 0
  fi

  local live=() names=() aliases=() statuses=() inspect_names=()
  local pair alias name alt status inspect_out
  IFS=',' read -ra pairs <<< "$targets"
  for pair in "${pairs[@]}"; do
    pair="${pair#"${pair%%[![:space:]]*}"}"
    pair="${pair%"${pair##*[![:space:]]}"}"
    [[ -z "$pair" ]] && continue
    alias="${pair%%=*}"
    name="${pair#*=}"
    [[ -z "$name" ]] && name="$alias"
    alt="dssh-${alias}-start"
    aliases+=("$alias")
    names+=("$name")
    statuses+=("not running")
    inspect_names+=("$name")
    if [[ "$alt" != "$name" ]]; then
      inspect_names+=("$alt")
    fi
  done

  inspect_out=""
  if [[ ${#inspect_names[@]} -gt 0 ]]; then
    inspect_out="$(docker inspect -f '{{.Name}} {{.State.Status}}' "${inspect_names[@]}" 2>/dev/null || true)"
  fi

  local i found_name found_status
  for i in "${!aliases[@]}"; do
    name="${names[$i]}"
    alt="dssh-${aliases[$i]}-start"
    found_name=""
    found_status=""
    if [[ -n "$inspect_out" ]]; then
      found_status="$(printf '%s\n' "$inspect_out" | awk -v n="/$name" -v n2="$name" '
        $1==n || $1==n2 || substr($1,2)==n2 { print $2; exit }
      ')"
      if [[ -n "$found_status" ]]; then
        found_name="$name"
      elif [[ "$alt" != "$name" ]]; then
        found_status="$(printf '%s\n' "$inspect_out" | awk -v n="/$alt" -v n2="$alt" '
          $1==n || $1==n2 || substr($1,2)==n2 { print $2; exit }
        ')"
        if [[ -n "$found_status" ]]; then
          found_name="$alt"
        fi
      fi
    fi
    if [[ -n "$found_name" ]]; then
      names[$i]="$found_name"
      statuses[$i]="$found_status"
      if [[ "$found_status" == "running" ]]; then
        live+=("$found_name")
      fi
    fi
  done

  local stats="" line
  if [[ ${#live[@]} -gt 0 ]]; then
    ensure_stats_stream "${live[*]}" "${live[@]}"
    for name in "${live[@]}"; do
      line="$(latest_stats_line "$name")"
      if [[ -n "$line" ]]; then
        stats+="$line"$'\n'
      fi
    done
  else
    ensure_stats_stream none
  fi

  echo "CONTAINERS"
  printf '  %-10s %-12s %-11s %7s  %-22s %6s  %-14s %-14s %5s\n' \
    ALIAS NAME STATUS CPU MEM MEM% NET BLOCK PIDS
  local i cpu mem memp net blk pids line
  for i in "${!aliases[@]}"; do
    cpu="-" mem="-" memp="-" net="-" blk="-" pids="-"
    if [[ -n "$stats" ]]; then
      line="$(printf '%s\n' "$stats" | awk -F'|' -v n="${names[$i]}" '$1==n {print; exit}')"
      if [[ -n "$line" ]]; then
        IFS='|' read -r _ cpu mem memp net blk pids <<< "$line"
      fi
    fi
    printf '  %-10s %-12s %-11s %7s  %-22s %6s  %-14s %-14s %5s\n' \
      "${aliases[$i]}" "${names[$i]}" "${statuses[$i]}" "$cpu" "$mem" "$memp" "$net" "$blk" "$pids"
  done
  if [[ ${#live[@]} -gt 0 && -z "$stats" ]] && { [[ -z "$stats_pid" ]] || ! kill -0 "$stats_pid" 2>/dev/null; }; then
    echo "  (docker stats skipped — daemon busy or restarting)"
  fi
  echo
}

sample() {
  local stamp
  stamp="$(date -Is)"
  echo "===== $stamp pid=$$ ====="
  echo
  sample_containers
  sample_system "$stamp"
}

{
  echo "rlog started $(date -Is) interval=${interval}s dir=$out_dir targets=${targets:-none} history_max_bytes=$max_bytes"
} >> "$history"
fsync_file "$history"
rotate_history_if_needed

while true; do
  start="$(now_s)"
  if ! sample > "$tmp"; then
    printf '%s\n' "===== $(date -Is) pid=$$ =====" "sample failed" > "$tmp"
  fi
  printf '\n' >> "$tmp" || true
  fsync_file "$tmp"
  cat "$tmp" >> "$history" || true
  fsync_file "$history"
  rotate_history_if_needed
  mv -f "$tmp" "$latest" 2>/dev/null || true
  sleep_remaining "$start"
done
