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

## Munitorum Field Manual (11e points + roles)

Points and LEADER/SUPPORT roles are corrected against the Munitorum Field Manual
(<https://mfm.warhammer-community.com/en/black-templars>) via a hand-maintained
overrides file (`scripts/points-overrides.json`), since the MFM has no clean API
and the BSData snapshot carries 10e points.
