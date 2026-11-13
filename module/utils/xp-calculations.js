/**
 * @module xp-calculations
 * @description Experience point cost calculations for L5R4 character advancement.
 *
 * L5R4 uses XP to purchase character improvements:
 * - Traits: 4 × new rank (modified by bonuses/discounts)
 * - Void Ring: 6 × new rank (modified by discounts)
 * - Skills: 1 × new rank
 * - Emphases: 2 XP flat cost
 *
 * Also handles character creation bonuses from Family and School items, read from their TraitAdjust rules or,
 * for an item without one, from the legacy `trait`/`bonus` fields.
 */

import { SYS_ID } from "../config/constants.js";
import { toNumber, toString } from "./type-coercion.js";
import { traitAdjustTotal } from "./rule-engine.js";
import {
  TRAIT_XP_MULTIPLIER,
  VOID_XP_MULTIPLIER,
  SKILL_XP_MULTIPLIER,
  EMPHASIS_XP_COST
} from "../config/game-mechanics.js";

/**
 * Calculates XP cost to raise a trait by one rank.
 *
 * L5R4 formula: 4 × (current rank + free bonuses) + discount
 * Free bonuses from Family/School increase cost (you pay for higher rank).
 * Discounts reduce cost (can be negative for advantages).
 *
 * @param {number} r - Current trait rank
 * @param {number} freeEff - Free bonus from Family/School
 * @param {number} discount - XP discount (negative = discount, positive = penalty)
 * @returns {number} XP cost (minimum 0)
 *
 * @example
 * calculateXpStepCostForTrait(2, 0, 0) // 8 (4 × 2)
 * calculateXpStepCostForTrait(2, 1, 0) // 12 (4 × (2+1))
 * calculateXpStepCostForTrait(2, 0, -2) // 6 (4 × 2 - 2)
 */
export function calculateXpStepCostForTrait(r, freeEff, discount) {
  const rank = toNumber(r, 0);
  const bonus = toNumber(freeEff, 0);
  const d = toNumber(discount, 0);
  // L5R4 trait cost: TRAIT_XP_MULTIPLIER × effective rank, minimum 0
  return Math.max(0, TRAIT_XP_MULTIPLIER * (rank + bonus) + d);
}

/**
 * Calculates XP cost to raise Void Ring by one rank.
 *
 * L5R4 formula: 6 × new rank + discount
 * Void is more expensive than traits (6 vs 4 multiplier).
 *
 * @param {number} newRank - Target Void Ring rank
 * @param {number} discount - XP discount (negative = discount, positive = penalty)
 * @returns {number} XP cost (minimum 0)
 *
 * @example
 * calculateVoidStepCost(2, 0) // 12 (6 × 2)
 * calculateVoidStepCost(3, -3) // 15 (6 × 3 - 3)
 */
export function calculateVoidStepCost(newRank, discount) {
  const rank = toNumber(newRank, 0);
  const d = toNumber(discount, 0);
  // L5R4 Void cost: VOID_XP_MULTIPLIER × new rank, minimum 0
  return Math.max(0, VOID_XP_MULTIPLIER * rank + d);
}

/**
 * Calculates XP cost to raise a skill by one rank.
 *
 * L5R4 formula: 1 × new rank
 * Skills are cheaper than traits, cost equals target rank.
 *
 * @param {number} newRank - Target skill rank
 * @returns {number} XP cost (minimum 0)
 *
 * @example
 * calculateSkillStepCost(1) // 1 (first rank)
 * calculateSkillStepCost(5) // 5 (fifth rank)
 */
export function calculateSkillStepCost(newRank) {
  const rank = toNumber(newRank, 0);
  // L5R4 skill cost: SKILL_XP_MULTIPLIER × new rank, minimum 0
  return Math.max(0, SKILL_XP_MULTIPLIER * rank);
}

/**
 * Calculates XP cost to purchase a skill emphasis.
 *
 * L5R4 rule: Emphases cost 2 XP flat (no rank scaling).
 *
 * @returns {number} XP cost (always 2)
 *
 * @example
 * calculateEmphasisCost() // 2
 */
export function calculateEmphasisCost() {
  // L5R4 emphasis cost: flat EMPHASIS_XP_COST
  return EMPHASIS_XP_COST;
}

