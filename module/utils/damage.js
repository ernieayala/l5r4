/**
 * @module damage
 * @description Pure arithmetic of damage and maneuvers (roadmap/STAGE-10): what maneuvers cost in Raises, the Feint
 * bonus, and the Wounds a damage total leaves after Reduction, Spirit, and Invulnerability.
 */

/** Raises each maneuver costs (Core Rulebook pp.86-87). Called Shot and Knockdown vary; see maneuverCost. */
export const MANEUVER_RAISES = Object.freeze({ disarm: 3, extraAttack: 5, feint: 2 });

/** Substances that hurt Invulnerable creatures normally, with spells and nemuranai (p.319). */
export const SACRED = Object.freeze(["jade", "crystal", "obsidian"]);

/**
 * @typedef {object} Maneuvers
 * @property {number} [calledShot=0]  Raises spent on a Called Shot, 0-4 (limb 1, hand or foot 2, head 3, eye 4)
 * @property {boolean} [disarm=false]
 * @property {boolean} [extraAttack=false]
 * @property {boolean} [feint=false]
 * @property {boolean} [knockdown=false]
 * @property {boolean} [fourLegged=false]  Knockdown against a four-legged opponent
 */

/**
 * Raises the chosen maneuvers cost (pp.86-87): Called Shot 1-4, Disarm 3, Extra Attack 5, Feint 2, Knockdown 2 (4
 * against a four-legged opponent). Increased Damage is whatever declared Raises are left (see allocateRaises).
 *
 * @param {Maneuvers} maneuvers
 * @returns {number}
 *
 * @example
 * maneuverCost({ feint: true, knockdown: true }); // 4
 */
export function maneuverCost(maneuvers) {
  let cost = Math.max(0, Math.min(4, Number(maneuvers.calledShot) || 0));
  for (const key of ["disarm", "extraAttack", "feint"]) {
    if (maneuvers[key]) {
      cost += MANEUVER_RAISES[key];
    }
  }
  if (maneuvers.knockdown) {
    cost += maneuvers.fourLegged ? 4 : 2;
  }
  return cost;
}

/**
 * Pay for maneuvers out of an attack's Raises. A Free Raise gives the benefit of a Raise (p.79), so maneuvers spend
 * the Free Raises not used on the TN first, then declared Raises; the declared Raises left over are Increased
 * Damage, +1k0 each (p.87).
 *
 * @param {object} spec
 * @param {number} spec.raises       Declared Raises
 * @param {number} spec.freeRaises   Free Raises not spent on the TN
 * @param {number} spec.cost         maneuverCost of the chosen maneuvers
 * @returns {{affordable: boolean, increasedDamage: number}}
 *
 * @example
 * allocateRaises({ raises: 3, freeRaises: 1, cost: 2 }); // { affordable: true, increasedDamage: 2 }
 */
export function allocateRaises({ raises, freeRaises, cost }) {
  const fromDeclared = Math.max(0, cost - freeRaises);
  return {
    affordable: fromDeclared <= raises,
    increasedDamage: Math.max(0, raises - fromDeclared)
  };
}

/**
 * The Feint bonus to damage (p.86): half the amount the attack beat its TN by, the Raises included in that TN,
 * rounded down (STAGE-10 decision 2), never more than five times the attacker's Insight Rank.
 *
 * @param {number} margin       Attack total minus its effective TN
 * @param {number} insightRank
 * @returns {number}
 *
 * @example
 * feintBonus(13, 2); // 6
 * feintBonus(40, 1); // 5
 */
export function feintBonus(margin, insightRank) {
  return Math.max(0, Math.min(Math.floor(Math.max(0, margin) / 2), 5 * insightRank));
}

/**
 * @typedef {object} Defenses
 * @property {Array<{value: number, except: string[]}>} [reduction]  Reduction, each part with the damage tags it
 *   does not apply to (a creature with less Reduction against jade has a part that excepts jade)
 * @property {{harmedBy: string[], only: string[]}|null} [invulnerable]  Invulnerability (p.319): damage without a
 *   harmedBy tag is one Wound; with `only`, the rule covers damage with one of those tags alone (partial
 *   Invulnerability)
 * @property {{harmedBy: string[]}|null} [spirit]  Spirit (p.320): damage without a harmedBy tag is halved
 */

/**
 * The Wounds a damage total inflicts (pp.82, 198, 319-320; STAGE-10 decision 3): Reduction first (less what the
 * attack ignores), then Spirit halves it, rounded down, then Invulnerability makes it one Wound. Damage that
 * Reduction absorbs leaves no Wound.
 *
 * @param {object} spec
 * @param {number} spec.damage
 * @param {string[]} [spec.tags=[]]          Damage sources: jade, crystal, obsidian, spell, nemuranai, ...
 * @param {number} [spec.ignoreReduction=0]  Reduction the attack ignores
 * @param {Defenses} [spec.defenses={}]
 * @returns {{wounds: number, reduction: number, spirit: boolean, invulnerable: boolean}}
 *
 * @example
 * // Light Armor (Reduction 3) and 12 damage: 9 Wounds (p.198)
 * woundsTaken({ damage: 12, defenses: { reduction: [{ value: 3, except: [] }] } }).wounds; // 9
 */
export function woundsTaken({ damage, tags = [], ignoreReduction = 0, defenses = {} }) {
  const has = list => list.some(tag => tags.includes(tag));
  const reduction = Math.max(
    0,
    (defenses.reduction ?? [])
      .filter(part => !has(part.except ?? []))
      .reduce((sum, part) => sum + part.value, 0) - ignoreReduction
  );
  let wounds = Math.max(0, damage - reduction);
  const spirit = Boolean(defenses.spirit) && wounds > 0 && !has(defenses.spirit.harmedBy);
  if (spirit) {
    wounds = Math.floor(wounds / 2);
  }
  const shield = defenses.invulnerable;
  const invulnerable =
    Boolean(shield) &&
    wounds > 1 &&
    !has(shield.harmedBy) &&
    (shield.only.length === 0 || has(shield.only));
  if (invulnerable) {
    wounds = 1;
  }
  return { wounds, reduction, spirit, invulnerable };
}

/**
 * Wounds a Void Point takes back from what one source of damage inflicted (p.78): 10, never more than it inflicted.
 *
 * @param {number} wounds  Wounds applied from that source
 * @returns {number}
 */
export function voidReduction(wounds) {
  return Math.min(10, Math.max(0, wounds));
}

/**
 * Whether Wounds past the Out Wound Rank kill (p.82; STAGE-10 decision 4).
 *
 * @param {number} suffered  Wounds suffered
 * @param {number} out       The Out Wound Rank's threshold
 * @returns {boolean}
 */
export function isDead(suffered, out) {
  return out > 0 && suffered > out;
}
