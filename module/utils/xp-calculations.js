/**
 * XP Calculations Utility Module
 *
 * Handles Experience Point cost calculations for character advancement in Legend of
 * the Five Rings 4th Edition. Implements core XP formulas for trait advancement and
 * tracks "creation bonuses" - free trait ranks granted during character creation by
 * family and school selections that do not cost XP to acquire.
 *
 * L5R4 Game Rules Implemented:
 * - **Trait Advancement**: Cost = 4 × new rank (e.g., Reflexes 2→3 costs 12 XP)
 * - **Void Advancement**: Cost = 6 × new rank (e.g., Void 2→3 costs 18 XP, handled in calling code)
 * - **Creation Bonuses**: Family grants +1 to one trait, School grants +1 to another trait.
 *   These free ranks start at 3 instead of 2 and do not consume XP during character creation.
 * - **Discount System**: Optional XP discounts (negative costs) applied to trait advancement
 *
 * Foundry VTT Integration:
 * - Reads family/school selections via actor flags (familyItemUuid, schoolItemUuid)
 * - Supports Active Effects (modern approach) for bonus tracking via CONST.ACTIVE_EFFECT_MODES.ADD
 * - Falls back to legacy system.trait property for backward compatibility
 * - Uses fromUuidSync() for UUID resolution (requires Foundry v10+)
 * - Deduplicates bonuses from multiple sources using UUID/ID tracking
 *
 * @module utils/xp-calculations
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.data.fields.ForeignDocumentField.html|Foundry UUID Resolution}
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Calculate XP cost for a single trait advancement step.
 *
 * Implements the L5R4 trait advancement formula: Cost = 4 × new rank.
 * Accounts for free effective ranks from family/school bonuses and optional discounts.
 *
 * The `freeEff` parameter represents free trait ranks that offset the effective rank
 * without consuming XP (e.g., family +1 Stamina means rank 3 costs as if it were rank 2).
 *
 * The `discount` parameter allows for XP cost modifiers (can be negative for discounts
 * or positive for penalties). This is typically used for special abilities or advantages
 * that reduce trait advancement costs.
 *
 * Usage: Standard trait advancement costs 4 × rank. If a character has a family bonus
 * granting +1 Stamina (free effective rank), then advancing from rank 2→3 costs
 * 4 × (3 - 1) = 8 XP instead of the normal 12 XP. Discounts can further reduce costs.
 *
 * @param {number} r - The target rank being purchased (1-10)
 * @param {number} freeEff - Free effective ranks from creation bonuses (usually 0 or 1)
 * @param {number} discount - XP cost adjustment (negative = discount, positive = penalty)
 * @returns {number} XP cost for this advancement step (minimum 0)
 */
export function calculateXpStepCostForTrait(r, freeEff, discount) {
  const rank = Number.isFinite(+r) ? Number(r) : 0;
  const bonus = Number.isFinite(+freeEff) ? Number(freeEff) : 0;
  const d = Number.isFinite(+discount) ? Number(discount) : 0;
  return Math.max(0, 4 * (rank + bonus) + d);
}

/**
 * Internal helper to calculate creation bonuses from family and school items.
 *
 * This function implements a dual-check system for maximum compatibility:
 * 1. **Modern approach**: Checks Active Effects on family/school items for trait bonuses
 *    using CONST.ACTIVE_EFFECT_MODES.ADD with keys like "system.traits.sta"
 * 2. **Legacy approach**: Falls back to reading item.system.trait and item.system.bonus
 *    properties for older data structures
 *
 * The function searches in two places for family/school items:
 * - Actor flags (familyItemUuid, schoolItemUuid) resolved via fromUuidSync()
 * - Actor's items collection filtered by type "family" or "school"
 *
 * Deduplication via UUID/ID tracking ensures bonuses aren't counted multiple times
 * if an item appears in both flags and the items collection.
 *
 * @param {Actor} actor - Foundry Actor document to check for creation bonuses
 * @param {Function} effectMatcher - Callback to test if an Active Effect change applies.
 *   Receives (change) and returns boolean. Should check change.key and change.mode.
 * @param {Function} legacyMatcher - Callback to test if legacy trait/bonus applies.
 *   Receives (traitKey, amount) and returns boolean. TraitKey is lowercase string.
 * @returns {number} Total creation bonus value (sum of all matching bonuses)
 * @private
 */
