/**
 * @fileoverview L5R4 XP Calculator Service
 * 
 * Pure XP calculation service that reconstructs experience point expenditure history
 * from a character's current state. This service handles the complex logic of calculating
 * XP costs for traits, void, skills, and items while respecting free ranks, family bonuses,
 * and other L5R4 advancement rules.
 * 
 * **Core Responsibilities:**
 * - **History Reconstruction**: Build complete XP expenditure log from character data
 * - **Trait Calculations**: Compute XP costs with family bonuses and discounts
 * - **Void Calculations**: Handle void advancement with separate progression
 * - **Skill Calculations**: Calculate skill rank and emphasis costs
 * - **Item Calculations**: Process advantages, disadvantages, kata, and kiho costs
 * - **Deduplication**: Prevent duplicate entries when rebuilding history
 * 
 * **Design Principles:**
 * - **Pure Functions**: No side effects, no direct actor modifications
 * - **Actor as Input**: Receive actor document, return calculated data
 * - **Integration Ready**: Uses shared calculation functions from xp-system.js
 * - **Defensive Coding**: Handles missing/invalid data gracefully
 * 
 * **XP Cost Formulas (L5R4 Rules):**
 * - **Traits**: 4 × (new rank + family bonuses) per step
 * - **Void**: 6 × new rank per step
 * - **Skills**: Triangular progression (1+2+3+...+rank), minus free ranks
 * - **Emphases**: 2 XP each, minus free emphases
 * - **Items**: Direct cost from item system data
 * 
 * **Duplicate Prevention:**
 * Uses same note formats as real-time XP logging to prevent duplicate entries:
 * - Trait entries: "Awareness 3→4" (matches actor document format)
 * - Void entries: "Void 2→3" (matches actor document format)
 * - Skill entries: "Skill Name 3" (retroactive only, no real-time equivalent)
 * - Item entries: Item name with type prefix
 * 
 * **Usage:**
 * ```javascript
 * import { buildXpHistory } from "./xp-calculator.js";
 * 
 * const xpEntries = await buildXpHistory(actor);
 * // Returns array of XP entries with id, delta, note, type, ts, etc.
 * ```
 * 
 * @author L5R4 System Team
 * @since 2.0.0
 * @version 2.0.0
 * @see {@link ../../documents/actor/calculations/xp-system.js|XP System} - Shared calculation functions
 * @see {@link ../../apps/xp-manager.js|XP Manager} - UI that uses this service
 */

import { SYS_ID } from "../../config/constants.js";
import {
  calculateXpStepCostForTrait,
  getCreationFreeBonus,
  getCreationFreeBonusVoid
} from "../../utils/xp-calculations.js";

/**
 * Build complete XP expenditure history from actor's current state.
 * Reconstructs all XP costs for traits, void, skills, and items based on
 * current character data. Prevents duplicate entries using consistent note formats.
 * 
 * **Entry Format:**
 * ```javascript
 * {
 *   id: "abc123",           // Unique ID
 *   delta: 16,              // XP cost (negative for disadvantages)
 *   note: "Stamina 2→3",    // Human-readable description
 *   type: "trait",          // Entry category
 *   ts: 1234567890,         // Timestamp (fake for retroactive)
 *   // Type-specific metadata:
 *   traitLabel: "Stamina",  // (traits only)
 *   fromValue: 2,           // (traits/void/skills)
 *   toValue: 3,             // (traits/void/skills)
 *   skillName: "Kenjutsu",  // (skills only)
 *   emphasis: "Katana",     // (skill emphasis only)
 *   itemName: "Quick"       // (advantages/disadvantages/kata/kiho)
 * }
 * ```
 * 
 * **Free Rank Handling:**
 * - Family/School bonuses from Active Effects are treated as free
 * - Free ranks reduce XP cost regardless of source
 * - Baseline starts at 2 + any baked-in free base ranks
 * 
 * **Deduplication:**
 * Tracks entries by type:note key to prevent duplicates within a single rebuild.
 * Does not check against existing xpSpent (caller's responsibility).
 * 
 * @param {Actor} actor - Actor document to calculate XP history for
 * @returns {Array<object>} Array of XP entry objects sorted by timestamp
 * 
 * @example
 * const entries = await buildXpHistory(actor);
 * // Returns: [
 * //   { id: "...", delta: 12, note: "Reflexes 2→3", type: "trait", ... },
 * //   { id: "...", delta: 3, note: "Kenjutsu 3", type: "skill", ... },
 * //   ...
 * // ]
 */
