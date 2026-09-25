# drift-check

Read-only check that the static fallbacks committed in `jestamang.com` still agree with
what Firestore and the R2 manifest render at runtime. Run it before every push.

```
node drift-check.js                 # repo at ~/Desktop/jestamang.com
node drift-check.js --repo /path    # elsewhere
node drift-check.js --strict        # warnings also fail
node drift-check.js --quiet         # hide INFO lines
```

Exit 0 = clean. Exit 1 = at least one ERROR (or WARN with --strict). Exit 2 = could not run.
No install needed (Node 18+, native fetch). Reads the public web API key from the repo's
`assets/js/firebase-config.js`; only public-readable collections are touched. Writes nothing.

What it compares
- index.html featured show card vs `siteConfig/indexSections` shows extras (6 fields)
- index.html and shows.html Event JSON-LD vs the next upcoming `shows` doc
- shows.html static upcoming card (date, venue, city, tagline, doors/price, ticket button) and static past list vs `shows`
- albums.html static cards (title + artist) vs `releases`; title count; color-map coverage
- entities.html static names vs `entities`; title count; index.html entity grid
- lyrics.html album labels vs `lyrics` docs; title song count vs total songs
- radio.html stat block and description vs the R2 manifest (albums, tracks, artists)
- every gallery photo in `photos` exists in assets/photos with a case-sensitive thumbnail
- sitemap.xml: every entry has a file; every indexable page is listed; lastmod not older than last commit
- `siteConfig/pageMeta` overrides vs the static title/description they replace
- pre-push guard: uncommitted HTML/JS/CSS changes without a `CACHE_NAME` bump in sw.js

Known intentional differences it does not flag: radio counts (35 albums / 24 artists) vs
catalog counts (37 releases / 27 entities); Revolution Epilogue and Sleep Cycle absent from R2.
