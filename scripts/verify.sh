#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
QLOG_ROOT="$PWD"
QLOG_VERIFY_DIR="${VERIFY_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/qlog-verify.XXXXXX")}"
mkdir -p "$QLOG_VERIFY_DIR"
QLOG_SOURCE_DIR="$(mktemp -d "$QLOG_VERIFY_DIR/source.XXXXXX")"
# Only tracked/staged files enter the build. Local drafts and private files stay local.
git ls-files -z | ruby -e 'require "fileutils"; dest=ARGV.fetch(0); STDIN.read.split("\0").each { |p| next unless File.file?(p); FileUtils.mkdir_p(File.dirname(File.join(dest,p))); FileUtils.cp(p,File.join(dest,p)) }' "$QLOG_SOURCE_DIR"
cd "$QLOG_SOURCE_DIR"
bundle check
bundle exec ruby scripts/check-footprint.rb
node scripts/check-map.cjs
JEKYLL_ENV=production bundle exec jekyll build --disable-disk-cache --destination "$QLOG_VERIFY_DIR/pages"
bundle exec ruby scripts/check-site.rb "$QLOG_VERIFY_DIR/pages" /my-blog https://cupidryan2-art.github.io
bundle exec htmlproofer "$QLOG_VERIFY_DIR/pages" --disable-external --swap-urls '^/my-blog/:/'
QLOG_SITE_URL="${VERIFY_VERCEL_URL:-https://qlog-verification.example}" ruby scripts/build-vercel.rb --destination "$QLOG_VERIFY_DIR/vercel"
bundle exec ruby scripts/check-site.rb "$QLOG_VERIFY_DIR/vercel" '' "${VERIFY_VERCEL_URL:-https://qlog-verification.example}"
bundle exec htmlproofer "$QLOG_VERIFY_DIR/vercel" --disable-external
printf 'Verified production output: %s\n' "$QLOG_VERIFY_DIR"
