/**
 * @module documents/actor/calculations/taint-system
 * @description Prepares what the Shadowlands Taint does to an actor's derived data once its Rings are known: the
 * maximum Void Points, and a Lost character's Taint Rank on Initiative. Modifies the actor's system data in place.
 * game-rules/89_shadowlands_taint.md, p.278-279
 */

import { getHighestRing, getLostBonus, getMaxVoidPoints } from "../../../utils/taint.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * Prepare the Taint's effects on derived data: Taint Level 4 costs a Void Point from the maximum, not from the Void
 * Ring, and the Lost have none; a Lost character adds the Taint Rank to every roll using a physical Trait, and
 * Initiative keeps Reflexes, so it joins the Initiative total (#147). Runs after the Initiative modifiers are summed.
 * game-rules/89_shadowlands_taint.md, p.278-279
 * game-rules/31_combat_round.md, p.81
 * @param {object} sys - The actor's prepared system data, after prepareTraitsAndRings
 */
export function prepareTaint(sys) {
  const rank = toInt(sys.shadowTaint.rank);
  const highestRing = getHighestRing(sys.rings);
  sys.rings.void.max = getMaxVoidPoints(toInt(sys.rings.void.rank), rank, highestRing);
  sys.initiative.totalMod += getLostBonus({ rank, highestRing, kind: "initiative", trait: "ref" });
}
