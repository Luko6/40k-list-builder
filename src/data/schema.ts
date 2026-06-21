/**
 * Data schema for the 40k (11th edition) list builder.
 *
 * Two kinds of types live here:
 *  - "Catalogue" types describe the compiled game data (factions, detachments,
 *    datasheets). These are produced by the Phase 2 importer and are read-only
 *    at runtime.
 *  - "List" types describe a user's saved army (what they picked). These are
 *    what we persist to localStorage and import/export as JSON.
 *
 * Data sources (see project memory): points / roles / lead relationships come
 * from the Munitorum Field Manual; stat lines / loadouts / keywords come from
 * the BSData wh40k-10e BattleScribe catalogues as an 11e stand-in.
 */

/** Bump when the persisted List shape changes incompatibly. */
export const SCHEMA_VERSION = 1

// ───────────────────────────── Game sizing ─────────────────────────────

export type GameSizeId = 'incursion' | 'strikeForce' | 'onslaught'

export interface GameSize {
  id: GameSizeId
  label: string
  /** Points ceiling, e.g. 2000 for Strike Force. */
  pointsLimit: number
  /** Detachment Points budget spent across selected detachments. */
  detachmentPoints: number
  /** Max enhancements selectable across the army. */
  enhancementLimit: number
  /** Max copies of a single (non-dedicated-transport) datasheet. */
  datasheetLimit: number
}

// ──────────────────────────── Force disposition ────────────────────────

/** The five 11e force dispositions (Munitorum "objective category"). */
export type ForceDisposition =
  | 'TAKE AND HOLD'
  | 'PURGE THE FOE'
  | 'DISRUPTION'
  | 'RECONNAISSANCE'
  | 'PRIORITY ASSETS'

// ───────────────────────────── Detachments ─────────────────────────────

export interface Enhancement {
  id: string
  name: string
  points: number
  /** Rules text (may be filled in later; points/role come from Munitorum). */
  description?: string
  /** "Upgrade"-type enhancements can go on non-hero units. */
  isUpgrade?: boolean
}

/** A detachment stratagem (from Wahapedia; see scripts/scrape-wahapedia.mjs). */
export interface Stratagem {
  name: string
  /** e.g. `1CP`. */
  cp: string
  /** e.g. `Battle Tactic`, `Epic Deed`. */
  category: string
  /** Effect text (WHEN/TARGET/EFFECT prose). */
  text: string
}

export interface Detachment {
  id: string
  name: string
  /** 1–3 DP. */
  detachmentPoints: number
  forceDisposition: ForceDisposition
  enhancements: Enhancement[]
  /** Detachment rule text (Wahapedia). Absent if not yet sourced. */
  rule?: string
  /** Detachment stratagems (Wahapedia). Absent if not yet sourced. */
  stratagems?: Stratagem[]
}

// ───────────────────────────── Datasheets ──────────────────────────────

/** A single statline profile. Vehicles/units can expose more than one. */
export interface Statline {
  /** Profile name; for single-profile units this matches the datasheet. */
  name: string
  movement: string // e.g. `6"`
  toughness: number
  save: string // e.g. `3+`
  wounds: number
  leadership: string // e.g. `6+`
  objectiveControl: number
  invulnerableSave?: string // e.g. `4+`
}

export interface WeaponProfile {
  id: string
  name: string
  range: string // `Melee` or e.g. `24"`
  attacks: string
  skill: string // BS/WS, e.g. `3+`
  strength: string
  armourPenetration: string // e.g. `-1`
  damage: string
  abilities?: string[] // e.g. ["Assault", "Devastating Wounds"]
}

/** A point in a unit's loadout that the user chooses between (level "B"). */
export interface WargearOption {
  id: string
  /** Human-readable rule, verbatim-ish from the datasheet. */
  description: string
  /** How many selections are allowed. */
  min: number
  max: number
  /** If the limit scales with unit size, e.g. 1 per 5 models. */
  perModels?: number
  choices: WargearChoice[]
}

export interface WargearChoice {
  id: string
  name: string
  /** Weapon profile ids this choice grants. */
  addWeapons?: string[]
  /** Weapon profile ids this choice removes from the default loadout. */
  removeWeapons?: string[]
  /** Points change; usually 0 in 10e/11e but modeled for safety. */
  pointsDelta?: number
}

export interface UnitSizeOption {
  /** Number of models in the unit for this option. */
  models: number
  points: number
}

export type UnitRole = 'leader' | 'support'

export interface Datasheet {
  id: string
  name: string
  /** Which compiled source it came from. */
  source: 'black-templars' | 'space-marines'
  /** Munitorum role tag, if any. */
  role?: UnitRole
  keywords: string[]
  factionKeywords: string[]
  statlines: Statline[]
  weapons: WeaponProfile[]
  /** Weapon profile ids equipped by default. */
  defaultLoadout: string[]
  wargearOptions: WargearOption[]
  /** Points by unit size (one entry = fixed size). */
  sizeOptions: UnitSizeOption[]
  /** Datasheet ids this unit (a LEADER) can attach to. */
  canLead?: string[]
  /** True if it occupies a transport/has the Dedicated Transport keyword. */
  isDedicatedTransport?: boolean
}

// ───────────────────────────── Catalogue root ──────────────────────────

export interface FactionCatalogue {
  schemaVersion: number
  id: 'black-templars'
  name: string
  /** Edition the data targets, for display + provenance. */
  edition: string
  gameSizes: GameSize[]
  detachments: Detachment[]
  datasheets: Datasheet[]
  /** Provenance for the "data last compiled" footer. */
  meta: {
    pointsSource: string
    statsSource: string
    compiledAt?: string
  }
}

// ─────────────────────────── User's saved list ─────────────────────────

export interface ListDetachment {
  detachmentId: string
  /** Enhancement ids chosen from this detachment. */
  enhancementIds: string[]
}

export interface ListUnit {
  /** Stable id for this unit instance within the list. */
  instanceId: string
  datasheetId: string
  /** Index into the datasheet's sizeOptions. */
  sizeOptionIndex: number
  /** optionId -> selected choiceId(s). */
  wargearSelections: Record<string, string[]>
  /** Enhancement assigned to this unit, if it's a hero/eligible. */
  enhancementId?: string
  /** instanceId of the unit this leader is attached to. */
  attachedToInstanceId?: string
  customName?: string
}

export interface SavedList {
  schemaVersion: number
  id: string
  name: string
  faction: 'black-templars'
  gameSizeId: GameSizeId
  /** 11e supports multiple detachments up to the DP budget. */
  detachments: ListDetachment[]
  units: ListUnit[]
  createdAt: string
  updatedAt: string
}
