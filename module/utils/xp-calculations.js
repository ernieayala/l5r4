/**
 * @module utils/xp-calculations
 * @description Character creation bonuses from Family and School items, read from their TraitAdjust rules
 * or, for an item without one, from the legacy `trait`/`bonus` fields. XP prices are module/utils/xp-ledger.js.
 * game-rules/48_character_creation_expanded.md, p.102
 */

import { SYS_ID } from "../config/constants.js";
import { toNumber, toString } from "./type-coercion.js";
import { getTraitAdjustTotal } from "./rule-engine.js";

/**
 * Gets the creation bonus for a trait, split by where it comes from. A Family rule giving +1 Strength gives
 * `{ rules: 1, legacy: 0 }` for "str".
 * @param {object} actor - Foundry actor document
 * @param {string} key - Trait key ("sta", "str", "ref", "agi", etc.)
 * @returns {{rules: number, legacy: number}} Bonus from Family/School TraitAdjust rules, which add on top of the
 *   stored rank, and from the legacy `trait`/`bonus` fields, which the player stores as a rank
 */
export function getCreationFreeBonusSources(actor, key) {
  return getCreationBonusInternal(actor, key);
}

/**
 * Gets creation bonus for a specific trait.
 *
 * Sums bonuses from Family and School items that affect the trait.
 * Supports both TraitAdjust rules and the legacy bonus fields. A Family giving +1 Strength gives 1 for "str".
 * @param {object} actor - Foundry actor document
 * @param {string} key - Trait key ("sta", "str", "ref", "agi", etc.)
 * @returns {number} Total creation bonus for trait
 */
export function getCreationFreeBonus(actor, key) {
  const { rules, legacy } = getCreationFreeBonusSources(actor, key);
  return rules + legacy;
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
 * @param {object} actor - Foundry actor document
 * @param {string} trait - Trait key, or "void" for the Void Ring
 * @returns {{rules: number, legacy: number}} Bonus from TraitAdjust rules and from the legacy fields
 */
function getCreationBonusInternal(actor, trait) {
  try {
    let rules = 0;
    let legacy = 0;
    // Track processed documents to prevent duplicates
    const seen = new Set();

    const applyDocBonus = doc => {
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
      const fromRules = getTraitAdjustTotal(doc.system?.rules, trait);
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
      applyDocBonus(globalThis.fromUuidSync(uuid));
    }

    // Check owned Family/School items
    for (const it of actor.items ?? []) {
      if (!it || typeof it.type !== "string") {
        continue;
      }
      if (it.type === "family" || it.type === "school") {
        applyDocBonus(it);
      }
    }

    return { rules, legacy };
  } catch {
    // Return 0 on any error
    return { rules: 0, legacy: 0 };
  }
}