export async function buildXpHistory(actor) {
  try {
    const sys = actor.system ?? {};
    const flags = actor.flags?.[SYS_ID] ?? {};
    
    const spent = [];
    
    // Track entries we add during this rebuild to avoid internal duplicates
    const existingEntries = new Set();

    // Rebuild trait purchases
    const TRAITS = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];
    const traitDiscounts = flags?.traitDiscounts ?? {};
    const freeTraitBase = flags?.xpFreeTraitBase ?? {};

    for (const traitKey of TRAITS) {
      const effCur = parseInt(sys?.traits?.[traitKey]) || 2;
      const freeBase = parseInt(freeTraitBase?.[traitKey] ?? 0);
      const freeEff = freeBase > 0 ? 0 : parseInt(getCreationFreeBonus(actor, traitKey)) || 0;
      const disc = parseInt(traitDiscounts?.[traitKey] ?? 0);
      
      const baseline = 2 + freeBase;
      const baseCur = Math.max(baseline, effCur - freeEff);
      
      // Create entries for each rank increase
      for (let r = baseline + 1; r <= baseCur; r++) {
        const cost = calculateXpStepCostForTrait(r, freeEff, disc);
        const traitLabel = game.i18n.localize(`l5r4.ui.mechanics.traits.${traitKey}`) || traitKey.toUpperCase();
        
        // Use same format as real-time trait changes to prevent duplicates
        const note = game.i18n.format("l5r4.character.experience.traitChange", { 
          label: traitLabel, 
          from: r - 1, 
          to: r 
        });
        const entryKey = `trait:${note}`;
        
        // Only add if this entry doesn't already exist
        if (!existingEntries.has(entryKey)) {
          spent.push({
            id: foundry.utils.randomID(),
            delta: cost,
            note: note,
            type: "trait",
            traitLabel: traitLabel,
            fromValue: r - 1,
            toValue: r,
            ts: Date.now() - (baseCur - r) * 1000 // Fake timestamps in reverse order
          });
          existingEntries.add(entryKey);
        }
      }
    }

    // Rebuild void purchases
    const voidEffCur = parseInt(sys?.rings?.void?.rank ?? sys?.rings?.void?.value ?? sys?.rings?.void ?? 0);
    const voidFreeBase = parseInt(freeTraitBase?.void ?? 0);
    const voidFreeEff = voidFreeBase > 0 ? 0 : parseInt(getCreationFreeBonusVoid(actor) ?? 0);
    const voidBaseline = 2 + voidFreeBase;
    const voidBaseCur = Math.max(voidBaseline, voidEffCur - voidFreeEff);
    
    if (voidBaseCur > voidBaseline) {
      for (let r = voidBaseline + 1; r <= voidBaseCur; r++) {
        const cost = 6 * r + parseInt(traitDiscounts?.void ?? 0);
        
        // Use same format as real-time void changes to prevent duplicates
        const note = game.i18n.format("l5r4.character.experience.voidChange", { 
          from: r - 1, 
          to: r 
        });
        const entryKey = `void:${note}`;
        
        // Only add if this entry doesn't already exist
        if (!existingEntries.has(entryKey)) {
          spent.push({
            id: foundry.utils.randomID(),
            delta: Math.max(0, cost),
            note: note,
            type: "void",
            fromValue: r - 1,
            toValue: r,
            ts: Date.now() - (voidBaseCur - r) * 1000
          });
          existingEntries.add(entryKey);
        }
      }
    }

    // Rebuild skill purchases
    for (const item of actor.items) {
      // Defensive check: ensure this is an actual Item document, not an Active Effect
      if (!item || typeof item.type !== "string" || item.type !== "skill") continue;
      
      const rank = parseInt(item.system?.rank) || 0;
      const freeRanks = Math.max(0, parseInt(item.system?.freeRanks) || 0);
      
      if (rank > freeRanks) {
        // Create individual entries for each rank increase above free ranks
        for (let r = freeRanks + 1; r <= rank; r++) {
          const note = `${item.name} ${r}`;
          const entryKey = `skill:${note}`;
          
          // Only add if this entry doesn't already exist
          if (!existingEntries.has(entryKey)) {
            spent.push({
              id: foundry.utils.randomID(),
              delta: r,
              note: note,
              type: "skill",
              skillName: item.name,
              fromValue: r - 1,
              toValue: r,
              ts: Date.now() - (100 - r) * 1000
            });
            existingEntries.add(entryKey);
          }
        }
      }

      // Add emphasis costs (excluding free emphasis)
      const emph = String(item.system?.emphasis ?? "").trim();
      if (emph) {
        const emphases = emph.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        const freeEmphasis = Math.max(0, parseInt(item.system?.freeEmphasis) || 0);
        const paidEmphases = emphases.slice(freeEmphasis); // Skip free emphasis count
        
        paidEmphases.forEach((emphasis, index) => {
          const note = `${item.name} - Emphasis: ${emphasis}`;
          const entryKey = `skill:${note}`;
          
          // Only add if this entry doesn't already exist
          if (!existingEntries.has(entryKey)) {
            spent.push({
              id: foundry.utils.randomID(),
              delta: 2,
              note: note,
              type: "skill",
              skillName: item.name,
              emphasis: emphasis,
              fromValue: 0,
              toValue: 1,
              ts: Date.now() - (50 - index) * 1000
            });
            existingEntries.add(entryKey);
          }
        });
      }
    }

    // Rebuild advantage, disadvantage, kata, and kiho purchases
    for (const item of actor.items) {
      // Defensive check: ensure this is an actual Item document with a valid type
      if (!item || typeof item.type !== "string") continue;
      if (item.type !== "advantage" && item.type !== "disadvantage" && item.type !== "kata" && item.type !== "kiho") continue;
      
      const cost = parseInt(item.system?.cost) || 0;
      if (cost > 0) {
        // Disadvantages should show as negative XP (they grant XP to the character)
        const delta = item.type === "disadvantage" ? -cost : cost;
        const note = item.name;
        const entryKey = `${item.type}:${note}`;
        
        // Only add if this entry doesn't already exist
        if (!existingEntries.has(entryKey)) {
          spent.push({
            id: foundry.utils.randomID(),
            delta: delta,
            note: note,
            type: item.type,
            itemName: item.name,
            ts: Date.now() - Math.random() * 10000
          });
          existingEntries.add(entryKey);
        }
      }
    }

    // Sort by timestamp
    spent.sort((a, b) => (a.ts || 0) - (b.ts || 0));

    return spent;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to build XP history", err);
    return [];
  }
}
