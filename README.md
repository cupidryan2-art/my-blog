# Qlog

Jekyll 4.4.1 / Chirpy 7.5.0 personal blog. Source: `_posts`, `_tabs`, `_layouts`, `_includes`, `_sass`, `_data`. `_site` is generated.

## Verify

Use Ruby 3.3 or newer, Bundler 2.5.22 and the locked gems. Node.js is needed for script syntax and map checks, not for building the site.

```sh
bundle check
# Explicitly stage intended new files first; untracked drafts are never copied.
bash scripts/verify.sh
```

The command snapshots tracked/staged files, builds production Pages and Vercel variants into a temporary directory, validates all executable scripts, assets, internal links, SEO URLs, pagination, publish exclusions and the footprint data/map contract. The Vercel test origin defaults to `https://qlog-verification.example`; override with `VERIFY_VERCEL_URL`. It is never saved to deployment configuration.

Production Vercel builds require `QLOG_SITE_URL=https://your-production-domain` or Vercel's `VERCEL_PROJECT_PRODUCTION_URL`. `_config_vercel.yml` remains unchanged. `ruby scripts/build-vercel.rb` injects a temporary override and fails clearly if no origin is available.

## Browser verification

```sh
JEKYLL_ENV=production bundle exec jekyll serve --host 127.0.0.1 --disable-disk-cache
```

Test at 375, 768 and 1280px: search, sidebar, font persistence, light/dark/system modes, pagination and article TOC. For footprints open Hangzhou, Kuala Lumpur, Siem Reap (image) and Bangkok from list and map; return with focus/scroll intact; repeat zoom at both bounds and reset. Check keyboard access and actual single/two-finger gestures on a phone. Check console for first-party errors; keep third-party service failures separate.

CI runs `scripts/browser-smoke.cjs` with Playwright Chromium against production Pages output. Browser test dependencies are installed only in the runner temporary directory; there is no application npm build.

See AGENTS.md for deployment constraints and source boundaries. Existing untracked posts are not publication-ready just because they build.
