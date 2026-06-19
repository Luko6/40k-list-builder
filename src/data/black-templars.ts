/**
 * Hand-authored Black Templars seed catalogue (Phase 1).
 *
 * Purpose: exercise the schema against real-shaped data and give the UI
 * something to render before the Phase 2 importer exists. It is intentionally
 * a SMALL slice: one detachment (Gladius Task Force) + four datasheets.
 *
 * Provenance / accuracy:
 *  - Points & enhancements: best-effort from the Munitorum Field Manual
 *    (https://mfm.warhammer-community.com/en/black-templars). These values are
 *    TO BE VERIFIED by the Phase 2 importer — LLM extraction of the MFM was
 *    inconsistent, so treat anything here as provisional.
 *  - Statlines / weapons / loadouts: known 10e values used as the 11e stand-in
 *    (per the data-sourcing plan), to be replaced by compiled BSData output.
 *
 * MVP scope: 2000pts (Strike Force) only.
 */

import type { FactionCatalogue } from './schema'
import { SCHEMA_VERSION } from './schema'

export const blackTemplars: FactionCatalogue = {
  schemaVersion: SCHEMA_VERSION,
  id: 'black-templars',
  name: 'Black Templars',
  edition: '11th (10e data stand-in)',

  gameSizes: [
    {
      id: 'strikeForce',
      label: 'Strike Force (2000 pts)',
      pointsLimit: 2000,
      detachmentPoints: 3,
      enhancementLimit: 4,
      datasheetLimit: 3,
    },
  ],

  detachments: [
    {
      id: 'gladius-task-force',
      name: 'Gladius Task Force',
      detachmentPoints: 3,
      forceDisposition: 'PRIORITY ASSETS',
      enhancements: [
        { id: 'adept-of-the-codex', name: 'Adept of the Codex', points: 20 },
        { id: 'artificer-armour', name: 'Artificer Armour', points: 10 },
        { id: 'fire-discipline', name: 'Fire Discipline', points: 25 },
        { id: 'the-honour-vehement', name: 'The Honour Vehement', points: 15 },
      ],
    },
  ],

  datasheets: [
    // ───────────────────────── Emperor's Champion ─────────────────────────
    {
      id: 'emperors-champion',
      name: "Emperor's Champion",
      source: 'black-templars',
      role: 'leader',
      keywords: ['Infantry', 'Character', 'Grenades', "Emperor's Champion"],
      factionKeywords: ['Adeptus Astartes', 'Black Templars'],
      statlines: [
        {
          name: "Emperor's Champion",
          movement: '6"',
          toughness: 4,
          save: '2+',
          wounds: 5,
          leadership: '6+',
          objectiveControl: 1,
          invulnerableSave: '4+',
        },
      ],
      weapons: [
        {
          id: 'ec-bolt-pistol',
          name: 'Bolt pistol',
          range: '12"',
          attacks: '1',
          skill: '3+',
          strength: '4',
          armourPenetration: '0',
          damage: '1',
          abilities: ['Pistol'],
        },
        {
          id: 'black-sword-strike',
          name: 'Black Sword (Strike)',
          range: 'Melee',
          attacks: '5',
          skill: '2+',
          strength: '8',
          armourPenetration: '-3',
          damage: '3',
        },
        {
          id: 'black-sword-sweep',
          name: 'Black Sword (Sweep)',
          range: 'Melee',
          attacks: '10',
          skill: '2+',
          strength: '6',
          armourPenetration: '-2',
          damage: '1',
        },
      ],
      defaultLoadout: ['ec-bolt-pistol', 'black-sword-strike', 'black-sword-sweep'],
      wargearOptions: [],
      sizeOptions: [{ models: 1, points: 70 }],
      canLead: ['crusader-squad'],
    },

    // ───────────────────────────── Marshal ────────────────────────────────
    {
      id: 'marshal',
      name: 'Marshal',
      source: 'black-templars',
      role: 'leader',
      keywords: ['Infantry', 'Character', 'Grenades', 'Marshal'],
      factionKeywords: ['Adeptus Astartes', 'Black Templars'],
      statlines: [
        {
          name: 'Marshal',
          movement: '6"',
          toughness: 4,
          save: '3+',
          wounds: 5,
          leadership: '6+',
          objectiveControl: 1,
          invulnerableSave: '4+',
        },
      ],
      weapons: [
        {
          id: 'marshal-mc-bolt-rifle',
          name: 'Master-crafted bolt rifle',
          range: '24"',
          attacks: '2',
          skill: '2+',
          strength: '4',
          armourPenetration: '-1',
          damage: '2',
          abilities: ['Assault'],
        },
        {
          id: 'marshal-plasma-pistol-std',
          name: 'Plasma pistol (standard)',
          range: '12"',
          attacks: '1',
          skill: '2+',
          strength: '7',
          armourPenetration: '-2',
          damage: '1',
          abilities: ['Pistol'],
        },
        {
          id: 'marshal-power-weapon',
          name: 'Master-crafted power weapon',
          range: 'Melee',
          attacks: '5',
          skill: '2+',
          strength: '5',
          armourPenetration: '-2',
          damage: '2',
        },
      ],
      defaultLoadout: [
        'marshal-mc-bolt-rifle',
        'marshal-plasma-pistol-std',
        'marshal-power-weapon',
      ],
      wargearOptions: [],
      sizeOptions: [{ models: 1, points: 85 }],
      canLead: ['crusader-squad'],
    },

    // ───────────────────────── Crusader Squad ─────────────────────────────
    {
      id: 'crusader-squad',
      name: 'Crusader Squad',
      source: 'black-templars',
      keywords: ['Infantry', 'Battleline', 'Grenades', 'Crusader Squad'],
      factionKeywords: ['Adeptus Astartes', 'Black Templars'],
      statlines: [
        {
          name: 'Sword Brother / Initiate',
          movement: '6"',
          toughness: 4,
          save: '3+',
          wounds: 2,
          leadership: '6+',
          objectiveControl: 2,
        },
        {
          name: 'Neophyte',
          movement: '6"',
          toughness: 4,
          save: '4+',
          wounds: 1,
          leadership: '6+',
          objectiveControl: 2,
        },
      ],
      weapons: [
        {
          id: 'cs-bolt-pistol',
          name: 'Bolt pistol',
          range: '12"',
          attacks: '1',
          skill: '3+',
          strength: '4',
          armourPenetration: '0',
          damage: '1',
          abilities: ['Pistol'],
        },
        {
          id: 'cs-bolt-rifle',
          name: 'Bolt rifle',
          range: '24"',
          attacks: '2',
          skill: '3+',
          strength: '4',
          armourPenetration: '-1',
          damage: '1',
          abilities: ['Assault'],
        },
        {
          id: 'cs-ccw',
          name: 'Close combat weapon',
          range: 'Melee',
          attacks: '2',
          skill: '3+',
          strength: '4',
          armourPenetration: '0',
          damage: '1',
        },
        {
          id: 'cs-meltagun',
          name: 'Meltagun',
          range: '12"',
          attacks: '1',
          skill: '3+',
          strength: '9',
          armourPenetration: '-4',
          damage: 'D6+2',
          abilities: ['Melta 2'],
        },
        {
          id: 'cs-plasma-gun-std',
          name: 'Plasma gun (standard)',
          range: '24"',
          attacks: '1',
          skill: '3+',
          strength: '7',
          armourPenetration: '-2',
          damage: '1',
          abilities: ['Rapid Fire 1'],
        },
        {
          id: 'cs-power-weapon',
          name: 'Power weapon',
          range: 'Melee',
          attacks: '3',
          skill: '3+',
          strength: '5',
          armourPenetration: '-2',
          damage: '1',
        },
      ],
      defaultLoadout: ['cs-bolt-rifle', 'cs-bolt-pistol', 'cs-ccw'],
      wargearOptions: [
        {
          id: 'cs-special-weapon',
          description:
            'For every 5 Initiates, 1 Initiate can replace their bolt rifle with a special weapon.',
          min: 0,
          max: 2,
          perModels: 5,
          choices: [
            {
              id: 'cs-special-meltagun',
              name: 'Meltagun',
              addWeapons: ['cs-meltagun'],
              removeWeapons: ['cs-bolt-rifle'],
            },
            {
              id: 'cs-special-plasma-gun',
              name: 'Plasma gun',
              addWeapons: ['cs-plasma-gun-std'],
              removeWeapons: ['cs-bolt-rifle'],
            },
          ],
        },
        {
          id: 'cs-sword-brother-melee',
          description:
            'The Sword Brother can replace their bolt rifle and close combat weapon with a power weapon.',
          min: 0,
          max: 1,
          choices: [
            {
              id: 'cs-sb-power-weapon',
              name: 'Power weapon',
              addWeapons: ['cs-power-weapon'],
              removeWeapons: ['cs-bolt-rifle', 'cs-ccw'],
            },
          ],
        },
      ],
      sizeOptions: [
        { models: 10, points: 110 },
        { models: 20, points: 150 },
      ],
    },

    // ───────────────────────────── Impulsor ───────────────────────────────
    {
      id: 'impulsor',
      name: 'Impulsor',
      source: 'space-marines',
      keywords: ['Vehicle', 'Transport', 'Dedicated Transport', 'Impulsor'],
      factionKeywords: ['Adeptus Astartes', 'Black Templars'],
      isDedicatedTransport: true,
      statlines: [
        {
          name: 'Impulsor',
          movement: '14"',
          toughness: 9,
          save: '3+',
          wounds: 11,
          leadership: '6+',
          objectiveControl: 2,
        },
      ],
      weapons: [
        {
          id: 'imp-storm-bolter',
          name: 'Storm bolter',
          range: '24"',
          attacks: '2',
          skill: '3+',
          strength: '4',
          armourPenetration: '0',
          damage: '1',
          abilities: ['Rapid Fire 2'],
        },
        {
          id: 'imp-ironhail-stubber',
          name: 'Ironhail heavy stubber',
          range: '36"',
          attacks: '3',
          skill: '3+',
          strength: '4',
          armourPenetration: '0',
          damage: '1',
          abilities: ['Rapid Fire 1'],
        },
        {
          id: 'imp-missile-array',
          name: 'Bellicatus missile array',
          range: '48"',
          attacks: 'D6',
          skill: '3+',
          strength: '8',
          armourPenetration: '-2',
          damage: '2',
          abilities: ['Indirect Fire'],
        },
      ],
      defaultLoadout: ['imp-storm-bolter', 'imp-storm-bolter'],
      wargearOptions: [
        {
          id: 'imp-pintle',
          description:
            'This model can be equipped with one Ironhail heavy stubber or one Bellicatus missile array.',
          min: 0,
          max: 1,
          choices: [
            {
              id: 'imp-add-stubber',
              name: 'Ironhail heavy stubber',
              addWeapons: ['imp-ironhail-stubber'],
            },
            {
              id: 'imp-add-missile-array',
              name: 'Bellicatus missile array',
              addWeapons: ['imp-missile-array'],
            },
          ],
        },
      ],
      sizeOptions: [{ models: 1, points: 100 }],
    },
  ],

  meta: {
    pointsSource: 'Munitorum Field Manual (provisional, to be verified)',
    statsSource: 'BSData wh40k-10e (stand-in for 11e)',
  },
}
