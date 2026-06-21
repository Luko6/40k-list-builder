/**
 * compile-data: BSData wh40k-10e catalogues -> our Black Templars JSON.
 *
 * v1 scope: the 20 BT-specific datasheets curated as the Black Templars
 * catalogue's top-level entry links (this includes the BT-flavoured generic
 * vehicles like Impulsor/Repulsor). Generic Space Marines units imported via
 * importRootEntries are a follow-up pass.
 *
 * Division of sources (see data-sources/MANIFEST.md):
 *   - statlines / weapons / wargear / keywords / leader-attach  -> BSData cat
 *   - points-by-size / LEADER|SUPPORT role                      -> MFM overrides
 *
 * Output: src/data/generated/black-templars.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { XMLParser } from 'fast-xml-parser'

const SRC_DIR = 'data-sources/bsdata'
const OUT_DIR = 'src/data/generated'
const OUT_FILE = `${OUT_DIR}/black-templars.json`
const OVERRIDES_FILE = 'scripts/points-overrides.json'
const DETACHMENTS_FILE = 'scripts/detachments.json'
const DETACH_RULES_FILE = 'scripts/detachment-rules.json'
const EXTRA_FILE = 'scripts/extra-datasheets.json'
const SCHEMA_VERSION = 1

// Fallback if the scraper hasn't produced detachments.json yet (e.g. fresh
// checkout). Matches the MFM's Gladius Task Force entry.
const FALLBACK_DETACHMENTS = [
  {
    id: 'gladius-task-force', name: 'Gladius Task Force', detachmentPoints: 3,
    forceDisposition: 'PRIORITY ASSETS',
    enhancements: [
      { id: 'adept-of-the-codex', name: 'Adept of the Codex', points: 20 },
      { id: 'artificer-armour', name: 'Artificer Armour', points: 10 },
      { id: 'fire-discipline', name: 'Fire Discipline', points: 25 },
      { id: 'the-honour-vehement', name: 'The Honour Vehement', points: 15 },
    ],
  },
]

const ALWAYS_ARRAY = new Set([
  'catalogueLink', 'entryLink', 'infoLink', 'selectionEntry',
  'selectionEntryGroup', 'profile', 'characteristic', 'cost', 'categoryLink',
  'categoryEntry', 'constraint', 'modifier',
])
const parser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '',
  isArray: (name) => ALWAYS_ARRAY.has(name),
})

const FILES = [
  'Imperium - Black Templars.cat',
  'Imperium - Space Marines.cat',
  'Warhammer 40,000.gst',
]
const roots = FILES.map((f) => parser.parse(readFileSync(`${SRC_DIR}/${f}`, 'utf8')))
const btCatalogue = roots[0].catalogue

// Index every node carrying an id, across all three files.
const byId = new Map()
function index(node) {
  if (node == null || typeof node !== 'object') return
  if (typeof node.id === 'string' && !byId.has(node.id)) byId.set(node.id, node)
  for (const k of Object.keys(node)) {
    const c = node[k]
    if (Array.isArray(c)) c.forEach(index)
    else if (typeof c === 'object') index(c)
  }
}
roots.forEach(index)

// Resolve a link node (entryLink/infoLink) to its definition; else return as-is.
function resolve(node) {
  if (node?.targetId && byId.has(node.targetId)) return byId.get(node.targetId)
  return node
}

const slug = (s) =>
  s.toLowerCase().replace(/['’.()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const arr = (x) => (Array.isArray(x) ? x : x == null ? [] : [x])
const chars = (profile) =>
  Object.fromEntries(arr(profile?.characteristics?.characteristic).map((c) => [c.name, c['#text']]))

// Groups/links that are meta (not part of a unit's wargear) — don't descend.
// Exact-match the short ambiguous words so unit names like "Crusader Squad"
// and "Crusade Ancient" are not mistaken for the narrative "Crusade" group.
const SKIP_EXACT = new Set(['Crusade', 'Enhancement', 'Enhancements', 'Warlord', 'Configuration'])
const SKIP_RE =
  /\b(detachment|battle honours?|battle scars?|crusade relics?|battle traits?|weapon modifications?|show\/hide)\b/i
const skip = (name) => !!name && (SKIP_EXACT.has(name) || SKIP_RE.test(name))

// Mode-tagged datasheet variants out of MVP scope (narrative/legacy).
const MODE_TAG = /\[(legends|crucible)\]/i

// Walk a unit's subtree, resolving links, collecting profiles by type.
// Returns { unitProfiles, weaponProfiles, abilities, groups }.
function collect(entry) {
  const out = { unitProfiles: [], weaponProfiles: [], abilities: [], groups: [] }
  const seen = new Set()

  function walk(node, inOptionalGroup) {
    if (node == null || typeof node !== 'object') return
    const def = resolve(node)
    if (def?.id) {
      if (seen.has(def.id)) return
      seen.add(def.id)
    }
    if (def !== node && skip(node.name)) return
    if (skip(def.name)) return

    for (const p of arr(def.profiles?.profile)) {
      if (p.typeName === 'Unit' || p.typeName === 'Transport') out.unitProfiles.push(p)
      else if (p.typeName === 'Ranged Weapons' || p.typeName === 'Melee Weapons')
        out.weaponProfiles.push({ profile: p, optional: inOptionalGroup })
      else if (p.typeName === 'Abilities') out.abilities.push(p)
    }
    // infoLinks of type profile (weapons/invuln defined as shared profiles)
    for (const il of arr(def.infoLinks?.infoLink)) {
      if (il.type === 'profile') walk(il, inOptionalGroup)
    }
    // child entries
    for (const se of arr(def.selectionEntries?.selectionEntry)) walk(se, inOptionalGroup)
    for (const el of arr(def.entryLinks?.entryLink)) walk(el, inOptionalGroup)
    // option groups
    for (const g of arr(def.selectionEntryGroups?.selectionEntryGroup)) {
      if (skip(g.name)) continue
      out.groups.push(g)
      walk(g, true)
    }
  }
  walk(entry, false)
  return out
}

function statlineFrom(p) {
  const c = chars(p)
  return {
    name: p.name,
    movement: String(c.M ?? ''),
    toughness: Number(c.T) || 0,
    save: String(c.SV ?? ''),
    wounds: Number(c.W) || 0,
    leadership: String(c.LD ?? ''),
    objectiveControl: Number(c.OC) || 0,
  }
}

// The cat prefixes some weapon profile names with a "➤ " bullet — strip it.
const cleanName = (s) => String(s).replace(/^[➤▶»\s]+/, '').trim()

function weaponFrom(p) {
  const c = chars(p)
  const melee = p.typeName === 'Melee Weapons'
  const name = cleanName(p.name)
  const w = {
    id: slug(name) || p.id,
    name,
    range: melee ? 'Melee' : String(c.Range ?? ''),
    attacks: String(c.A ?? ''),
    skill: String((melee ? c.WS : c.BS) ?? ''),
    strength: String(c.S ?? ''),
    armourPenetration: String(c.AP ?? '0'),
    damage: String(c.D ?? ''),
  }
  const kw = c.Keywords && c.Keywords !== '-' ? String(c.Keywords) : ''
  if (kw) w.abilities = kw.split(',').map((s) => s.trim()).filter(Boolean)
  return w
}

function invulnFrom(abilities) {
  for (const a of abilities) {
    if (!/invulnerable/i.test(a.name)) continue
    const desc = chars(a).Description ?? ''
    const m = String(desc).match(/(\d\+)\s*invulnerable/i)
    if (m) return m[1]
  }
  return undefined
}

function canLeadFrom(abilities) {
  const leader = abilities.find((a) => a.name === 'Leader')
  if (!leader) return undefined
  const desc = String(chars(leader).Description ?? '')
  const units = desc
    .split('\n')
    .map((l) => l.replace(/^[\s■•\-*]+/, '').trim())
    .filter((l) => l && !/can be attached/i.test(l))
  return units.length ? units.map(slug) : undefined
}

function keywordsFrom(entry, link) {
  // Categories can be declared on the shared entry AND overridden/added on the
  // top-level entryLink (e.g. BT tags Chaplain Grimaldus "Epic Hero" on the
  // link, not the shared entry), so merge both.
  const links = [
    ...arr(entry.categoryLinks?.categoryLink),
    ...arr(link?.categoryLinks?.categoryLink),
  ]
  const keywords = []
  const factionKeywords = []
  const seen = new Set()
  for (const l of links) {
    const name = l.name ?? ''
    if (!name || seen.has(name)) continue
    seen.add(name)
    if (name.startsWith('Faction:')) factionKeywords.push(name.replace('Faction:', '').trim())
    else if (!/^Configuration$/i.test(name)) keywords.push(name)
  }
  return { keywords, factionKeywords }
}

function ptsFrom(entry) {
  const cost = arr(entry.costs?.cost).find((c) => c.name === 'pts')
  return cost ? Number(cost.value) : 0
}

// Map a selectionEntryGroup to a WargearOption (best-effort).
function wargearOption(g) {
  const constraints = arr(g.constraints?.constraint)
  const min = Number(constraints.find((c) => c.type === 'min')?.value ?? 0)
  const maxRaw = constraints.find((c) => c.type === 'max')?.value
  const max = maxRaw != null ? Number(maxRaw) : 1
  const choices = []
  const collectChoice = (node) => {
    const def = resolve(node)
    const wp = []
    for (const p of arr(def.profiles?.profile)) {
      if (p.typeName === 'Ranged Weapons' || p.typeName === 'Melee Weapons')
        wp.push(slug(cleanName(p.name)) || p.id)
    }
    for (const il of arr(def.infoLinks?.infoLink)) {
      if (il.type === 'profile') {
        const pd = resolve(il)
        if (pd.typeName === 'Ranged Weapons' || pd.typeName === 'Melee Weapons')
          wp.push(slug(cleanName(pd.name)) || pd.id)
      }
    }
    choices.push({ id: slug(def.name) || def.id, name: def.name, ...(wp.length ? { addWeapons: wp } : {}) })
  }
  for (const se of arr(g.selectionEntries?.selectionEntry)) collectChoice(se)
  for (const el of arr(g.entryLinks?.entryLink)) collectChoice(el)
  return {
    id: slug(g.name) || g.id,
    description: g.name,
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 1,
    choices,
  }
}

// ── Build a datasheet from a top-level entry link ──────────────────────
const overrides = existsSync(OVERRIDES_FILE)
  ? JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8'))
  : {}

// Detachment rules/stratagems + (global) enhancement descriptions from
// Wahapedia (scripts/scrape-wahapedia.mjs). Merged over the MFM base.
const detachRulesFile = existsSync(DETACH_RULES_FILE)
  ? JSON.parse(readFileSync(DETACH_RULES_FILE, 'utf8'))
  : {}
const detachRules = detachRulesFile.detachments ?? {}
const enhDescriptions = detachRulesFile.enhancementDescriptions ?? {}

const detachments = (
  existsSync(DETACHMENTS_FILE)
    ? JSON.parse(readFileSync(DETACHMENTS_FILE, 'utf8')).detachments ?? FALLBACK_DETACHMENTS
    : FALLBACK_DETACHMENTS
)
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((d) => {
    const r = detachRules[d.id]
    const enhancements = d.enhancements.map((e) =>
      enhDescriptions[e.id] ? { ...e, description: enhDescriptions[e.id] } : e,
    )
    return {
      ...d,
      ...(r?.rule ? { rule: r.rule } : {}),
      ...(r?.stratagems?.length ? { stratagems: r.stratagems } : {}),
      enhancements,
    }
  })

function buildDatasheet(link, source) {
  const entry = resolve(link)
  const c = collect(entry)
  if (c.unitProfiles.length === 0) return null

  const statMap = new Map()
  for (const p of c.unitProfiles) if (!statMap.has(p.name)) statMap.set(p.name, statlineFrom(p))
  const wMap = new Map()
  const optionalIds = new Set()
  for (const { profile, optional } of c.weaponProfiles) {
    const w = weaponFrom(profile)
    if (!wMap.has(w.id)) wMap.set(w.id, w)
    if (optional) optionalIds.add(w.id)
  }
  const invuln = invulnFrom(c.abilities)
  if (invuln) for (const s of statMap.values()) s.invulnerableSave = invuln

  const id = slug(link.name)
  // BSData uses US spelling ("Armor"); the Munitorum uses UK ("Armour").
  const ov = overrides[id] ?? overrides[id.replace(/armor\b/, 'armour')] ?? {}
  const basePts = ptsFrom(entry)
  const { keywords, factionKeywords } = keywordsFrom(entry, link)
  const weapons = [...wMap.values()]
  // Prefer the Munitorum's can-lead list (clean, authoritative); fall back to
  // the BSData Leader-ability text parse for anything the MFM didn't cover.
  const canLead = ov.canLead ?? canLeadFrom(c.abilities)

  return {
    id,
    name: link.name,
    source,
    ...(ov.role ? { role: ov.role } : {}),
    keywords,
    factionKeywords,
    statlines: [...statMap.values()],
    weapons,
    defaultLoadout: weapons.filter((w) => !optionalIds.has(w.id)).map((w) => w.id),
    wargearOptions: c.groups.map(wargearOption),
    sizeOptions: ov.sizeOptions ?? [{ models: 1, points: basePts }],
    ...(canLead ? { canLead } : {}),
    _report: `${statMap.size} statline(s), ${weapons.length} weapon(s), ${c.groups.length} option group(s), pts ${basePts}${ov.sizeOptions ? ' (MFM)' : ''}`,
  }
}

// Black Templars CANNOT field psykers, and bring their own characters rather
// than other chapters' named heroes — so generic SM Epic Heroes/Psykers are
// excluded. Legends units are out of scope.
function btLegality(link) {
  if (MODE_TAG.test(link.name)) return 'mode-tag'
  const cats = arr(resolve(link).categoryLinks?.categoryLink).map((c) => c.name)
  if (cats.includes('Psyker')) return 'psyker'
  if (cats.includes('Epic Hero')) return 'epic-hero (other chapter)'
  return null
}

const datasheets = []
const byOurId = new Map()
const report = []

// Pass 1: BT-specific curated units (always legal, win on dedupe).
for (const link of arr(btCatalogue.entryLinks?.entryLink)) {
  if (MODE_TAG.test(link.name)) continue
  const ds = buildDatasheet(link, 'black-templars')
  if (!ds) { report.push(`BT SKIP (no Unit profile): ${link.name}`); continue }
  const { _report, ...clean } = ds
  datasheets.push(clean)
  byOurId.set(clean.id, clean)
  report.push(`BT  ${link.name}: ${_report}`)
}

// Pass 2: generic Space Marines units imported into BT, minus illegal ones.
const smCatalogue = roots[1].catalogue
let smAdded = 0, smExcluded = 0, smDuped = 0
for (const link of arr(smCatalogue.entryLinks?.entryLink)) {
  const reason = btLegality(link)
  if (reason) { smExcluded++; continue }
  const id = slug(link.name)
  if (byOurId.has(id)) { smDuped++; continue }
  const ds = buildDatasheet(link, 'space-marines')
  if (!ds) continue
  const { _report, ...clean } = ds
  datasheets.push(clean)
  byOurId.set(clean.id, clean)
  smAdded++
}
report.push(`\nSM import: +${smAdded} added, ${smDuped} duplicates of BT entries, ${smExcluded} excluded (mode-tag/psyker/epic-hero)`)

// Pass 3: hand-authored extras (allied Imperial Agents placeholders, etc.).
if (existsSync(EXTRA_FILE)) {
  const extras = JSON.parse(readFileSync(EXTRA_FILE, 'utf8')).datasheets ?? []
  let added = 0
  for (const ds of extras) {
    if (byOurId.has(ds.id)) continue
    datasheets.push(ds)
    byOurId.set(ds.id, ds)
    added++
  }
  report.push(`Extra datasheets: +${added}`)
}

// Pass 3: repair canLead. It's slugified from the Leader ability text, so the
// names don't always match a datasheet id ("Sword Brethren" -> the datasheet
// id is `sword-brethren-squad`) and trailing rule-text sentences can leak in.
// Resolve each entry against the real id set; drop what can't be resolved.
const idSet = new Set(datasheets.map((d) => d.id))
const resolveLead = (raw) => {
  if (idSet.has(raw)) return raw
  if (idSet.has(`${raw}-squad`)) return `${raw}-squad`
  return null
}
let leadFixed = 0, leadDropped = 0
for (const d of datasheets) {
  if (!d.canLead) continue
  for (const raw of d.canLead) {
    const r = resolveLead(raw)
    if (r === null) leadDropped++
    else if (r !== raw) leadFixed++
  }
  const resolved = [...new Set(d.canLead.map(resolveLead).filter(Boolean))]
  if (resolved.length) d.canLead = resolved
  else delete d.canLead
}
report.push(`canLead repair: ${leadFixed} id(s) remapped, ${leadDropped} unresolved entr(ies) dropped`)

const catalogue = {
  schemaVersion: SCHEMA_VERSION,
  id: 'black-templars',
  name: 'Black Templars',
  edition: '11th (10e BSData stand-in)',
  gameSizes: [
    { id: 'strikeForce', label: 'Strike Force (2000 pts)', pointsLimit: 2000, detachmentPoints: 3, enhancementLimit: 4, datasheetLimit: 3 },
  ],
  detachments,
  datasheets: datasheets.sort((a, b) => a.name.localeCompare(b.name)),
  meta: {
    pointsSource: 'Munitorum overrides where present, else BSData 10e cost',
    statsSource: `BSData wh40k-10e @ 97dfd33`,
  },
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(catalogue, null, 2) + '\n')

console.log(report.join('\n'))
console.log(`\n✓ ${datasheets.length} datasheets -> ${OUT_FILE}`)
