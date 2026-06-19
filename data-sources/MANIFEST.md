# Vendored data sources

Pinned, read-only snapshots used by `npm run compile-data` to produce the app's
catalogue JSON. **Do not edit these files** — re-vendor from upstream instead.

## BSData wh40k-10e (statlines, weapons, loadouts, keywords, 10e points)

- **Upstream:** <https://github.com/BSData/wh40k-10e>
- **Pinned commit:** `97dfd335f63f712aaaf16591f365f3ccf5a0c6f8` (2026-06-15)
- **License:** upstream is community data; used here for a personal, non-commercial
  list builder. Warhammer 40,000 and all associated names are © Games Workshop.

| File | Bytes | Role |
| --- | --- | --- |
| `bsdata/Imperium - Black Templars.cat` | 395779 | Black Templars-specific units, links to Space Marines |
| `bsdata/Imperium - Space Marines.cat` | 3811883 | Shared Space Marines units (imported into BT) |
| `bsdata/Warhammer 40,000.gst` | 720625 | Game system: profile types, cost types, shared rules/categories |

### Re-vendoring

```bash
SHA=<new-commit-sha>
BASE="https://raw.githubusercontent.com/BSData/wh40k-10e/$SHA"
curl -fsSL "$BASE/Imperium%20-%20Black%20Templars.cat" -o "bsdata/Imperium - Black Templars.cat"
curl -fsSL "$BASE/Imperium%20-%20Space%20Marines.cat" -o "bsdata/Imperium - Space Marines.cat"
curl -fsSL "$BASE/Warhammer%2040%2C000.gst"           -o "bsdata/Warhammer 40,000.gst"
```

Then bump the pinned commit above.

## Munitorum Field Manual (11e points)

- **Upstream:** <https://mfm.warhammer-community.com/en/black-templars>
- **Snapshot:** `mfm/black-templars.rsc.txt` — the page's React Flight (RSC)
  payload, captured 2026-06-20.

The MFM is a Next.js App Router app with no clean API; the page data is
server-rendered into a flight payload returned when the route is fetched with
an `RSC: 1` header. `scripts/scrape-mfm.mjs` (`npm run scrape-mfm`) parses that
payload — resolving the lazy `$L<id>` point refs — into
`scripts/points-overrides.json` (points-by-size keyed by datasheet-name slug),
which `compile-data` merges over the BSData 10e cost. 88/89 datasheets match by
name; re-run after MFM updates.

### Re-capturing

```bash
npm run scrape-mfm        # fetches live, refreshes the .rsc.txt snapshot + overrides
npm run scrape-mfm -- --cached   # re-parse the saved snapshot without refetching
```
