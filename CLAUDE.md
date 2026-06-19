# CLAUDE.md — project orientation & handoff

A Warhammer 40,000 **11th edition** army list builder. MVP scope: **Black
Templars**, **Strike Force (2000 pts)** only. Fully static React app on GitHub
Pages — no backend, no accounts.

- **Live:** https://luko6.github.io/40k-list-builder/
- **Repo:** https://github.com/Luko6/40k-list-builder (must stay **public** — see Gotchas)
- **Status:** Phases 0–4 complete and deployed. Builds a list, persists it, exports/prints it.

## Commands

```bash
npm install            # one-time
npm run dev            # local dev server (Vite)
npm run build          # tsc -b + vite build (CI runs this; must pass)
npm run lint           # eslint (must pass)
npm run preview        # serve the production build locally

# Data pipeline (regenerates committed data; see "Data pipeline" below)
npm run scrape-mfm     # Munitorum points -> scripts/points-overrides.json
npm run compile-data   # vendored BSData + overrides -> src/data/generated/black-templars.json
node scripts/inspect.mjs "Crusader Squad"   # dump a compiled datasheet to verify
```

Deploy = push to `main`. `.github/workflows/deploy.yml` builds and publishes to
Pages automatically. There is no manual deploy step.

## Architecture

Data flows **one direction**: vendored sources → compiler → committed JSON → app.
The app never parses raw data at runtime; it imports the pre-compiled JSON so the
static site needs no build step for data.

```
data-sources/                         pinned, read-only upstream snapshots (don't edit)
  bsdata/*.cat, *.gst                 BattleScribe wh40k-10e: statlines, weapons, loadouts, keywords
  mfm/black-templars.rsc.txt          Munitorum Field Manual page (React Flight payload) — 11e points
  MANIFEST.md                         provenance + re-vendoring instructions

scripts/
  scrape-mfm.mjs                      MFM payload -> points-overrides.json (resolves lazy $L point refs)
  points-overrides.json              GENERATED: points-by-size + roles, keyed by datasheet-name slug
  compile-data.mjs                    BSData cats (+ overrides) -> generated JSON  (the real work)
  inspect.mjs                         dev helper: print a compiled datasheet

src/
  data/schema.ts                      TS types: FactionCatalogue (compiled) + SavedList (persisted)
  data/generated/black-templars.json  GENERATED catalogue (89 datasheets) — DO NOT hand-edit
  data/black-templars.ts              imports + type-casts the generated JSON (single boundary)
  list/useRoster.ts                   useReducer working state (detachment + unit instances) + totals
  list/storage.ts                     localStorage + JSON import/export (RosterState <-> SavedList)
  list/summary.ts                     copy/print roster text builder
  components/UnitCatalog.tsx          left panel: search + add units (datasheet-limit guard)
  components/RosterPanel.tsx          right panel: detachment, per-unit size, remove, live points
  components/Toolbar.tsx              name, save/load/delete, import/export, copy/print
  App.tsx                             wires it together + autosave effect
  index.css                          all styles (incl. @media print)
```

## Data pipeline (the non-obvious part)

Division of sources: **stats/weapons/loadouts/keywords from BSData**, **points
from the Munitorum**. 11e BattleScribe data doesn't exist yet, so BSData
wh40k-**10e** is a stand-in for stats; points are real 11e from the MFM.

1. **`scrape-mfm.mjs`** fetches the MFM page with an `RSC: 1` header. The MFM is
   a Next.js App Router app — the initial HTML has NO data; the route returns a
   React Flight payload where unit names are UPPERCASE spans and point values are
   lazy refs (`$L<id>`) resolved by sibling rows (`<id>:[...,"80 pts"]`). The
   script resolves these into `points-overrides.json` keyed by name slug. 88/89
   match (the "(Anointed)" EC variant isn't on the MFM).
2. **`compile-data.mjs`** is a recursive BattleScribe resolver. It walks each
   unit's subtree following `entryLink`/`infoLink` `targetId`s across all three
   files, extracting statlines, weapon profiles, wargear option groups, keywords,
   invuln, and the `canLead` list (parsed from the Leader ability text). It runs
   over the BT catalogue's 19 curated top-level units **and** the Space Marines
   catalogue's imported root entries, applying BT legality (exclude Psykers,
   other chapters' Epic Heroes, Legends/Crucible) and deduping (BT wins). Points
   from `points-overrides.json` are merged over the cat's 10e cost.

To change data: edit the compiler or `points-overrides.json`, re-run
`compile-data`, **commit the regenerated JSON**, push.

## Gotchas

- **Repo must stay public.** Free-plan GitHub Pages won't serve a private repo
  (it 404s and the Pages site is torn down). Pages was enabled with
  `gh api repos/Luko6/40k-list-builder/pages -X POST -f build_type=workflow`
  (the Actions token itself can't create the Pages site).
- **Never hand-edit** `src/data/generated/black-templars.json` or
  `scripts/points-overrides.json` — they're regenerated. Edit the compiler/scraper.
- **`data-sources/**` is byte-pristine** (`.gitattributes` sets `-text`). Re-vendor
  via the commands in `data-sources/MANIFEST.md`; don't edit in place.
- **Windows/CRLF**: git warns "LF will be replaced by CRLF" on commit — harmless,
  the repo stores LF.
- The deploy logs a Node-20 action-deprecation warning — harmless, not yet bumped.

## Where to pick up

Full limitations are in **GAPS.md**. Highest-value remaining work, with entry points:

1. **Wargear/enhancement assignment UI.** Data is already compiled
   (`Datasheet.wargearOptions`, `Detachment.enhancements`). Add selection UI in
   `RosterPanel.tsx`, store choices on the roster unit (extend `RosterUnit` in
   `useRoster.ts` and the `ListUnit` mapping in `storage.ts`), fold enhancement
   points into `totals`.
2. **Leader attachment.** `Datasheet.canLead` exists. Add attach UI + an
   `attachedToInstanceId` on roster units (schema already has the field).
3. **Compile all ~18 BT detachments + enhancements.** Only Gladius Task Force is
   hand-entered in `compile-data.mjs`. The MFM payload contains every detachment
   (UPPERCASE) with DP + force disposition + enhancements (title-case + points) —
   extend `scrape-mfm.mjs` to parse them, then drive `catalogue.detachments` from
   that instead of the hardcoded block.
4. **Roles for all units.** Only EC + Marshal are tagged leader. The MFM payload
   has LEADER/SUPPORT markers — extend `scrape-mfm.mjs` to emit `role` per unit.
5. **Deeper validation** (DP budget, multiple detachments in the UI, enhancement
   limit, battleline minimums). Schema already models multiple detachments + DP.

Working conventions: keep build + lint green before committing; commit each
logical chunk with a descriptive message; push deploys automatically; verify the
live site returns 200 after deploy.
