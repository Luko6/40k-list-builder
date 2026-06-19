/**
 * Black Templars catalogue, compiled by `npm run compile-data` from the
 * vendored BSData snapshot + Munitorum points overrides.
 *
 * The data itself lives in ./generated/black-templars.json (a build artifact,
 * committed so the static site needs no build step for data). This module is
 * the typed entry point the app imports. To change the data, edit the compiler
 * or scripts/points-overrides.json and re-run `npm run compile-data` — do not
 * hand-edit the generated JSON.
 */
import type { FactionCatalogue } from './schema'
import generated from './generated/black-templars.json'

// The JSON import is typed structurally as wide strings; the compiler is the
// source of truth for the shape, so we assert it at this single boundary.
export const blackTemplars = generated as unknown as FactionCatalogue
