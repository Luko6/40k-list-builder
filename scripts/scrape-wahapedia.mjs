/**
 * scrape-wahapedia: detachment RULES, STRATAGEMS, and ENHANCEMENT descriptions
 * for Black Templars from Wahapedia (the MFM is points-only).
 *
 * Source page (vendored): data-sources/wahapedia/black-templars.html
 *   https://wahapedia.ru/wh40k10ed/factions/space-marines/black-templars
 * Wahapedia keeps the wh40k10ed path but serves current (11e) content. Only the
 * detachments visible in the page's static HTML are captured — some of the
 * newest BT detachments load behind its JS filter and won't be present.
 *
 * Output: scripts/detachment-rules.json, keyed by detachment-name slug:
 *   { <slug>: { rule, stratagems: [{name,cp,category,text}], enhancements: {<slug>: desc} } }
 * compile-data merges this over the MFM-derived detachments.json — kept separate
 * so the two scrapers stay independent and idempotent.
 *
 * Run: node scripts/scrape-wahapedia.mjs  (add --cached to use the vendored page)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const URL = 'https://wahapedia.ru/wh40k10ed/factions/space-marines/black-templars'
const CACHE = 'data-sources/wahapedia/black-templars.html'
const OUT = 'scripts/detachment-rules.json'
const DETACHMENTS_FILE = 'scripts/detachments.json'

// Valid detachment slugs (from the MFM list) — outline_header is also used for
// non-detachment sub-sections (Enhancements/Stratagems/army rules), so we only
// treat headers matching a real detachment as section boundaries.
const validDetachIds = new Set(
  existsSync(DETACHMENTS_FILE)
    ? JSON.parse(readFileSync(DETACHMENTS_FILE, 'utf8')).detachments.map((d) => d.id)
    : [],
)

const slug = (s) =>
  s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function getPage() {
  if (process.argv.includes('--cached') && existsSync(CACHE)) return readFileSync(CACHE, 'utf8')
  const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`Wahapedia fetch ${res.status}`)
  const text = await res.text()
  if (!existsSync('data-sources/wahapedia')) mkdirSync('data-sources/wahapedia', { recursive: true })
  writeFileSync(CACHE, text)
  return text
}

const ENT = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”',
  '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…',
}
const decode = (s) => s.replace(/&[a-z#0-9]+;/gi, (m) => ENT[m] ?? ' ')

/** Strip HTML to readable text, keeping block breaks. */
function htmlToText(html) {
  return decode(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h2|h3)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

const html = await getPage()

// ── Stratagems: each str10Name block carries its detachment in str10Type ───
// ("Gladius Task Force – Battle Tactic Stratagem"). Group by detachment.
const stratagemsByDetach = {}
const nameRe = /<div class="str10Name">([\s\S]*?)<\/div>/g
const starts = [...html.matchAll(nameRe)].map((m) => ({ name: htmlToText(m[1]), idx: m.index }))
for (let i = 0; i < starts.length; i++) {
  const win = html.slice(starts[i].idx, starts[i + 1]?.idx ?? starts[i].idx + 6000)
  const cp = win.match(/str10CP">([^<]*)</)?.[1]?.trim() ?? ''
  const type = htmlToText(win.match(/str10Type">([\s\S]*?)<\/div>/)?.[1] ?? '')
  const text = htmlToText(win.match(/str10Text">([\s\S]*?)(?=<div class="str10Name"|<a name=|$)/)?.[1] ?? '')
  // type = "<Detachment> – <Category> Stratagem"
  const [detPart, catPart] = type.split(/[–—-]/).map((s) => s.trim())
  if (!detPart) continue
  const key = slug(detPart)
  const category = (catPart ?? '').replace(/\s*Stratagem\s*$/i, '').trim()
  const list = (stratagemsByDetach[key] ??= [])
  // Wahapedia renders responsive duplicates — keep one per stratagem name.
  if (!list.some((s) => s.name === starts[i].name)) list.push({ name: starts[i].name, cp, category, text })
}

// ── Detachment sections: header is either <h2 class="outline_header">NAME</h2>
// (preceded by <a name="slug">) or <div class="detachName">NAME Detachment</div>.
// Within each we grab the rule prose and enhancement descriptions.
const headerRe =
  /<div class="detachName">([\s\S]*?)<\/div>|<h2 class="outline_header">([\s\S]*?)<\/h2>/g
const heads = [...html.matchAll(headerRe)]
  .map((m) => ({
    // The h2 can contain an expansion-logo <img> before the name, so strip tags.
    name: htmlToText(m[1] ?? m[2]).replace(/ Detachment$/, '').trim(),
    idx: m.index,
    end: m.index + m[0].length,
  }))
  // Keep only real detachment headers as section boundaries (when we know them).
  .filter((h) => !validDetachIds.size || validDetachIds.has(slug(h.name)))

const rulesByDetach = {}
for (let i = 0; i < heads.length; i++) {
  const key = slug(heads[i].name)
  const section = html.slice(heads[i].end, heads[i + 1]?.idx ?? heads[i].end + 20000)

  // Rule = prose between the header and the first Stratagems/Enhancements block,
  // minus the ShowFluff flavour paragraphs.
  const cut = section.search(/<a name="Stratagems"|<div class="str10Name"|<h2>Enhancements|<a name="Enhancements"/)
  const rulePart = (cut >= 0 ? section.slice(0, cut) : section)
    .replace(/<p class="ShowFluff[^"]*">[\s\S]*?<\/p>/g, '')
  const rule = htmlToText(rulePart)
  if (rule) rulesByDetach[key] = { rule }
}

// Enhancement descriptions, scanned GLOBALLY by name (names are unique, and
// section boundaries are unreliable). Each block is:
//   <ul class="EnhancementsPts"><li><span>Name</span> <span>N pts</span></li></ul>
//   <p class="ShowFluff…">flavour</p> <p>…rules…</p>
const enhancementDescriptions = {}
const enhRe =
  /<ul class="EnhancementsPts">\s*<li>\s*<span>([^<]+)<\/span>[\s\S]*?<\/ul>([\s\S]*?)(?=<ul class="EnhancementsPts"|<a name=|<h2|<div class="detachName"|$)/g
for (const em of html.matchAll(enhRe)) {
  const name = em[1].trim()
  if (!name) continue
  const desc = htmlToText(em[2].replace(/<p class="ShowFluff[^"]*">[\s\S]*?<\/p>/g, ''))
  if (desc && !enhancementDescriptions[slug(name)]) enhancementDescriptions[slug(name)] = desc
}

// ── Merge into one keyed object ────────────────────────────────────────────
const out = {
  _comment:
    'AUTO-GENERATED by scripts/scrape-wahapedia.mjs from the vendored Wahapedia BT page. detachments keyed by slug -> { rule, stratagems }. enhancementDescriptions keyed by enhancement slug (global). Only content present in the static page is covered.',
  detachments: {},
  enhancementDescriptions,
}
const keys = new Set([...Object.keys(rulesByDetach), ...Object.keys(stratagemsByDetach)])
for (const k of keys) {
  out.detachments[k] = {
    ...(rulesByDetach[k]?.rule ? { rule: rulesByDetach[k].rule } : {}),
    ...(stratagemsByDetach[k]?.length ? { stratagems: stratagemsByDetach[k] } : {}),
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')

const withRule = [...keys].filter((k) => rulesByDetach[k]?.rule).length
const withStrats = [...keys].filter((k) => stratagemsByDetach[k]?.length).length
console.log(
  `✓ ${keys.size} detachments -> ${OUT} (${withRule} with rule, ${withStrats} with stratagems, ` +
    `${Object.keys(enhancementDescriptions).length} enhancement descriptions)`,
)
if (process.argv.includes('--dump')) {
  for (const k of keys) {
    const d = out.detachments[k]
    console.log(`\n## ${k}`)
    if (d.rule) console.log('RULE:', d.rule.slice(0, 120).replace(/\n/g, ' '))
    if (d.stratagems) console.log('STRATS:', d.stratagems.map((s) => `${s.name}(${s.cp})`).join(', '))
  }
}
