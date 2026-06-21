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
npm run scrape-mfm        # Munitorum points/roles -> points-overrides.json + detachments.json
npm run scrape-wahapedia  # Wahapedia detachment rules/stratagems/enh text -> detachment-rules.json
npm run compile-data      # vendored BSData + overrides + detachments -> generated/black-templars.json
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
  mfm/black-templars.rsc.txt          Munitorum Field Manual page (React Flight payload) — 11e points/roles
  wahapedia/black-templars.html       Wahapedia BT page — 11e detachment rules/stratagems/enh text
  MANIFEST.md                         provenance + re-vendoring instructions

scripts/
  scrape-mfm.mjs                      MFM payload -> points-overrides.json + detachments.json (resolves lazy $L refs)
  scrape-wahapedia.mjs                Wahapedia BT page -> detachment-rules.json (rules/stratagems/enh descriptions)
  points-overrides.json              GENERATED: points-by-size + roles + canLead, keyed by datasheet-name slug
  detachments.json                   GENERATED: all 19 detachments (DP, disposition, enhancement names+points)
  detachment-rules.json              GENERATED: detachment rules/stratagems + global enhancement descriptions (15/19; Wahapedia)
  compile-data.mjs                    BSData cats (+ overrides + detachments + rules) -> generated JSON  (the real work)
  inspect.mjs                         dev helper: print a compiled datasheet

src/
  data/schema.ts                      TS types: FactionCatalogue (compiled) + SavedList (persisted)
  data/generated/black-templars.json  GENERATED catalogue (89 datasheets) — DO NOT hand-edit
  data/black-templars.ts              imports + type-casts the generated JSON (single boundary)
  list/useRoster.ts                   useReducer working state (detachments[] + unit instances) + totals + validation
  list/storage.ts                     localStorage + JSON import/export (RosterState <-> SavedList)
  list/summary.ts                     copy/print roster text builder
  list/categories.ts                  shared unit-category helper (Characters/Battleline/…) used by catalog/roster/summary
  list/units.ts                       shared unit helpers (points, attach slot, canLead, enhancement-eligibility, instance labels)
  components/UnitCatalog.tsx          LEFT pane: search + category-grouped list; click row to add, ⓘ to preview
  components/RosterPanel.tsx          MIDDLE pane: detachments + DP + validation; units grouped by category, click to select (leaders nest under bodyguard)
  components/DetailPanel.tsx          RIGHT pane: detail for the selected unit (editable size/wargear/enhancement/attach), detachment (rule/stratagems/enh), or catalog preview (read-only + Add)
  components/UnitStats.tsx            statline + weapon tables + can-lead (rendered inside DetailPanel)
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
   match (the "(Anointed)" EC variant isn't on the MFM). It **also** parses the
   DETACHMENTS section into `detachments.json` — all 19 detachments legal for BT
   (3 BT-specific + 16 generic Space Marines), each with its DP badge, force
   disposition, and enhancements (points + `(Upgrade)` flag). Run with `--cached`
   to parse the vendored payload offline. It also reads each unit's LEADER/
   SUPPORT badge (`role`) and the leader's can-lead list (the `font-bold` span
   after the badge) into `points-overrides.json`.
