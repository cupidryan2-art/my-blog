# Qlog

Jekyll 4.4.1 / Chirpy 7.5.0 personal blog. Source: `_posts`, `_tabs`, `_layouts`, `_includes`, `_sass`, `_data`. `_site` is generated.

## Verify

One command runs everything. Use Ruby 3.3 or newer, Bundler 2.5.22 and the locked gems; Node.js 22 is needed for the map check and the browser smoke test (not for building the site).

```sh
bundle check
# Explicitly stage intended new files first; untracked drafts are never copied.
bash scripts/verify.sh
```

The command snapshots tracked/staged files, then runs: footprint data and map geometry checks, the production Pages build with `check-site.rb` and htmlproofer, the Vercel build with the same checks, and the browser smoke test (Playwright Chromium against the production Pages output; a temporary Playwright install outside the checkout is used when none is found). It prints one line per step and ends with a summary and a `RESULT:` line:

| RESULT | Exit | Meaning |
|---|---|---|
| `PASSED` | 0 | Every step ran and passed. |
| `FAILED` | 1 | At least one step failed; its log tail is printed. |
| `INCOMPLETE` | 2 | Nothing failed, but a required step could not run here (no browser, or `cdn.jsdelivr.net` unreachable, which Chirpy's search needs). Not a pass. |

Useful variables: `VERIFY_DIR` (output location), `VERIFY_VERBOSE=1` (stream all output), `VERIFY_SKIP_BROWSER=1` (skips the browser step; result is then `INCOMPLETE`), `QLOG_PLAYWRIGHT_DIR`, `CHROME_EXECUTABLE`, `SCREENSHOT_DIR`. A UTF-8 locale is set automatically (Chinese file names need it). The Vercel test origin defaults to `https://qlog-verification.example`; override with `VERIFY_VERCEL_URL`. It is never saved to deployment configuration.

Production Vercel builds require `QLOG_SITE_URL=https://your-production-domain` or Vercel's `VERCEL_PROJECT_PRODUCTION_URL`. `_config_vercel.yml` remains unchanged. `ruby scripts/build-vercel.rb` injects a temporary override and fails clearly if no origin is available.

## Browser verification

```sh
JEKYLL_ENV=production bundle exec jekyll serve --host 127.0.0.1 --disable-disk-cache
```

Test at 375, 768 and 1280px: search, sidebar, font persistence, light/dark/system modes, pagination and article TOC. For footprints open Hangzhou, Kuala Lumpur, Siem Reap (image) and Bangkok from list and map; return with focus/scroll intact; repeat zoom at both bounds and reset. Check keyboard access and actual single/two-finger gestures on a phone. Check console for first-party errors; keep third-party service failures separate.

CI runs the same `bash scripts/verify.sh`, with Playwright installed only in the runner temporary directory; there is no application npm build. Working rules for agents are in `CLAUDE.md`.

## Deployment and dependencies

GitHub Pages (`https://cupidryan2-art.github.io/my-blog`, baseurl `/my-blog`) is the primary site. Vercel is a secondary site: `scripts/build-vercel.rb` injects `qlog_noindex: true`, which `_includes/metadata-hook.html` renders as `<meta name="robots" content="noindex,follow">`, and `scripts/check-site.rb` enforces it (and its absence on the Pages build).

`.github/dependabot.yml` opens weekly update PRs for GitHub Actions and Bundler. They are proposals only: review each manually (no auto-merge), and do not accept gem additions without explicit confirmation. The Playwright version in CI is pinned deliberately.

See AGENTS.md for deployment constraints and source boundaries. Existing untracked posts are not publication-ready just because they build.
