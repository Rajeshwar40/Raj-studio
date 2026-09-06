#!/usr/bin/env bash
# Raj Studio — one-shot launcher.
# Starts the ACE-Step FastAPI backend and the Raj Studio web frontend together.
# Ctrl-C stops both cleanly.
#
# Env overrides:
#   RAJ_BACKEND_PORT   (default 8001) — API server port
#   RAJ_FRONTEND_PORT  (default 5173) — Vite dev server port
#   RAJ_SKIP_BACKEND=1                — only run the frontend
#   RAJ_SKIP_FRONTEND=1               — only run the backend
#   RAJ_BACKEND_SCRIPT                — override the backend launcher path
#   VITE_API_URL                      — passed to the frontend (default derived)

set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$REPO_DIR/frontend"
LOG_DIR="$REPO_DIR/.raj-studio-logs"
mkdir -p "$LOG_DIR"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

BACKEND_PORT="${RAJ_BACKEND_PORT:-${ACESTEP_API_PORT:-8001}}"
FRONTEND_PORT="${RAJ_FRONTEND_PORT:-5173}"
API_URL_DEFAULT="http://127.0.0.1:$BACKEND_PORT"
export VITE_API_URL="${VITE_API_URL:-$API_URL_DEFAULT}"
export ACESTEP_API_PORT="$BACKEND_PORT"

# --------- pretty output helpers -------------------------------------------
BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
CYAN=$'\033[36m'; PURPLE=$'\033[35m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'

log()   { printf "%s[raj-studio]%s %s\n" "$CYAN" "$RESET" "$*"; }
warn()  { printf "%s[raj-studio]%s %s\n" "$YELLOW" "$RESET" "$*" >&2; }
error() { printf "%s[raj-studio]%s %s\n" "$RED" "$RESET" "$*" >&2; }

banner() {
  printf "\n%s%s╭──────────────────────────────────────────╮%s\n" "$BOLD" "$PURPLE" "$RESET"
  printf   "%s%s│           Raj Studio launcher            │%s\n" "$BOLD" "$PURPLE" "$RESET"
  printf   "%s%s│   Developed by Rajeshwar Singh · v1.0    │%s\n" "$BOLD" "$PURPLE" "$RESET"
  printf   "%s%s╰──────────────────────────────────────────╯%s\n\n" "$BOLD" "$PURPLE" "$RESET"
}

# --------- pick the right backend launcher for the host --------------------
detect_backend_script() {
  if [[ -n "${RAJ_BACKEND_SCRIPT:-}" ]]; then
    printf "%s" "$RAJ_BACKEND_SCRIPT"
    return
  fi
  case "$(uname -s)" in
    Darwin)  printf "%s" "$REPO_DIR/start_api_server_macos.sh" ;;
    Linux)   printf "%s" "$REPO_DIR/start_api_server.sh" ;;
    MINGW*|MSYS*|CYGWIN*) printf "%s" "$REPO_DIR/start_api_server.bat" ;;
    *)       printf "%s" "$REPO_DIR/start_api_server.sh" ;;
  esac
}

# --------- process management ----------------------------------------------
BACKEND_PID=""
FRONTEND_PID=""
BACKEND_TAIL_PID=""
FRONTEND_TAIL_PID=""
SHUTTING_DOWN=0

kill_tree() {
  local pid="$1"
  [[ -z "$pid" ]] && return 0
  # Kill all descendants first, then the process itself.
  if command -v pkill >/dev/null 2>&1; then
    pkill -TERM -P "$pid" 2>/dev/null || true
  fi
  kill -TERM "$pid" 2>/dev/null || true
}

hard_kill_tree() {
  local pid="$1"
  [[ -z "$pid" ]] && return 0
  if command -v pkill >/dev/null 2>&1; then
    pkill -KILL -P "$pid" 2>/dev/null || true
  fi
  kill -KILL "$pid" 2>/dev/null || true
}

