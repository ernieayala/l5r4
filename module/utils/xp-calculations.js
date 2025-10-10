/**
 * @fileoverview L5R4 XP Calculation Utilities
 * 
 * Pure calculation functions for L5R4 experience point system.
 * Extracted from documents layer to be shared by both documents and services
 * without creating cross-layer dependencies.
 * 
 * **Core Functions:**
 * - `calculateXpStepCostForTrait` - Calculate XP cost for single trait advancement
 * - `getCreationFreeBonus` - Get Family/School trait bonuses
 * - `getCreationFreeBonusVoid` - Get Family/School void bonuses
 * 
 * **Design Principles:**
 * - Pure functions with no side effects
 * - No dependencies on documents or services layers
 * - Shared by both actor documents and XP calculator service
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Calculate experience cost for advancing a trait to a specific rank.
 * Uses L5R4 trait advancement formula: 4 × effective new rank, with bonuses and discounts.
 * 
 * **Cost Calculation:**
 * - Base cost: 4 × (new base rank + creation bonuses)
 * - Modified by: per-step discounts (can be negative)
 * - Minimum: 0 XP (free if discounts exceed base cost)
 * 
 * **Example:** 
 * Family +1 bonus via AE, buying base rank 3:
 * Cost = 4 × (3 + 1) = 16 XP
 * 
 * @param {number} r - New base rank being purchased (typically 3+)
 * @param {number} freeEff - Creation bonuses from Family/School (0 if already baked into base)
 * @param {number} discount - Per-step cost modifier (negative reduces cost)
 * @returns {number} XP cost for this advancement step (minimum 0)
 * 
 * @example
 * calculateXpStepCostForTrait(3, 1, 0); // 16 XP (3 + 1 bonus) × 4
 * calculateXpStepCostForTrait(4, 0, -2); // 14 XP (4 × 4 - 2 discount)
 */
export function calculateXpStepCostForTrait(r, freeEff, discount) {
  const rank = Number.isFinite(+r) ? Number(r) : 0;
  const bonus = Number.isFinite(+freeEff) ? Number(freeEff) : 0;
  const d = Number.isFinite(+discount) ? Number(discount) : 0;
  return Math.max(0, 4 * (rank + bonus) + d);
}

/**
 * Calculate total creation bonuses for a specific trait from Family/School items.
 * Handles both modern Active Effect transfers and legacy direct bonuses with
 * deduplication to prevent double-counting items seen via multiple paths.
 * 
 * **Resolution Priority:**
 * 1. Active Effects that transfer and ADD to system.traits.<key>
 * 2. Legacy direct bonuses from item.system.trait + item.system.bonus
 * 
 * **Sources Checked:**
 * - Flagged Family/School items via UUID (preferred)
 * - Embedded Family/School items (fallback for older actors)
 * 
 * **Deduplication:**
 * Uses a Set to track seen document IDs (uuid or id) to prevent counting
 * the same Family/School item multiple times if accessed via different paths.
 * 
 * @integration-test Scenario: Family/School item with transfer:true Active Effect modifies actor traits
 * @integration-test Reason: Unit tests mock Active Effects and CONST.ACTIVE_EFFECT_MODES
 * @integration-test Validates: Effects actually transfer to actor, ADD mode applies correctly
 * @integration-test Validates: fromUuidSync returns actual documents with real effects collections
 * 
 * @param {Actor} actor - The actor to check for creation bonuses
 * @param {string} key - Trait key to check bonuses for ("sta", "ref", etc.)
 * @returns {number} Total bonus amount from all creation sources
 * 
 * @example
 * // Get Stamina bonus from Family
 * const staBonus = getCreationFreeBonus(actor, "sta"); // 1
 * 
 * // Use in XP calculation
 * const freeBonus = getCreationFreeBonus(actor, "sta");
 * const xpCost = 4 * (newRank + freeBonus);
 */