2. **`scrape-wahapedia.mjs`** parses the vendored Wahapedia BT page into
   `detachment-rules.json`: each detachment's rule prose + stratagems (keyed off
   each `str10Type` "Detachment – Category Stratagem" header) plus a global
   enhancement-slug → description map. Covers 15/19 (the 4 newest BT detachments
   load behind Wahapedia's JS filter). `--cached` parses the vendored snapshot.
3. **`compile-data.mjs`** is a recursive BattleScribe resolver. It walks each
   unit's subtree following `entryLink`/`infoLink` `targetId`s across all three
   files, extracting statlines, weapon profiles, wargear option groups, keywords,
   invuln, and a `canLead` list (prefers the MFM list, falls back to the Leader
   ability text). It runs over the BT catalogue's 19 curated top-level units
   **and** the Space Marines catalogue's imported root entries, applying BT
   legality (exclude Psykers, other chapters' Epic Heroes, Legends/Crucible) and
   deduping (BT wins). Points from `points-overrides.json` merge over the cat's
   10e cost; `catalogue.detachments` comes from `detachments.json` enriched with
   `detachment-rules.json` (rule/stratagems/enhancement descriptions).

To change data: edit the compiler/scrapers, re-run `scrape-mfm --cached` and/or
`scrape-wahapedia --cached` as needed, then `compile-data`, **commit the
regenerated JSON**, push.

## Gotchas

- **Repo must stay public.** Free-plan GitHub Pages won't serve a private repo
  (it 404s and the Pages site is torn down). Pages was enabled with
  `gh api repos/Luko6/40k-list-builder/pages -X POST -f build_type=workflow`
  (the Actions token itself can't create the Pages site).
- **Never hand-edit** `src/data/generated/black-templars.json`,
  `scripts/points-overrides.json`, or `scripts/detachments.json` — they're
  regenerated. Edit the compiler/scraper.
- **`data-sources/**` is byte-pristine** (`.gitattributes` sets `-text`). Re-vendor
  via the commands in `data-sources/MANIFEST.md`; don't edit in place.
- **Windows/CRLF**: git warns "LF will be replaced by CRLF" on commit — harmless,
  the repo stores LF.
- The deploy logs a Node-20 action-deprecation warning — harmless, not yet bumped.

## Where to pick up

Full limitations are in **GAPS.md**. Highest-value remaining work, with entry points:

1. ~~**Wargear/enhancement assignment UI.**~~ **Done.** Per-unit wargear
   selection (`RosterUnit.wargearSelections`) and enhancement assignment
   (`RosterUnit.enhancementId`) are wired through `useRoster.ts` → `storage.ts`
   → `RosterPanel.tsx` → `summary.ts`. Enhancement points fold into `totals`
   with a soft over-limit warning; wargear is loadout-only (all `pointsDelta`
   are 0). See GAPS.md for what's still not enforced.
2. ~~**Leader attachment.**~~ **Done.** `RosterUnit.attachedToInstanceId` +
   `setAttachment` action; `RosterPanel` shows an attach dropdown for LEADERs
   (filtered to in-roster bodyguards via `canLead`), bodyguards list their
   leaders, and removing a bodyguard detaches them. summary shows the pairing.
   Also fixed a compiler bug: `canLead` was slugified from ability text so
   "Sword Brethren" never matched `sword-brethren-squad` and rule-text
   sentences leaked in — `compile-data.mjs` now resolves canLead against the
   real id set (7 remapped, 13 fragments dropped).
3. ~~**Compile all ~18 BT detachments + enhancements.**~~ **Done.** All 19
   detachments (with DP, force disposition, and enhancements incl. `(Upgrade)`
   flag) are parsed from the MFM payload by `scrape-mfm.mjs` into
   `detachments.json`, and `compile-data.mjs` drives `catalogue.detachments`
   from it. The UI already let you pick the detachment, so this lit up the full
   list. Still single-detachment-at-a-time (see #5) and `(Upgrade)` enhancements
   are only offered to characters in the UI.
4. ~~**Roles for all units.**~~ **Done.** `scrape-mfm.mjs` now reads each unit's
   LEADER/SUPPORT badge from the MFM payload (the badge sits right after the
   unit name; the names after it are its can-lead list) and emits `role` into
   `points-overrides.json`. 27 datasheets tagged (17 leader, 10 support). A
   small `ROLE_OVERRIDES` map covers MFM gaps (the EC "(Anointed)" variant,
   which isn't on the MFM, is tagged leader). The catalog UI already renders the
   role chips (`UnitCatalog.tsx`).
5. ~~**Deeper validation**~~ **Done.** `RosterState` now holds `detachmentIds[]`;
   the UI manages multiple detachments with a Detachment-Points budget (add
   dropdown hides detachments that don't fit remaining DP; removing one drops
   enhancements only it provided). Enhancements are pooled across all selected
   detachments (grouped by detachment in the dropdown). `totals.problems[]`
   drives a consolidated validation panel (over points / DP / enhancement limit,
   duplicate enhancement, >3 of a datasheet). Checks are advisory, not hard
   blocks. See GAPS.md for what's still not modeled (Battleline minimums,
   tiered character pricing, composition rules).

Working conventions: keep build + lint green before committing; commit each
logical chunk with a descriptive message; push deploys automatically; verify the
live site returns 200 after deploy.
