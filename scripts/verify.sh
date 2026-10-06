#!/usr/bin/env bash
# The single verification entry point: data checks, production build (Pages + Vercel),
# check-site.rb, htmlproofer and the browser smoke test.
#
#   bash scripts/verify.sh
#
# Exit status (also printed on the final RESULT line):
#   0  PASSED      every step ran and passed
#   1  FAILED      at least one step failed
#   2  INCOMPLETE  nothing failed, but a required step could not run in this environment
#                  (e.g. no browser, or cdn.jsdelivr.net unreachable). Never report INCOMPLETE as verified.
#
# Environment:
#   VERIFY_DIR            absolute output directory (default: new temp dir)
#   VERIFY_VERCEL_URL     origin used for the Vercel build check (default: https://qlog-verification.example)
#   VERIFY_VERBOSE=1      stream every step's output instead of showing it only on failure
#   VERIFY_SKIP_BROWSER=1 skip the browser smoke test (result is then INCOMPLETE, by design)
#   QLOG_PLAYWRIGHT_DIR   directory whose node_modules contains playwright (CI); otherwise it is
#                         resolved from node, or installed into a temp dir outside the checkout
#   CHROME_EXECUTABLE     Chromium binary (default: /opt/pw-browsers/chromium if present)
#   SCREENSHOT_DIR        where smoke screenshots go (default: $VERIFY_DIR/screenshots)
set -uo pipefail
cd "$(dirname "$0")/.."
QLOG_ROOT="$PWD"
# Keep Bundler configuration/cache rooted in the checkout while building isolated sources.
export BUNDLE_GEMFILE="$QLOG_ROOT/Gemfile"
# Chinese file names need a UTF-8 locale; Jekyll fails with an encoding error otherwise.
case "${LC_ALL:-${LANG:-}}" in
  *UTF-8*|*utf-8*|*UTF8*|*utf8*) ;;
  *) export LANG=C.UTF-8 LC_ALL=C.UTF-8 ;;
esac

QLOG_VERIFY_DIR="${VERIFY_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/qlog-verify.XXXXXX")}"
mkdir -p "$QLOG_VERIFY_DIR"
LOG_DIR="$QLOG_VERIFY_DIR/logs"; mkdir -p "$LOG_DIR"
PAGES_ORIGIN="https://cupidryan2-art.github.io"
VERCEL_ORIGIN="${VERIFY_VERCEL_URL:-https://qlog-verification.example}"
NAMES=(); STATUS=(); NOTES=()
SERVER_PID=""
trap '[ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null' EXIT

