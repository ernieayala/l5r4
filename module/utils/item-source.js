/**
 * @module utils/item-source
 * @description Migrations of a whole Item source, which L5R4Item.migrateData runs before the subtype's schema cleans
 * `system`: only the whole source holds both `system` and `flags`. Pure functions on plain objects.
 */

import { SYS_ID } from "../config/constants.js";

/**
 * A 3.2.1 kata's or kiho's `cost`, the XP 3.2.1 charged, which 4.0 replaces with the Mastery Level (#43): it moves
 * into the `legacyCost` flag, so the world migration can tell the GM where the XP changed, and a kiho at 0, which a
 * monk left for a free School kiho, becomes a School kiho (Ernie's ruling, #182). 3.2.1 Schools carry no kiho data,
 * so every such kiho converts. A kiho with `schoolKiho` already stored keeps it, as does a flag already set.
 * @param {object} source - A full Item source, with `type`, `system`, and `flags` (mutated)
 */
export function migrateLegacyCostSource(source) {
  const system = source.system;
  if (!["kata", "kiho"].includes(source.type) || !system || !("cost" in system)) {
    return;
  }
  const cost = Number(system.cost) || 0;
  delete system.cost;
  source.flags ??= {};
  source.flags[SYS_ID] = { legacyCost: cost, ...source.flags[SYS_ID] };
  if (source.type === "kiho" && system.schoolKiho === undefined) {
    system.schoolKiho = cost === 0;
  }
}
