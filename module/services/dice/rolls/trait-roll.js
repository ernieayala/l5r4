/**
 * Trait Roll Service
 *
 * A Trait Roll (p.80) through the roll pipeline (module/services/dice/check/roll-check.js): roll and keep the
 * Trait's rank. The Void Ring rolls the same way. Trait bonuses from rules and Active Effects apply with or without
 * the dialog (#42).
 *
 * @module services/dice/rolls/trait-roll
 */

import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { normalizeTraitKey } from "../../../utils/mechanics.js";
import { rollCheck } from "../check/roll-check.js";
import { resolveActor } from "../resources/void-manager.js";

/**
 * Executes a Trait Roll.
 *
 * @param {Object} options
 * @param {number|null} [options.traitRank=null] - The Trait's effective rank
 * @param {string|null} [options.traitName=null] - Trait key or English name ("ref", "Reflexes", "void")
 * @param {boolean} [options.askForOptions=true] - Show the roll dialog (Shift-click skips it)
 * @param {boolean} [options.unskilled=false] - Roll as an Unskilled Roll (p.80)
 * @param {L5R4Actor|null} [options.actor=null] - The roller
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled
 */
export async function TraitRoll({
  traitRank = null,
  traitName = null,
  askForOptions = true,
  unskilled = false,
  actor = null
} = {}) {
  const roller = resolveActor(actor);
  const trait = normalizeTraitKey(traitName);
  const rank = toInt(traitRank);
  const name = T(
    trait === "void" ? "l5r4.ui.mechanics.rings.void" : `l5r4.ui.mechanics.traits.${trait}`
  );
  return rollCheck({
    actor: roller,
    kind: "trait",
    label: `${name} ${T("l5r4.ui.common.roll")}`,
    base: { roll: rank, keep: rank },
    trait,
    unskilled,
    askForOptions
  });
}