record() { NAMES+=("$1"); STATUS+=("$2"); NOTES+=("${3:-}"); printf '%-5s %s%s\n' "$2" "$1" "${3:+  — $3}"; }
skip() { record "$1" SKIP "$2"; }
step() { # step <name> <command...>
  local name=$1 rc log; shift
  log="$LOG_DIR/$(printf '%02d' "${#NAMES[@]}")-$name.log"
  if [ "${VERIFY_VERBOSE:-0}" = 1 ]; then "$@" 2>&1 | tee "$log"; rc=${PIPESTATUS[0]}
  else "$@" >"$log" 2>&1; rc=$?; fi
  if [ "$rc" -eq 0 ]; then record "$name" PASS
  else
    record "$name" FAIL "exit $rc, log: $log"
    echo "----- last 25 lines of $name -----"; tail -n 25 "$log"; echo "-----"
  fi
  return "$rc"
}
summary() {
  local fails=0 skips=0 i
  echo; echo "==== VERIFY SUMMARY ===="
  for i in "${!NAMES[@]}"; do
    printf '%-5s %-22s %s\n' "${STATUS[$i]}" "${NAMES[$i]}" "${NOTES[$i]}"
    [ "${STATUS[$i]}" = FAIL ] && fails=$((fails + 1))
    [ "${STATUS[$i]}" = SKIP ] && skips=$((skips + 1))
  done
  echo "Output: $QLOG_VERIFY_DIR"; echo "Logs:   $LOG_DIR"
  if [ "$fails" -gt 0 ]; then echo "RESULT: FAILED ($fails failed, $skips skipped)"; exit 1
  elif [ "$skips" -gt 0 ]; then
    echo "RESULT: INCOMPLETE ($skips step(s) did not run; do NOT claim 'verified')"; exit 2
  else echo "RESULT: PASSED (${#NAMES[@]} steps)"; exit 0; fi
}
skip_rest() { local n; for n in "$@"; do skip "$n" "$REASON"; done; }

# 1. Snapshot: only tracked/staged files enter the build. Local drafts and private files stay local.
QLOG_SOURCE_DIR="$(mktemp -d "$QLOG_VERIFY_DIR/source.XXXXXX")"
snapshot() {
  git ls-files -z | ruby -e 'require "fileutils"; dest=ARGV.fetch(0); STDIN.read.split("\0").each { |p| next unless File.file?(p); FileUtils.mkdir_p(File.dirname(File.join(dest,p))); FileUtils.cp(p,File.join(dest,p)) }' "$QLOG_SOURCE_DIR"
}
step snapshot snapshot || summary
cd "$QLOG_SOURCE_DIR"

# 2. Dependencies and data
ALL_AFTER_BUNDLE=(footprint-data map-geometry build-pages check-site-pages htmlproofer-pages build-vercel check-site-vercel htmlproofer-vercel browser-smoke)
step bundle-check bundle check || { REASON="bundle check failed (run bundle install with the locked Gemfile.lock)"; skip_rest "${ALL_AFTER_BUNDLE[@]}"; summary; }
step footprint-data bundle exec ruby scripts/check-footprint.rb
step map-geometry node scripts/check-map.cjs

# 3. GitHub Pages build (baseurl /my-blog)
PAGES="$QLOG_VERIFY_DIR/pages"; PAGES_OK=0
if step build-pages env JEKYLL_ENV=production bundle exec jekyll build --disable-disk-cache --destination "$PAGES"; then
  PAGES_OK=1
  step check-site-pages bundle exec ruby scripts/check-site.rb "$PAGES" /my-blog "$PAGES_ORIGIN"
  step htmlproofer-pages bundle exec htmlproofer "$PAGES" --disable-external --swap-urls '^/my-blog/:/'
else
  REASON="build-pages failed"; skip_rest check-site-pages htmlproofer-pages
fi

# 4. Vercel build (empty baseurl, noindex mirror)
VERCEL="$QLOG_VERIFY_DIR/vercel"
if step build-vercel env QLOG_SITE_URL="$VERCEL_ORIGIN" ruby scripts/build-vercel.rb --destination "$VERCEL"; then
  step check-site-vercel bundle exec ruby scripts/check-site.rb "$VERCEL" '' "$VERCEL_ORIGIN"
  step htmlproofer-vercel bundle exec htmlproofer "$VERCEL" --disable-external
else
  REASON="build-vercel failed"; skip_rest check-site-vercel htmlproofer-vercel
fi

# 5. Browser smoke test against the production Pages output
# browser_prepare: locate playwright + Chromium. Returns 1 with $REASON set when the environment cannot run a browser.
browser_prepare() {
  if [ -n "${QLOG_PLAYWRIGHT_DIR:-}" ]; then NODE_PATH="$QLOG_PLAYWRIGHT_DIR/node_modules"
  elif node -e "require.resolve('playwright')" >/dev/null 2>&1; then NODE_PATH="${NODE_PATH:-}"
  else
    NODE_PATH="$QLOG_VERIFY_DIR/browser/node_modules"
    if ! PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --prefix "$QLOG_VERIFY_DIR/browser" --no-package-lock --no-audit --no-fund playwright@1.58.2 >"$LOG_DIR/playwright-install.log" 2>&1; then
      REASON="cannot install playwright (see $LOG_DIR/playwright-install.log)"; return 1
    fi
  fi
  export NODE_PATH
  CHROME="${CHROME_EXECUTABLE:-}"; [ -z "$CHROME" ] && [ -x /opt/pw-browsers/chromium ] && CHROME=/opt/pw-browsers/chromium
  export CHROME_EXECUTABLE="$CHROME"
  if ! node -e "
    const { chromium } = require('playwright');
    chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE, args: ['--no-sandbox'] } : {}) })
      .then(b => b.close()).catch(e => { console.error(e.message); process.exit(1); })" >"$LOG_DIR/browser-launch.log" 2>&1; then
    REASON="cannot launch Chromium (see $LOG_DIR/browser-launch.log)"; return 1
  fi
}
browser_run() {
  local serve_dir="$QLOG_VERIFY_DIR/http" port
  rm -rf "$serve_dir"; mkdir -p "$serve_dir/my-blog"; cp -R "$PAGES/." "$serve_dir/my-blog/"
  port="${SMOKE_PORT:-$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')}"
  python3 -m http.server "$port" --bind 127.0.0.1 --directory "$serve_dir" >"$LOG_DIR/http-server.log" 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 30); do curl -fs -o /dev/null "http://127.0.0.1:$port/my-blog/" && break; sleep 1; done
  SMOKE_URL="http://127.0.0.1:$port/my-blog" SCREENSHOT_DIR="${SCREENSHOT_DIR:-$QLOG_VERIFY_DIR/screenshots}" node scripts/browser-smoke.cjs
}
REASON=""
if [ "${VERIFY_SKIP_BROWSER:-0}" = 1 ]; then skip browser-smoke "VERIFY_SKIP_BROWSER=1 (interaction not verified)"
elif [ "$PAGES_OK" != 1 ]; then skip browser-smoke "build-pages failed"
elif ! curl -fsS -m 10 -o /dev/null https://cdn.jsdelivr.net/npm/simple-jekyll-search@1.10.0/dest/simple-jekyll-search.min.js 2>/dev/null; then
  # Chirpy loads its search, icons and lightbox from this CDN; the smoke test's search step needs it.
  skip browser-smoke "cdn.jsdelivr.net unreachable from this environment (third-party/network, not a site result); allow the host or run in CI"
elif ! browser_prepare; then skip browser-smoke "$REASON"
else step browser-smoke browser_run
fi

summary
