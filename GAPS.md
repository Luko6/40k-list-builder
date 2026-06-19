# Known gaps & limitations

Honest status of what the app does **not** do yet, so expectations are clear.
Roughly ordered by impact on actually building a legal list.

## Rules / validation
- **No wargear selection UI.** Each datasheet's loadout option groups are
  compiled into the data, but the builder doesn't yet let you choose weapons.
  Unit points use the size cost only (most 11e wargear is points-neutral, so
  this rarely changes the total — but it isn't modelled).
- **No enhancement assignment.** Detachment enhancements are in the data, but
  you can't yet attach one to a character. They don't count toward points or
  the enhancement limit.
- **No leader attachment.** `canLead` is compiled (parsed from each Leader
  ability), but there's no UI to attach a leader to a bodyguard unit.
- **Shallow validation.** Only two checks run: total points vs the 2000 cap,
  and max-3-of-a-datasheet. NOT enforced: detachment composition, Battleline
  minimums, enhancement count limit, the Detachment-Points budget, leader/
  character rules, and the "1st unit costs more" tiered character pricing
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