/**
 * Internal helper to calculate creation bonuses from Family/School.
 *
 * Aggregates bonuses from:
 * 1. TraitAdjust rules in the item's `system.rules`
 * 2. Legacy system: the item's system.trait and system.bonus fields, when it has no such rule
 *
 * Deduplicates by document UUID/ID to prevent double-counting.
 *
 * The two sources are summed apart because they reach the Trait differently: a rule adds on top of the
 * stored rank, while the legacy fields are never applied, so the player stores the bonus rank themselves.
 *
 * @param {Object} actor - Foundry actor document
 * @param {string} trait - Trait key, or "void" for the Void Ring
 * @returns {{rules: number, legacy: number}} Bonus from TraitAdjust rules and from the legacy fields
 * @private
 */
function getCreationBonusInternal(actor, trait) {
  try {
    let rules = 0;
    let legacy = 0;
    // Track processed documents to prevent duplicates
    const seen = new Set();

    const addFromDoc = doc => {
      if (!doc) {
        return;
      }
      // Deduplicate by UUID or ID
      const did = doc.uuid ?? doc.id ?? null;
      if (did && seen.has(did)) {
        return;
      }
      if (did) {
        seen.add(did);
      }

      // A TraitAdjust rule replaces the legacy fields
      const fromRules = traitAdjustTotal(doc.system?.rules, trait);
      if (fromRules !== 0) {
        rules += fromRules;
        return;
      }

      // Fallback to legacy bonus system
      const tKey = toString(doc?.system?.trait).toLowerCase();
      const amt = toNumber(doc?.system?.bonus, NaN);
      if (tKey === trait && Number.isFinite(amt)) {
        legacy += amt;
      }
    };

    // Check flagged Family/School items (may be in compendiums)
    for (const flagKey of ["familyItemUuid", "schoolItemUuid"]) {
      const uuid = actor.getFlag(SYS_ID, flagKey);
      if (!uuid || !globalThis.fromUuidSync) {
        continue;
      }
      addFromDoc(globalThis.fromUuidSync(uuid));
    }

    // Check owned Family/School items
    for (const it of actor.items ?? []) {
      if (!it || typeof it.type !== "string") {
        continue;
      }
      if (it.type === "family" || it.type === "school") {
        addFromDoc(it);
      }
    }

    return { rules, legacy };
  } catch {
    // Return 0 on any error
    return { rules: 0, legacy: 0 };
  }
}

/**
 * Gets the creation bonus for a trait, split by where it comes from.
 *
 * @param {Object} actor - Foundry actor document
 * @param {string} key - Trait key ("sta", "str", "ref", "agi", etc.)
 * @returns {{rules: number, legacy: number}} Bonus from Family/School TraitAdjust rules, which add on top of the
 *   stored rank, and from the legacy `trait`/`bonus` fields, which the player stores as a rank
 *
 * @example
 * getCreationFreeBonusSources(actor, "str") // { rules: 1, legacy: 0 } (Family rule gives +1 Strength)
 */
export function getCreationFreeBonusSources(actor, key) {
  return getCreationBonusInternal(actor, key);
}

/**
 * Gets creation bonus for a specific trait.
 *
 * Sums bonuses from Family and School items that affect the trait.
 * Supports both TraitAdjust rules and the legacy bonus fields.
 *
 * @param {Object} actor - Foundry actor document
 * @param {string} key - Trait key ("sta", "str", "ref", "agi", etc.)
 * @returns {number} Total creation bonus for trait
 *
 * @example
 * getCreationFreeBonus(actor, "str") // 1 (if Family gives +1 Strength)
 */
export function getCreationFreeBonus(actor, key) {
  const { rules, legacy } = getCreationFreeBonusSources(actor, key);
  return rules + legacy;
}

/**
 * Gets creation bonus for Void Ring.
 *
 * Sums bonuses from Family and School items that affect Void.
 * Supports both TraitAdjust rules and the legacy bonus fields.
 *
 * @param {Object} actor - Foundry actor document
 * @returns {number} Total creation bonus for Void Ring
 *
 * @example
 * getCreationFreeBonusVoid(actor) // 1 (if School gives +1 Void)
 */
export function getCreationFreeBonusVoid(actor) {
  const { rules, legacy } = getCreationBonusInternal(actor, "void");
  return rules + legacy;
}
