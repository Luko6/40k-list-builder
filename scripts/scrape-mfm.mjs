/**
 * scrape-mfm: extract Black Templars points (+ roles) from the Munitorum Field
 * Manual site's React Flight (RSC) payload.
 *
 * The MFM is a Next.js App Router app; the page data is server-rendered into a
 * flight payload returned when the route is requested with an `RSC: 1` header.
 * Point values are lazy refs ($L<id>) resolved by sibling flight rows
 * (`<id>:["$","span",null,{"children":"80 pts"}]`).
 *
 * Outputs (both consumed by compile-data):
 *   - scripts/points-overrides.json: unit points by size, keyed by name slug.
 *   - scripts/detachments.json: every detachment with DP, force disposition,
 *     and enhancements (points + (Upgrade) flag).
 * Run `node scripts/scrape-mfm.mjs` (add --cached to parse the vendored payload
 * offline) then `npm run compile-data`. Pass --dump to print the parse.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const URL = 'https://mfm.warhammer-community.com/en/black-templars'
const CACHE = 'data-sources/mfm/black-templars.rsc.txt'
const OUT = 'scripts/points-overrides.json'
const DETACH_OUT = 'scripts/detachments.json'

const slug = (s) =>
  s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Title-case an UPPERCASE name, keeping common minor words lowercase unless
 *  first ("MARSHAL'S HOUSEHOLD" -> "Marshal's Household", "COMPANIONS OF
 *  VEHEMENCE" -> "Companions of Vehemence"). */
const MINOR_WORDS = new Set(['of', 'the', 'and', 'in', 'on', 'to', 'for', 'a', 'an', 'at', 'by'])
const titleCase = (s) =>
  s
    .toLowerCase()
    .split(' ')
    .map((w, i) => (!w || (i > 0 && MINOR_WORDS.has(w)) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ')

const FORCE_DISPOSITIONS = /TAKE AND HOLD|PURGE THE FOE|DISRUPTION|RECONNAISSANCE|PRIORITY ASSETS/

async function getPayload() {
  if (process.argv.includes('--cached') && existsSync(CACHE)) {
    return readFileSync(CACHE, 'utf8')
  }
  const res = await fetch(URL, { headers: { RSC: '1' } })
  if (!res.ok) throw new Error(`MFM fetch ${res.status}`)
  const text = await res.text()
  if (!existsSync('data-sources/mfm')) mkdirSync('data-sources/mfm', { recursive: true })
  writeFileSync(CACHE, text)
  return text
}

// Flight payload point values are lazy refs ($L<id>) resolved by sibling rows
// (`<id>:[...,"children":"80 pts"]`). Build a resolver from id -> number.
function buildResolvePts(text) {
  const refMap = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([0-9a-f]+):(.*)$/i)
    if (!m) continue
    const c = m[2].match(/"children":"([^"]+)"/)
    if (c) refMap[m[1]] = c[1]
  }
  const resolvePts = (id) => {
    const v = refMap[id]
    const n = v && v.match(/(\d+)\s*pts/)
    return n ? Number(n[1]) : null
  }
  return { refMap, resolvePts }
}

function parse(text) {
  const { refMap, resolvePts } = buildResolvePts(text)

  // 2) walk name spans. Cost-label spans ("YOUR UNIT COSTS" etc.) and the
  // LEADER/SUPPORT headers sit between a unit's name and its cost lines, so we
  // must NOT treat them as names — only real names bound a unit's window.
  const isLabel = (n) =>
    /^YOUR\b/.test(n) || n === 'LEADER' || n === 'SUPPORT' ||
    /^(UNITS|DETACHMENTS|ENHANCEMENTS|SPACE MARINES)$/.test(n)

  const nameRe = /"children":"([^"]+)"\}\]/g
  const names = []
  for (let m; (m = nameRe.exec(text)); ) if (!isLabel(m[1])) names.push({ name: m[1], idx: m.index })

  // Sum every integer in the model text: "1 model"->1, "5 models"->5,
  // "1 Sword Brother, 4 Neophytes, 5 Initiates"->10.
  const sumModels = (t) => (t.match(/\d+/g) ?? []).reduce((a, n) => a + Number(n), 0) || 1

  const units = []
  for (let i = 0; i < names.length; i++) {
    const win = text.slice(names[i].idx, names[i + 1]?.idx ?? text.length)
    const costRe = /\[false,"([^"]+)"\]\}\],"\$L([0-9a-f]+)"/g
    const sizeOptions = []
    for (let cm; (cm = costRe.exec(win)); ) {
      const pts = resolvePts(cm[2])
      if (pts == null) continue
      sizeOptions.push({ modelsText: cm[1], models: sumModels(cm[1]), points: pts })
    }
    if (sizeOptions.length) units.push({ name: names[i].name, sizeOptions })
  }
  return { units, refCount: Object.keys(refMap).length }
}