cleanup() {
  if [[ "$SHUTTING_DOWN" == "1" ]]; then return; fi
  SHUTTING_DOWN=1
  echo
  log "Shutting down…"
  # Stop the log tails so they don't keep the terminal busy.
  [[ -n "$BACKEND_TAIL_PID"  ]] && kill "$BACKEND_TAIL_PID"  2>/dev/null || true
  [[ -n "$FRONTEND_TAIL_PID" ]] && kill "$FRONTEND_TAIL_PID" 2>/dev/null || true

  kill_tree "$FRONTEND_PID"
  kill_tree "$BACKEND_PID"

  # Give them a moment to exit gracefully, then hard-kill anything left.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    local alive=0
    for pid in "$FRONTEND_PID" "$BACKEND_PID"; do
      if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then alive=1; fi
    done
    [[ "$alive" == "0" ]] && break
    sleep 0.3
  done
  hard_kill_tree "$FRONTEND_PID"
  hard_kill_tree "$BACKEND_PID"
  log "Bye."
}
trap cleanup INT TERM EXIT

# --------- frontend deps ---------------------------------------------------
prepare_frontend() {
  if [[ ! -d "$FRONTEND_DIR" ]]; then
    error "frontend/ directory not found at $FRONTEND_DIR"
    exit 1
  fi
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    error "Node.js and npm are required. Install Node 18+ from https://nodejs.org and re-run."
    exit 1
  fi
  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    log "Installing frontend dependencies (first run)…"
    (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund --loglevel=error)
  fi
  if [[ ! -f "$FRONTEND_DIR/.env.local" && -f "$FRONTEND_DIR/.env.example" ]]; then
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env.local"
    if command -v sed >/dev/null 2>&1; then
      sed -i.bak "s|^VITE_API_URL=.*|VITE_API_URL=$VITE_API_URL|" "$FRONTEND_DIR/.env.local" 2>/dev/null || true
      rm -f "$FRONTEND_DIR/.env.local.bak"
    fi
    log "Created frontend/.env.local (edit it to change the backend URL)."
  fi
}

# --------- port helpers ----------------------------------------------------
# Returns 0 if a TCP listener is bound to $1 on 127.0.0.1, else 1.
port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -i "TCP:$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
  elif command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
  else
    return 1
  fi
}

# --------- backend launcher ------------------------------------------------
start_backend() {
  # If something is already listening on the backend port, decide what to do.
  if port_in_use "$BACKEND_PORT"; then
    if curl -sSf -o /dev/null --max-time 3 "$API_URL_DEFAULT/health" 2>/dev/null; then
      log "${YELLOW}An ACE-Step backend is already running on port $BACKEND_PORT — reusing it.${RESET}"
      log "  (To force a fresh backend: ${BOLD}lsof -ti :$BACKEND_PORT | xargs kill; ./start.sh${RESET})"
      BACKEND_PID=""
      return 0
    else
      error "Port $BACKEND_PORT is already in use but /health is not responding."
      error "Something non-ACE-Step is holding the port. Free it or run with a different port:"
      error "  ${BOLD}lsof -i :$BACKEND_PORT${RESET}                # see what's using it"
      error "  ${BOLD}RAJ_BACKEND_PORT=8010 ./start.sh${RESET}      # or use a different port"
      exit 1
    fi
  fi

  local script
  script="$(detect_backend_script)"
  if [[ ! -f "$script" ]]; then
    error "Backend launcher not found: $script"
    error "Set RAJ_BACKEND_SCRIPT to the path of your ACE-Step launcher, or use RAJ_SKIP_BACKEND=1."
    exit 1
  fi
  chmod +x "$script" 2>/dev/null || true
  : > "$BACKEND_LOG"
  log "Starting backend  → ${BOLD}$API_URL_DEFAULT${RESET}  ${DIM}(logs: $BACKEND_LOG)${RESET}"

  # Background the launcher directly; capture all output to a log file, and
  # tee to the terminal in the foreground so the user sees progress.
  "$script" >>"$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!

  # Stream the backend log to the terminal with a prefix.
  ( tail -F "$BACKEND_LOG" 2>/dev/null | sed -u "s/^/${DIM}[backend]${RESET} /" ) &
  BACKEND_TAIL_PID=$!
}

