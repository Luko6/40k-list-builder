# Known gaps & limitations

Honest status of what the app does **not** do yet, so expectations are clear.
Roughly ordered by impact on actually building a legal list.

## Rules / validation
- **Wargear selection is loadout-only.** You can now pick each datasheet's
  weapon/loadout options per unit, and the choices persist and show in the
  summary. But all compiled wargear is points-neutral (every `pointsDelta` is
  0) and no option scales `perModels`, so selections don't change the total and
  min/max are surfaced only as soft hints (single-pick = dropdown, multi-pick =
  checkboxes capped at max) — they aren't enforced.
- **Enhancements are assignable** to eligible characters (CHARACTER, non-Epic-
  Hero), fold into the unit + army points, and are deduped (each enhancement
  once) with an over-limit warning. NOT enforced: the hard cap is only warned,
  not blocked, and the Emperor's Champion's datasheet-specific ban isn't modeled
  (it's treated as a normal character).
- **Leader attachment is single-tier.** You can attach a LEADER to an eligible
  bodyguard unit in the roster (dropdown filtered by `canLead`); the summary
  shows the pairing and removing a bodyguard detaches its leaders. NOT enforced:
  the "max one Leader per unit (some allow two)" rule — multiple leaders can be
  pointed at the same unit, and equipment-conditional leads (e.g. Captain needs
  a relic shield to join Bladeguard) aren't modeled. Points are unaffected (10e/
  11e cost leaders and bodyguards separately).
- **Shallow validation.** Checks that run: total points vs the 2000 cap,
  max-3-of-a-datasheet, and a soft enhancement-limit warning. NOT enforced:
  detachment composition, Battleline minimums, the Detachment-Points budget,
  leader/character rules, and the "1st unit costs more" tiered character pricing
  (the builder takes a single cost per size).

## Scope
- **One detachment at a time.** The schema supports 11e's multiple-detachment
  + DP-budget model, but the UI only picks a single detachment and ignores DP.
- **Only the Gladius Task Force detachment** is in the catalogue (with
  hand-entered enhancements). The other ~18 Black Templars detachments and
  their enhancements aren't compiled yet — the MFM scraper currently extracts
  unit points only, not detachment/enhancement data.
- **Strike Force (2000 pts) only.** Incursion/Onslaught are out of MVP scope.
- **Black Templars only.** By design for the MVP.

## Data accuracy
- **Statlines/weapons are a 10th-edition stand-in.** 11e BattleScribe data
  isn't published yet, so stats, weapons, and loadouts come from the pinned
  BSData wh40k-10e snapshot. They will be wrong wherever 11e changed a profile.
- **Points are 11e (Munitorum), 88/89 matched.** The "Emperor's Champion
  (Anointed)" variant isn't listed separately on the MFM and falls back to the
  cat's 10e cost. Points are a dated snapshot — re-run `npm run scrape-mfm`
  after each Munitorum update.
- **Roles incomplete.** Only Emperor's Champion and Marshal carry a
  LEADER/SUPPORT tag; the rest aren't extracted from the MFM yet.

## Persistence
- **Local to one browser.** Lists live in `localStorage` (autosaved) plus named
  save slots; there is no cloud sync. Use Export/Import (JSON) to move a list
  between devices or back it up — clearing browser data otherwise loses it.