export function getCreationFreeBonus(actor, key) {
  try {
    let sum = 0;
    const seen = new Set();

    /**
     * Internal helper: Extract and accumulate bonuses from a Family/School document.
     * Checks Active Effects first (preferred), then falls back to legacy direct bonuses.
     * Prevents double-counting via the seen Set.
     * 
     * @param {Document|null} doc - Family or School item document
     * @returns {void} Mutates sum and seen from parent scope
     */
    const addFromDoc = doc => {
      if (!doc) return;
      const did = doc.uuid ?? doc.id ?? null;
      if (did && seen.has(did)) return;
      if (did) seen.add(did);

      // Prefer transferred AEs that ADD to the trait
      let ae = 0;
      for (const eff of (doc.effects ?? [])) {
        if (eff?.transfer !== true) continue;
        for (const ch of (eff?.changes ?? [])) {
          if (ch?.key === `system.traits.${key}` && ch?.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
            const v = Number(ch?.value ?? 0);
            if (Number.isFinite(v)) ae += v;
          }
        }
      }
      if (ae !== 0) { sum += ae; return; }

      // Legacy fallback
      const tKey = String(doc?.system?.trait ?? "").toLowerCase();
      const amt  = Number(doc?.system?.bonus ?? NaN);
      if (tKey === key && Number.isFinite(amt)) sum += amt;
    };

    // Flagged docs
    for (const flagKey of ["familyItemUuid", "schoolItemUuid"]) {
      const uuid = actor.getFlag(SYS_ID, flagKey);
      if (!uuid || !globalThis.fromUuidSync) continue;
      addFromDoc(fromUuidSync(uuid));
    }

    // Embedded docs (older actors)
    for (const it of actor.items ?? []) {
      // Defensive check: ensure this is an actual Item document, not an Active Effect
      if (!it || typeof it.type !== "string") continue;
      if (it.type === "family" || it.type === "school") addFromDoc(it);
    }

    return sum || 0;
  } catch {
    return 0;
  }
}

/**
 * Calculate total creation bonuses for Void ring from Family/School items.
 * Similar to getCreationFreeBonus but checks for void ring Active Effects.
 * 
 * **Resolution Priority:**
 * 1. Active Effects that transfer and ADD to system.rings.void.rank or system.rings.void.value
 * 2. Legacy direct bonuses from item.system.trait + item.system.bonus (if trait === "void")
 * 
 * **Sources Checked:**
 * - Flagged Family/School items via UUID (preferred)
 * - Embedded Family/School items (fallback for older actors)
 * 
 * **Deduplication:**
 * Uses a Set to track seen document IDs (uuid or id) to prevent counting
 * the same Family/School item multiple times if accessed via different paths.
 * 
 * @integration-test Scenario: School item with transfer:true Active Effect modifies void ring
 * @integration-test Reason: Unit tests mock Active Effects and CONST.ACTIVE_EFFECT_MODES
 * @integration-test Validates: Effects transfer to system.rings.void.rank and .value paths
 * @integration-test Validates: fromUuidSync returns actual documents with real effects collections
 * 
 * @param {Actor} actor - The actor to check for void bonuses
 * @returns {number} Total void bonus amount from all creation sources
 * 
 * @example
 * // Get Void bonus from School
 * const voidBonus = getCreationFreeBonusVoid(actor); // 1
 * 
 * // Use in XP calculation
 * const freeBonus = getCreationFreeBonusVoid(actor);
 * const baseline = 2 + freeBonus; // Starting void rank
 */
export function getCreationFreeBonusVoid(actor) {
  try {
    let sum = 0;
    const seen = new Set();

    /**
     * Internal helper: Extract and accumulate void bonuses from a Family/School document.
     * Checks Active Effects first (preferred), then falls back to legacy direct bonuses.
     * Prevents double-counting via the seen Set.
     * 
     * @param {Document|null} doc - Family or School item document
     * @returns {void} Mutates sum and seen from parent scope
     */
    const addFromDoc = doc => {
      if (!doc) return;
      const did = doc.uuid ?? doc.id ?? null;
      if (did && seen.has(did)) return;
      if (did) seen.add(did);

      // Check for transferred AEs that ADD to void rank
      let ae = 0;
      for (const eff of (doc.effects ?? [])) {
        if (eff?.transfer !== true) continue;
        for (const ch of (eff?.changes ?? [])) {
          // Check both possible void paths: system.rings.void.rank and system.rings.void.value
          if ((ch?.key === "system.rings.void.rank" || ch?.key === "system.rings.void.value") 
              && ch?.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
            const v = Number(ch?.value ?? 0);
            if (Number.isFinite(v)) ae += v;
          }
        }
      }
      if (ae !== 0) { sum += ae; return; }

      // Legacy fallback: check if item grants void bonus
      const tKey = String(doc?.system?.trait ?? "").toLowerCase();
      const amt  = Number(doc?.system?.bonus ?? NaN);
      if (tKey === "void" && Number.isFinite(amt)) sum += amt;
    };

    // Flagged docs
    for (const flagKey of ["familyItemUuid", "schoolItemUuid"]) {
      const uuid = actor.getFlag(SYS_ID, flagKey);
      if (!uuid || !globalThis.fromUuidSync) continue;
      addFromDoc(fromUuidSync(uuid));
    }

    // Embedded docs (older actors)
    for (const it of actor.items ?? []) {
      // Defensive check: ensure this is an actual Item document, not an Active Effect
      if (!it || typeof it.type !== "string") continue;
      if (it.type === "family" || it.type === "school") addFromDoc(it);
    }

    return sum || 0;
  } catch {
    return 0;
  }
}