# --------- frontend launcher -----------------------------------------------
start_frontend() {
  if port_in_use "$FRONTEND_PORT"; then
    error "Port $FRONTEND_PORT is already in use. Free it or pick another port:"
    error "  ${BOLD}lsof -ti :$FRONTEND_PORT | xargs kill${RESET}"
    error "  ${BOLD}RAJ_FRONTEND_PORT=3000 ./start.sh${RESET}"
    exit 1
  fi
  : > "$FRONTEND_LOG"
  log "Starting frontend → ${BOLD}http://localhost:$FRONTEND_PORT${RESET}  ${DIM}(logs: $FRONTEND_LOG)${RESET}"

  # Run npm run dev in the background. Force Vite to print (no clear-screen)
  # and stream via a log file so we always see what it says.
  (
    cd "$FRONTEND_DIR"
    exec npm run dev -- --port "$FRONTEND_PORT" --strictPort --host --clearScreen false
  ) >>"$FRONTEND_LOG" 2>&1 &
  FRONTEND_PID=$!

  ( tail -F "$FRONTEND_LOG" 2>/dev/null | sed -u "s/^/${DIM}[frontend]${RESET} /" ) &
  FRONTEND_TAIL_PID=$!
}

# --------- wait for backend /health ----------------------------------------
wait_for_backend() {
  # If start_backend reused an existing server, BACKEND_PID is empty and we
  # already confirmed /health responds — nothing to wait for.
  if [[ -z "$BACKEND_PID" ]]; then
    return 0
  fi
  local url="$API_URL_DEFAULT/health"
  local waited=0
  local budget=180
  log "Waiting for backend at $url …"
  while (( waited < budget )); do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      error "Backend process exited early. Last lines of $BACKEND_LOG:"
      tail -n 40 "$BACKEND_LOG" >&2 || true
      return 1
    fi
    if curl -sSf -o /dev/null --max-time 2 "$url" 2>/dev/null; then
      log "${GREEN}Backend is up.${RESET}"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done
  warn "Backend did not respond within ${budget}s. Continuing anyway — the frontend will show 'Offline' until it is ready."
  return 0
}

# --------- wait for Vite dev server ready ----------------------------------
wait_for_frontend() {
  local waited=0
  local budget=60
  while (( waited < budget )); do
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
      error "Frontend process exited early. Last lines of $FRONTEND_LOG:"
      tail -n 40 "$FRONTEND_LOG" >&2 || true
      return 1
    fi
    if curl -sSf -o /dev/null --max-time 2 "http://127.0.0.1:$FRONTEND_PORT/" 2>/dev/null; then
      log "${GREEN}Frontend is up.${RESET}"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  warn "Frontend did not respond within ${budget}s. Check $FRONTEND_LOG."
  return 1
}

# --------- go --------------------------------------------------------------
banner

if [[ "${RAJ_SKIP_BACKEND:-0}" != "1" ]]; then
  start_backend
  wait_for_backend || true
else
  log "RAJ_SKIP_BACKEND=1 — not starting the backend."
fi

if [[ "${RAJ_SKIP_FRONTEND:-0}" != "1" ]]; then
  prepare_frontend
  start_frontend
  if ! wait_for_frontend; then
    error "Frontend failed to start. Cleaning up."
    exit 1
  fi
else
  log "RAJ_SKIP_FRONTEND=1 — not starting the frontend."
fi

echo
log "${GREEN}Raj Studio is running.${RESET}"
log "  ${BOLD}Frontend:${RESET} http://localhost:$FRONTEND_PORT"
log "  ${BOLD}Backend :${RESET} $API_URL_DEFAULT"
log "  ${BOLD}Docs    :${RESET} $API_URL_DEFAULT/docs"
log "Press Ctrl-C to stop everything."
echo

# Supervisor loop: watch both children; if either dies, log why and exit.
while true; do
  if [[ -n "$BACKEND_PID" ]] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    error "Backend process exited. Tail of $BACKEND_LOG:"
    tail -n 30 "$BACKEND_LOG" >&2 || true
    exit 1
  fi
  if [[ -n "$FRONTEND_PID" ]] && ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    error "Frontend process exited. Tail of $FRONTEND_LOG:"
    tail -n 30 "$FRONTEND_LOG" >&2 || true
    exit 1
  fi
  sleep 2
done
