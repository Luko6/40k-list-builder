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
- **Validation is advisory.** A consolidated panel surfaces: over the points
  cap, over the Detachment-Points budget, over the enhancement limit, the same
  enhancement assigned twice, and >3 of a (non-transport) datasheet. These are
  warnings, not hard blocks — you can still build an illegal list (the
  add-detachment dropdown does, however, hide detachments that wouldn't fit the
  DP budget). NOT modeled: Battleline minimums, leader/character composition
  rules, the Battleline-gets-6 / transport-exempt nuances of the datasheet cap,
  and the "1st unit costs more" tiered character pricing (single cost per size).

## Scope
- **Multiple detachments with a DP budget.** You can now combine detachments up
  to the game size's Detachment-Points budget (Strike Force = 3 DP); enhancements
  are pooled across all selected detachments. Removing a detachment drops any
  enhancement that only it provided.
- **All 19 detachments are compiled** (3 BT-specific + 16 generic Space
  Marines, all legal for BT) with DP, force disposition, and enhancements,
  parsed from the MFM payload into `detachments.json`. Caveat: `(Upgrade)`-type
  enhancements (which the rules allow on non-character units) are still only
  offered to characters in the UI.
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
- **Roles complete.** All LEADER/SUPPORT roles are scraped from the MFM badges
  (27 datasheets: 17 leader, 10 support); the rest are untagged battleline/
  vehicles/etc. Caveat: the MFM omits a badge for "Lieutenant with Combi-weapon"
  (left untagged to match the MFM) and for the EC "(Anointed)" variant (manually
  tagged leader to mirror the base model).

## Persistence
- **Local to one browser.** Lists live in `localStorage` (autosaved) plus named
  save slots; there is no cloud sync. Use Export/Import (JSON) to move a list
  between devices or back it up — clearing browser data otherwise loses it.