/**
 * Parse the DETACHMENTS section. Each detachment is a card with a name
 * (`text-xl break-all`), a "<n>DP" badge, a force-disposition banner, and an
 * ENHANCEMENTS list whose rows are `"children":"<Name>"}],"$L<id>"` (the ref
 * resolves to "<n> pts"). Black Templars armies may take both the BT-specific
 * detachments and the generic Space Marines ones, so we keep all of them.
 */
function parseDetachments(text) {
  const { resolvePts } = buildResolvePts(text)
  // Detachment cards sit between the DETACHMENTS and UNITS section headers.
  const end = text.indexOf('"children":"UNITS"')
  const nameRe = /"className":"text-xl break-all","children":"([^"]+)"/g
  const names = [...text.matchAll(nameRe)]
  const enhRe = /"children":"([^"]+)"\}\],"\$L([0-9a-f]+)"/g

  const detachments = []
  for (let i = 0; i < names.length; i++) {
    const start = names[i].index
    const stop = i + 1 < names.length ? names[i + 1].index : end > start ? end : text.length
    const win = text.slice(start, stop)

    const dp = win.match(/"text-sm self-end pl-2","children":"(\d+)\s*DP"/)
    const disp = win.match(FORCE_DISPOSITIONS)

    const enhancements = []
    enhRe.lastIndex = 0
    for (let em; (em = enhRe.exec(win)); ) {
      const points = resolvePts(em[2])
      if (points == null) continue
      const isUpgrade = /\(Upgrade\)\s*$/.test(em[1])
      const name = em[1].replace(/\s*\(Upgrade\)\s*$/, '').trim()
      enhancements.push({ id: slug(name), name, points, ...(isUpgrade ? { isUpgrade: true } : {}) })
    }

    detachments.push({
      id: slug(names[i][1]),
      name: titleCase(names[i][1]),
      detachmentPoints: dp ? Number(dp[1]) : 0,
      forceDisposition: disp ? disp[0] : 'TAKE AND HOLD',
      enhancements,
    })
  }
  return detachments
}

const text = await getPayload()
const { units, refCount } = parse(text)
const detachments = parseDetachments(text)
const enhCount = detachments.reduce((n, d) => n + d.enhancements.length, 0)
console.log(
  `payload chars: ${text.length}, refs: ${refCount}, units parsed: ${units.length}, ` +
    `detachments: ${detachments.length} (${enhCount} enhancements)`,
)

if (process.argv.includes('--dump')) {
  for (const u of units.slice(0, 60)) {
    console.log(`${u.name}: ${u.sizeOptions.map((s) => `${s.modelsText}=${s.points}`).join(' | ')}`)
  }
  for (const d of detachments) {
    console.log(
      `${d.name} [${d.forceDisposition}] ${d.detachmentPoints}DP: ` +
        d.enhancements.map((e) => `${e.name}${e.isUpgrade ? '*' : ''}=${e.points}`).join(', '),
    )
  }
  process.exit(0)
}

// Build overrides keyed by slug; preserve any roles already in the file.
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const out = {
  _comment:
    'AUTO-GENERATED by scripts/scrape-mfm.mjs from the Munitorum Field Manual RSC payload. Keyed by datasheet-name slug. Re-run after MFM updates, then npm run compile-data. "role" is preserved from prior manual edits.',
}
for (const u of units) {
  const id = slug(u.name)
  const sizeOptions = u.sizeOptions.map((s) => ({ models: s.models ?? 1, points: s.points }))
  out[id] = { ...(prev[id]?.role ? { role: prev[id].role } : {}), sizeOptions }
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`✓ wrote ${Object.keys(out).length - 1} unit overrides -> ${OUT}`)

const detachOut = {
  _comment:
    'AUTO-GENERATED by scripts/scrape-mfm.mjs from the Munitorum Field Manual RSC payload. All detachments legal for Black Templars (BT-specific + generic Space Marines). Re-run after MFM updates, then npm run compile-data.',
  detachments,
}
writeFileSync(DETACH_OUT, JSON.stringify(detachOut, null, 2) + '\n')
console.log(`✓ wrote ${detachments.length} detachments -> ${DETACH_OUT}`)
