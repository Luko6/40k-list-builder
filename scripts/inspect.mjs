import { readFileSync } from 'node:fs'
const d = JSON.parse(readFileSync('src/data/generated/black-templars.json', 'utf8'))
const names = process.argv.slice(2)
const pick = names.length ? names : ["Emperor's Champion", 'Crusader Squad']
for (const name of pick) {
  const u = d.datasheets.find((x) => x.name === name)
  if (!u) { console.log(`(not found: ${name})`); continue }
  console.log(`\n=== ${u.name} (${u.id}) role:${u.role ?? '-'} ===`)
  console.log('keywords:', u.keywords.join(', '))
  console.log('faction:', u.factionKeywords.join(', '))
  for (const s of u.statlines)
    console.log(`  STAT ${s.name}: M${s.movement} T${s.toughness} Sv${s.save} W${s.wounds} Ld${s.leadership} OC${s.objectiveControl}${s.invulnerableSave ? ' inv' + s.invulnerableSave : ''}`)
  for (const w of u.weapons)
    console.log(`  WPN ${w.name}: ${w.range} A${w.attacks} ${w.skill} S${w.strength} AP${w.armourPenetration} D${w.damage}${w.abilities ? ' {' + w.abilities.join('|') + '}' : ''}`)
  console.log('  default:', u.defaultLoadout.join(', '))
  for (const o of u.wargearOptions)
    console.log(`  OPT "${o.description}" min${o.min}/max${o.max}: ${o.choices.map((c) => c.name).join(' / ')}`)
  if (u.canLead) console.log('  canLead:', u.canLead.join(', '))
  console.log('  sizeOptions:', JSON.stringify(u.sizeOptions))
}
