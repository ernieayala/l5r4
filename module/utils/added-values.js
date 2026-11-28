/**
 * @module utils/added-values
 * @description What preparation adds to an actor's stored numbers: rules and Active Effects. A configuration window
 * edits the stored value and shows the addition beside it, so saving never writes the addition into storage (#184).
 * Pure.
 */

import { getValueAt } from "./browser-filter.js";

/**
 * The amount preparation added to each stored number, for each path where the prepared value differs.
 * @param {object} stored - The stored system data (`actor._source.system`)
 * @param {object} prepared - The prepared system data (`actor.system`)
 * @param {string[]} paths - Dotted paths of number fields, as the form names them
 * @returns {Record<string, {value: number, total: number}>} Keyed by path: the amount added and the prepared total
 */
export function buildAddedValues(stored, prepared, paths) {
  const added = {};
  for (const path of paths) {
    const base = Number(getValueAt(stored, path)) || 0;
    const total = Number(getValueAt(prepared, path)) || 0;
    if (total !== base) {
      added[path] = { value: total - base, total };
    }
  }
  return added;
}