function getCreationBonusInternal(actor, effectMatcher, legacyMatcher) {
  try {
    let sum = 0;
    // Track processed documents by UUID/ID to prevent duplicate counting
    const seen = new Set();

    const addFromDoc = doc => {
      if (!doc) {
        return;
      }
      // Deduplicate: Skip if we've already processed this document
      const did = doc.uuid ?? doc.id ?? null;
      if (did && seen.has(did)) {
        return;
      }
      if (did) {
        seen.add(did);
      }

      // Modern approach: Check Active Effects for trait bonuses
      let ae = 0;
      for (const eff of doc.effects ?? []) {
        if (eff?.transfer !== true) {
          continue;
        } // Only transfer=true effects apply to actor
        for (const ch of eff?.changes ?? []) {
          if (effectMatcher(ch)) {
            const v = Number(ch?.value ?? 0);
            if (Number.isFinite(v)) {
              ae += v;
            }
          }
        }
      }
      // If Active Effects found, use them and skip legacy check
      if (ae !== 0) {
        sum += ae;
        return;
      }

      // Legacy approach: Check old system.trait and system.bonus properties
      const tKey = String(doc?.system?.trait ?? "").toLowerCase();
      const amt = Number(doc?.system?.bonus ?? NaN);
      if (legacyMatcher(tKey, amt)) {
        sum += amt;
      }
    };

    // Check flagged family/school items (stored as UUIDs in actor flags)
    for (const flagKey of ["familyItemUuid", "schoolItemUuid"]) {
      const uuid = actor.getFlag(SYS_ID, flagKey);
      if (!uuid || !globalThis.fromUuidSync) {
        continue;
      }
      addFromDoc(globalThis.fromUuidSync(uuid));
    }

    // Check family/school items in actor's items collection
    for (const it of actor.items ?? []) {
      if (!it || typeof it.type !== "string") {
        continue;
      }
      if (it.type === "family" || it.type === "school") {
        addFromDoc(it);
      }
    }

    return sum || 0;
  } catch {
    return 0;
  }
}

/**
 * Get creation bonus for a specific trait from family and school items.
 *
 * Checks family and school items for bonus trait ranks granted during character creation
 * that do not cost XP. In L5R4, family selection grants +1 to a specific trait (e.g.,
 * Hida family grants +1 Stamina), and school selection grants +1 to another trait.
 *
 * These bonuses allow characters to start with a trait at rank 3 instead of the default
 * rank 2, without spending XP during character creation. This function returns the sum
 * of all matching bonuses for the specified trait.
 *
 * The function checks both Active Effects (modern) and legacy item properties for
 * maximum compatibility across different data structures and system versions.
 *
 * @param {Actor} actor - Foundry Actor document to check
 * @param {string} key - Trait key to check ("sta", "wil", "str", "per", "ref", "awa", "agi", "int")
 * @returns {number} Total creation bonus for this trait (typically 0, 1, or rarely 2)
 */
export function getCreationFreeBonus(actor, key) {
  return getCreationBonusInternal(
    actor,
    ch => ch?.key === `system.traits.${key}` && ch?.mode === CONST.ACTIVE_EFFECT_MODES.ADD,
    (tKey, amt) => tKey === key && Number.isFinite(amt)
  );
}

/**
 * Get creation bonus for Void Ring from family and school items.
 *
 * Similar to getCreationFreeBonus but specifically for the Void Ring. In L5R4,
 * Void Ring is treated differently from other traits as it has no component traits
 * (unlike other rings which combine two traits each).
 *
 * Some families or schools may grant bonus Void Ring ranks during character creation.
 * These free ranks do not cost XP and allow characters to start with Void 3 instead
 * of the default Void 2.
 *
 * The function checks both "system.rings.void.rank" and "system.rings.void.value" keys
 * to support different data structure versions in the system.
 *
 * @param {Actor} actor - Foundry Actor document to check
 * @returns {number} Total creation bonus for Void Ring (typically 0 or 1)
 */
export function getCreationFreeBonusVoid(actor) {
  return getCreationBonusInternal(
    actor,
    ch =>
      (ch?.key === "system.rings.void.rank" || ch?.key === "system.rings.void.value") &&
      ch?.mode === CONST.ACTIVE_EFFECT_MODES.ADD,
    (tKey, amt) => tKey === "void" && Number.isFinite(amt)
  );
}
