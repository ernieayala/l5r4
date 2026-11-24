/**
 * @module utils/damage
 * @description Pure arithmetic of damage and maneuvers (roadmap/STAGE-10): what maneuvers cost in Raises, the Feint
 * bonus, and the Wounds a damage total leaves after Reduction, Spirit, and Invulnerability.
 */

/**
 * Raises each maneuver costs. Called Shot and Knockdown vary; see getManeuverCost.
 * game-rules/38_maneuvers.md, p.86-87
 */
export const MANEUVER_RAISES = Object.freeze({ disarm: 3, extraAttack: 5, feint: 2 });

/**
 * Substances that hurt Invulnerable creatures normally, with spells and nemuranai.
 * game-rules/99_creatures.md, p.319
 */
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
 * Raises the chosen maneuvers cost: Called Shot 1-4, Disarm 3, Extra Attack 5, Feint 2, Knockdown 2 (4
 * against a four-legged opponent). A RaiseRule changes one maneuver's cost, never below 0 (roadmap/STAGE-11).
 * Increased Damage is whatever declared Raises are left (see getRaiseAllocation). Feint and Knockdown cost 4; a Feint
 * with a -1 adjustment costs 1.
 * game-rules/38_maneuvers.md, p.86-87
 * @param {Maneuvers} maneuvers
 * @param {Record<string, number>} [adjust={}] - Change to each maneuver's cost, by maneuver key
 * @returns {number}
 */
export function getManeuverCost(maneuvers, adjust = {}) {
  const getAdjustedCost = (key, base) => Math.max(0, base + (adjust[key] ?? 0));
  const calledShot = Math.max(0, Math.min(4, Number(maneuvers.calledShot) || 0));
  let cost = calledShot ? getAdjustedCost("calledShot", calledShot) : 0;
  for (const key of ["disarm", "extraAttack", "feint"]) {
    if (maneuvers[key]) {
      cost += getAdjustedCost(key, MANEUVER_RAISES[key]);
    }
  }
  if (maneuvers.knockdown) {
    cost += getAdjustedCost("knockdown", maneuvers.fourLegged ? 4 : 2);
  }
  return cost;
}

/**
 * Pay for maneuvers out of an attack's Raises. A Free Raise gives the benefit of a Raise, so maneuvers spend
 * the Free Raises not used on the TN first, then declared Raises; the declared Raises left over are Increased
 * Damage, +1k0 each. Three Raises and one Free Raise against a cost of 2 are affordable and leave 2 Increased
 * Damage.
 * game-rules/28_raises.md, p.79
 * game-rules/38_maneuvers.md, p.87
 * @param {object} spec - The attack's Raises and the maneuvers' cost
 * @param {number} spec.raises - Declared Raises
 * @param {number} spec.freeRaises - Free Raises not spent on the TN
 * @param {number} spec.cost - getManeuverCost of the chosen maneuvers
 * @returns {{affordable: boolean, increasedDamage: number}}
 */
export function getRaiseAllocation({ raises, freeRaises, cost }) {
  const fromDeclared = Math.max(0, cost - freeRaises);
  return {
    affordable: fromDeclared <= raises,
    increasedDamage: Math.max(0, raises - fromDeclared)
  };
}

/**
 * The Feint bonus to damage: half the amount the attack beat the target's Armor TN by, the Feint's own 2
 * Raises counted, rounded down (STAGE-10 decision 2; Ernie's ruling, 2026-11-14), never more than five times the
 * attacker's Insight Rank. A margin of 13 at Insight Rank 2 gives 6; a margin of 40 at Insight Rank 1 gives 5.
 * game-rules/38_maneuvers.md, p.86
 * @param {number} margin - Attack total minus the target's Armor TN and the Feint's 10
 * @param {number} insightRank
 * @returns {number}
 */
export function getFeintBonus(margin, insightRank) {
  return Math.max(0, Math.min(Math.floor(Math.max(0, margin) / 2), 5 * insightRank));
}

/**
 * A defender's Reduction, Invulnerability, and Spirit.
 * game-rules/99_creatures.md, p.319-320
 * @typedef {object} Defenses
 * @property {Array<{value: number, except: string[]}>} [reduction]  Reduction, each part with the damage tags it
 *   does not apply to (a creature with less Reduction against jade has a part that excepts jade)
 * @property {{harmedBy: string[], only: string[]}|null} [invulnerable]  Invulnerability: damage without a
 *   harmedBy tag is one Wound; with `only`, the rule covers damage with one of those tags alone (partial
 *   Invulnerability)
 * @property {{harmedBy: string[]}|null} [spirit]  Spirit: damage without a harmedBy tag is halved
 */

/**
 * The Wounds a damage total inflicts (STAGE-10 decision 3): Reduction first (less what the
 * attack ignores), then Spirit halves it, rounded down, then Invulnerability makes it one Wound. Damage that
 * Reduction absorbs leaves no Wound. Light Armor's Reduction 3 against 12 damage leaves 9 Wounds.
 * game-rules/33_wounds.md, p.82
 * game-rules/73_armor.md, p.198
 * game-rules/99_creatures.md, p.319-320
 * @param {object} spec - The damage and the defender
 * @param {number} spec.damage
 * @param {string[]} [spec.tags=[]] - Damage sources: jade, crystal, obsidian, spell, nemuranai, ...
 * @param {number} [spec.ignoreReduction=0] - Reduction the attack ignores
 * @param {Defenses} [spec.defenses={}]
 * @returns {{wounds: number, reduction: number, spirit: boolean, invulnerable: boolean}}
 */
export function getWoundsTaken({ damage, tags = [], ignoreReduction = 0, defenses = {} }) {
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
 * Wounds a Void Point takes back from what one source of damage inflicted: 10, never more than it inflicted.
 * game-rules/25_rings_and_traits.md, p.78
 * @param {number} wounds - Wounds applied from that source
 * @returns {number}
 */
export function getVoidReduction(wounds) {
  return Math.min(10, Math.max(0, wounds));
}

/**
 * Whether a Void Point can still take Wounds off a damage result: none spent on it, not undone, and the damaged actor
 * has one left (#113).
 * game-rules/25_rings_and_traits.md, p.78
 * @param {{voidSpent: boolean, undone: boolean}} result - The result card's `damageResult` flag
 * @param {number} voidPoints - The damaged actor's Void Points
 * @returns {boolean}
 */
export function canReduceWithVoid(result, voidPoints) {
  return !result.voidSpent && !result.undone && voidPoints > 0;
}

/**
 * The Wounds that kill. With Wound Ranks from the Earth Ring, Out is a rank the character survives and Wounds past it
 * kill (STAGE-10 decision 4). A creature's own Wound list instead names the total that kills it, which the list
 * stores as its last rank (#146).
 * game-rules/33_wounds.md, p.82
 * game-rules/99_creatures.md, p.318
 * @param {number} out - The Out Wound Rank's threshold
 * @param {boolean} ownWoundList - Whether the Wound Ranks are a creature's own list
 * @returns {number} The Wounds that kill, or 0 with no Out threshold
 */
export function getDeathThreshold(out, ownWoundList) {
  if (out <= 0) {
    return 0;
  }
  return ownWoundList ? out : out + 1;
}

/**
 * Whether the Wounds suffered kill.
 * game-rules/33_wounds.md, p.82
 * game-rules/99_creatures.md, p.318
 * @param {number} suffered - Wounds suffered
 * @param {number} deathThreshold - The Wounds that kill (getDeathThreshold)
 * @returns {boolean}
 */
export function isDead(suffered, deathThreshold) {
  return deathThreshold > 0 && suffered >= deathThreshold;
}
