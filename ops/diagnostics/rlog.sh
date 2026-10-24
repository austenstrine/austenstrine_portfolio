#!/usr/bin/env bash
# Host resource sampler for dssh rlog. Survives container restarts: docker
# failures are logged and skipped, never fatal. Fsyncs so a hard reset keeps
# the last ticks.
set -u

out_dir="${DSSH_RLOG_DIR:-.}"
interval="${DSSH_RLOG_INTERVAL:-5}"
targets="${DSSH_RLOG_TARGETS:-}"
max_bytes="${DSSH_RLOG_HISTORY_MAX_BYTES:-16777216}"
mkdir -p "$out_dir"

latest="$out_dir/latest.txt"
history="$out_dir/history.log"
tmp="$out_dir/.latest.tmp"
pidfile="$out_dir/rlog.pid"

printf '%s\n' "$$" > "$pidfile"

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

sample_system() {
  echo "-- uptime / load --"
  uptime 2>/dev/null || true
  echo
  echo "-- memory --"
  free -h 2>/dev/null || true
  echo
  echo "-- /proc/meminfo --"
  awk '/MemTotal|MemFree|MemAvailable|Buffers|Cached|SwapTotal|SwapFree|Dirty|Writeback|AnonPages|Slab|SReclaimable|Committed_AS|CommitLimit/{print}' /proc/meminfo 2>/dev/null || true
  echo
  echo "-- pressure --"
  echo "cpu:    $(tr '\n' ' ' < /proc/pressure/cpu 2>/dev/null || echo n/a)"
  echo "memory: $(tr '\n' ' ' < /proc/pressure/memory 2>/dev/null || echo n/a)"
  echo "io:     $(tr '\n' ' ' < /proc/pressure/io 2>/dev/null || echo n/a)"
  echo
  echo "-- vmstat --"
  vmstat -w 2>/dev/null | tail -n 2 || true
  echo
  echo "-- top RSS --"
  ps -eo pid,ppid,rss,vsz,pcpu,pmem,comm,args --sort=-rss 2>/dev/null | awk 'NR==1 || NR<=16 {printf "%s\n", $0}' || true
  echo
  echo "-- gpu --"
  nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu,power.draw --format=csv 2>/dev/null || echo 'nvidia-smi n/a'
  echo
  echo "-- disk --"
  df -h / /home 2>/dev/null | awk 'NR==1 || /\/$|\/home/' || true
  echo
  echo "-- fd / inotify --"
  echo "fs.file-nr $(cat /proc/sys/fs/file-nr 2>/dev/null || echo n/a)"
  echo "inotify max_user_watches $(cat /proc/sys/fs/inotify/max_user_watches 2>/dev/null || echo n/a)"
  echo
  echo "-- dmesg tail --"
  dmesg -T --level=err,warn 2>/dev/null | tail -n 25 || journalctl -k -n 15 --no-pager 2>/dev/null || true
  echo
}

sample_containers() {
  if [[ -z "$targets" ]]; then
    return 0
  fi

  echo "-- containers --"
  local live=()
  local pair alias name alt status
  IFS=',' read -ra pairs <<< "$targets"
  for pair in "${pairs[@]}"; do
    pair="${pair#"${pair%%[![:space:]]*}"}"
    pair="${pair%"${pair##*[![:space:]]}"}"
    [[ -z "$pair" ]] && continue
    alias="${pair%%=*}"
    name="${pair#*=}"
    [[ -z "$name" ]] && name="$alias"
    alt="dssh-${alias}-start"
    status=""
    if docker inspect -f '{{.State.Status}}' "$name" >/dev/null 2>&1; then
      status="$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || true)"
      echo "$alias ($name): ${status:-unknown}"
      if [[ "$status" == "running" ]]; then
        live+=("$name")
      fi
    elif [[ "$alt" != "$name" ]] && docker inspect -f '{{.State.Status}}' "$alt" >/dev/null 2>&1; then
      status="$(docker inspect -f '{{.State.Status}}' "$alt" 2>/dev/null || true)"
      echo "$alias ($alt): ${status:-unknown}"
      if [[ "$status" == "running" ]]; then
        live+=("$alt")
      fi
    else
      echo "$alias ($name): not running"
    fi
  done
  echo

  if [[ ${#live[@]} -eq 0 ]]; then
    echo "-- container stats --"
    echo "none running"
    echo
    return 0
  fi

  echo "-- container stats --"
  if command -v timeout >/dev/null 2>&1; then
    timeout 8 docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}' "${live[@]}" 2>/dev/null \
      || echo "docker stats skipped (docker busy or restarting)"
  else
    docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}' "${live[@]}" 2>/dev/null \
      || echo "docker stats skipped (docker busy or restarting)"
  fi
  echo
}

sample() {
  echo "===== $(date -Is) pid=$$ ====="
  echo
  sample_system
  sample_containers
}

{
  echo "rlog started $(date -Is) interval=${interval}s dir=$out_dir targets=${targets:-none} history_max_bytes=$max_bytes"
} >> "$history"
fsync_file "$history"
rotate_history_if_needed

while true; do
  snapshot="$(sample)" || snapshot="===== $(date -Is) pid=$$ ====="$'\n'"sample failed"
  printf '%s\n\n' "$snapshot" > "$tmp" || true
  fsync_file "$tmp"
  mv -f "$tmp" "$latest" 2>/dev/null || true
  printf '%s\n\n' "$snapshot" >> "$history" || true
  fsync_file "$history"
  rotate_history_if_needed
  sleep "$interval" || true
done
