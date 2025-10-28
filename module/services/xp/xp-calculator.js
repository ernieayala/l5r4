/**
 * XP History Calculator Service
 *
 * Reconstructs a character's XP expenditure history from their current state by reverse-engineering
 * all trait, skill, and item purchases. This service does NOT read stored history data - instead,
 * it analyzes the character's current abilities and generates a chronological XP history showing
 * how they reached their current state.
 *
 * L5R4 Game Rules Implemented:
 * - **Trait Advancement**: Cost = 4 × new rank (e.g., Reflexes 2→3 costs 12 XP)
 * - **Void Advancement**: Cost = 6 × new rank (e.g., Void 2→3 costs 18 XP)
 * - **Skill Advancement**: Cost = next rank (e.g., Kenjutsu 2→3 costs 3 XP)
 * - **New Skills**: Cost = 1 XP to acquire at rank 1
 * - **Emphases**: Cost = 2 XP each
 * - **Advantages/Disadvantages**: Variable cost from item.system.cost (disadvantages grant XP)
 * - **Kata/Kiho**: Variable cost from item.system.cost
 * - **Creation Bonuses**: Free ranks from family (+1 trait) and school (+1 trait) do not cost XP
 *
 * Algorithm Overview:
 * 1. Calculate trait advancement steps from baseline (2 + free base) to current rank
 * 2. Calculate Void Ring advancement separately (6 × rank formula)
 * 3. Iterate through actor items to find skill ranks, emphases, advantages, etc.
 * 4. Generate unique entry keys to prevent duplicate counting
 * 5. Assign synthetic timestamps for chronological sorting
 * 6. Return sorted XP history array
 *
 * Foundry VTT Integration:
 * - Reads actor.system for trait/ring values
 * - Reads actor.flags[SYS_ID] for trait discounts and free base ranks
 * - Iterates actor.items collection for skills, advantages, disadvantages, kata, kiho
 * - Uses foundry.utils.randomID() for entry IDs
 * - Uses game.i18n for localized note generation
 * - Requires Foundry v10+ for internationalization APIs
 *
 * @module services/xp/xp-calculator
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html|Foundry Document API}
 */

import { SYS_ID } from "../../config/constants.js";
import {
  calculateXpStepCostForTrait,
  calculateVoidStepCost,
  calculateSkillStepCost,
  calculateEmphasisCost,
  getCreationFreeBonus,
  getCreationFreeBonusVoid
} from "../../utils/xp-calculations.js";

/**
 * Add an XP history entry to the spent array if it doesn't already exist.
 *
 * Implements deduplication via composite key checking. Each XP entry is identified by a unique
 * key (e.g., "trait:Reflexes 2→3") to prevent counting the same advancement multiple times.
 * This is critical when reconstructing history from current state, as the same ability could
 * theoretically be derived from multiple code paths.
 *
 * @param {Array<Object>} spent - Array of XP history entries to append to
 * @param {Set<string>} existingEntries - Set of composite keys for deduplication
 * @param {string} entryKey - Unique key for this entry (e.g., "trait:Reflexes 2→3")
 * @param {Object} entryData - Entry data to add if key doesn't exist
 * @param {number} entryData.delta - XP cost (positive for spending, negative for disadvantages)
 * @param {string} entryData.note - Human-readable description of the purchase
 * @param {string} entryData.type - Entry type ("trait", "void", "skill", "advantage", etc.)
 * @param {number} [entryData.ts] - Optional timestamp for chronological sorting
 * @private
 */
function addXpEntry(spent, existingEntries, entryKey, entryData) {
  if (!existingEntries.has(entryKey)) {
    spent.push({
      id: foundry.utils.randomID(),
      ...entryData
    });
    existingEntries.add(entryKey);
  }
}

/**
 * Merge retroactively calculated XP entries with existing manual entries.
 *
 * Preserves manual XP corrections and custom entries while updating auto-calculated entries.
 * Manual entries are identified by the absence of `autoCalculated: true` flag.
 *
 * Strategy:
 * 1. Separate existing entries into manual and auto-calculated
 * 2. Replace all auto-calculated entries with new retroactive calculation
 * 3. Preserve all manual entries (GM corrections, custom adjustments)
 * 4. Merge and sort by timestamp
 *
 * @param {Array<Object>} existingSpent - Current xpSpent array from actor flags
 * @param {Array<Object>} retroactiveSpent - Newly calculated XP entries from buildXpHistory
 * @returns {Array<Object>} Merged array with manual entries preserved and auto entries updated
 */
export function mergeXpHistory(existingSpent, retroactiveSpent) {
  // Separate manual entries (no autoCalculated flag or explicitly false)
  const manualEntries = existingSpent.filter(entry => entry.autoCalculated !== true);

  // Mark all retroactive entries as auto-calculated
  const markedRetroactive = retroactiveSpent.map(entry => ({
    ...entry,
    autoCalculated: true
  }));

  // Merge: manual entries + new auto-calculated entries
  const merged = [...manualEntries, ...markedRetroactive];

  // Sort by timestamp for chronological display
  merged.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  return merged;
}

/**
 * Build complete XP expenditure history from actor's current state.
 *
 * Reconstructs the full XP history by analyzing current trait ranks, skill ranks, and
 * purchased items. This function does NOT read stored history - it reverse-engineers
 * what XP was spent to reach the current state. The resulting history shows all XP
 * expenditures in chronological order (via synthetic timestamps).
 *
 * The function handles several complex cases:
 * - **Free creation ranks**: Family and school bonuses provide free trait ranks that don't cost XP
 * - **Free effective ranks**: Some abilities grant effective ranks that reduce XP costs
 * - **Trait discounts**: Optional XP cost modifiers stored in actor flags
 * - **Skill emphasis parsing**: Comma/semicolon-separated emphasis lists
 * - **Item costs**: Variable costs for advantages, disadvantages, kata, kiho
 *
 * Deduplication Strategy:
 * Uses composite keys (e.g., "trait:Reflexes 2→3") to ensure each advancement is counted
 * exactly once, even if multiple code paths could theoretically generate the same entry.
 *
 * Timestamp Generation:
 * Assigns synthetic timestamps to maintain chronological order for UI display. Earlier
 * advancements get earlier timestamps. Actual timestamps are not historically accurate
 * as this is a reconstruction, not a log.
 *
 * Error Handling:
 * Returns empty array on any error to prevent UI breakage. Logs warning to console
 * for debugging. Defensive coding throughout (optional chaining, null coalescing).
 *
 * @param {Actor} actor - Foundry Actor document to analyze for XP history
 * @returns {Promise<Array<Object>>} Array of XP history entries, sorted chronologically.
 *   Each entry contains: id (unique identifier from foundry.utils.randomID), delta (XP cost,
 *   positive = spent, negative = gained from disadvantages), note (localized description),
 *   type (entry type: "trait", "void", "skill", "advantage", etc.), ts (synthetic timestamp
 *   for sorting), autoCalculated (boolean, true for retroactive entries), plus additional
 *   type-specific properties (traitLabel, skillName, emphasis, itemName, fromValue, toValue, etc.).
 *   Typical usage: call from actor sheet or XP manager to display complete XP expenditure history.
 * @async
 */
export async function buildXpHistory(actor) {
  try {
    const sys = actor.system ?? {};
    const flags = actor.flags?.[SYS_ID] ?? {};

    // Accumulated XP history entries
    const spent = [];

    // Deduplication set: tracks composite keys to prevent duplicate entries
    const existingEntries = new Set();

    // All eight traits in L5R4 (Rings are calculated from pairs of these)
    const TRAITS = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];
    // Trait discounts: Optional XP cost modifiers (usually negative for discounts)
    const traitDiscounts = flags?.traitDiscounts ?? {};
    // Free base ranks: Explicit free ranks stored in flags (takes precedence over creation bonuses)
    const freeTraitBase = flags?.xpFreeTraitBase ?? {};

    // Process all eight traits (Stamina, Willpower, Strength, Perception, Reflexes, Awareness, Agility, Intelligence)
    for (const traitKey of TRAITS) {
      // Current effective trait value from character sheet
      const effCur = parseInt(sys?.traits?.[traitKey]) || 2;
      // Free base ranks from flags (explicit manual setting)
      const freeBase = parseInt(freeTraitBase?.[traitKey] ?? 0);
      // Free effective ranks from family/school creation bonuses (only if no freeBase)
      const freeEff = freeBase > 0 ? 0 : parseInt(getCreationFreeBonus(actor, traitKey)) || 0;
      // XP cost discount (negative values reduce cost)
      const disc = parseInt(traitDiscounts?.[traitKey] ?? 0);

      // Starting baseline: all traits start at 2, plus any free base ranks
      const baseline = 2 + freeBase;
      // Actual rank that costs XP (effective rank minus free effective bonuses, but not below baseline)
      const baseCur = Math.max(baseline, effCur - freeEff);

      // Generate XP entries for each rank advancement from baseline to current
      for (let r = baseline + 1; r <= baseCur; r++) {
        // Calculate XP cost for this single step (accounts for free effective ranks and discounts)
        const cost = calculateXpStepCostForTrait(r, freeEff, disc);
        const traitLabel =
          game.i18n.localize(`l5r4.ui.mechanics.traits.${traitKey}`) || traitKey.toUpperCase();

        // Localized note: "Reflexes 2→3"
        const note = game.i18n.format("l5r4.character.experience.traitChange", {
          label: traitLabel,
          from: r - 1,
          to: r
        });
        const entryKey = `trait:${note}`;

        addXpEntry(spent, existingEntries, entryKey, {
          delta: cost,
          note: note,
          type: "trait",
          traitLabel: traitLabel,
          fromValue: r - 1,
          toValue: r,
          // Synthetic timestamp: earlier ranks get earlier times (1000ms spacing)
          ts: Date.now() - (baseCur - r) * 1000
        });
      }
    }

    // Void Ring: Handled separately as it has no component traits (unlike other rings)
    // Check multiple possible locations for backward compatibility
    const voidEffCur = parseInt(
      sys?.rings?.void?.rank ?? sys?.rings?.void?.value ?? sys?.rings?.void ?? 0
    );
    const voidFreeBase = parseInt(freeTraitBase?.void ?? 0);
    // Free effective Void from creation bonuses (only if no freeBase)
    const voidFreeEff = voidFreeBase > 0 ? 0 : parseInt(getCreationFreeBonusVoid(actor) ?? 0);
    const voidBaseline = 2 + voidFreeBase;
    const voidBaseCur = Math.max(voidBaseline, voidEffCur - voidFreeEff);

    if (voidBaseCur > voidBaseline) {
      for (let r = voidBaseline + 1; r <= voidBaseCur; r++) {
        // Void Ring formula: 6 × new rank (L5R4 core rules)
        const cost = calculateVoidStepCost(r, parseInt(traitDiscounts?.void ?? 0));

        // Localized note: "Void 2→3"
        const note = game.i18n.format("l5r4.character.experience.voidChange", {
          from: r - 1,
          to: r
        });
        const entryKey = `void:${note}`;

        addXpEntry(spent, existingEntries, entryKey, {
          delta: cost,
          note: note,
          type: "void",
          fromValue: r - 1,
          toValue: r,
          // Synthetic timestamp with same spacing as traits
          ts: Date.now() - (voidBaseCur - r) * 1000
        });
      }
    }

    // Process actor items: skills, emphases, advantages, disadvantages, kata, kiho
    for (const item of actor.items) {
      if (!item || typeof item.type !== "string") {
        continue;
      }

      // Skills: Track rank advancements (cost = next rank, e.g., 2→3 costs 3 XP)
      if (item.type === "skill") {
        const rank = parseInt(item.system?.rank) || 0;
        const freeRanks = Math.max(0, parseInt(item.system?.freeRanks) || 0);

        // Only process ranks above free ranks (school starting skills, etc.)
        if (rank > freeRanks) {
          // Generate entry for each rank advancement
          for (let r = freeRanks + 1; r <= rank; r++) {
            const note = `${item.name} ${r}`;
            const entryKey = `skill:${note}`;

            addXpEntry(spent, existingEntries, entryKey, {
              delta: calculateSkillStepCost(r), // Skill advancement cost = new rank value
              note: note,
              type: "skill",
              skillName: item.name,
              fromValue: r - 1,
              toValue: r,
              // Synthetic timestamp with wider spacing (skills rank 1-10 typical)
              ts: Date.now() - (100 - r) * 1000
            });
          }
        }

        // Skill Emphases: Specialized aspects that allow re-rolling 1s (cost = 2 XP each)
        const trainedEmphases = Array.isArray(item.system?.trainedEmphases)
          ? item.system.trainedEmphases
          : [];
        if (trainedEmphases.length > 0) {
          const freeEmphasis = Math.max(0, parseInt(item.system?.freeEmphasis) || 0);
          // Only count emphases beyond the free count
          const paidEmphases = trainedEmphases.slice(freeEmphasis);

          paidEmphases.forEach((emphasis, index) => {
            const note = `${item.name} - Emphasis: ${emphasis}`;
            const entryKey = `skill:${note}`;

            addXpEntry(spent, existingEntries, entryKey, {
              delta: calculateEmphasisCost(), // Emphasis cost is always 2 XP (L5R4 core rules)
              note: note,
              type: "skill",
              skillName: item.name,
              emphasis: emphasis,
              fromValue: 0,
              toValue: 1,
              // Synthetic timestamp with different spacing to separate from ranks
              ts: Date.now() - (50 - index) * 1000
            });
          });
        }
      }

      // Advantages, Disadvantages, Kata, Kiho: Variable XP costs from item data
      if (
        item.type === "advantage" ||
        item.type === "disadvantage" ||
        item.type === "kata" ||
        item.type === "kiho"
      ) {
        const cost = parseInt(item.system?.cost) || 0;
        if (cost > 0) {
          // Disadvantages grant XP (negative delta), others spend XP (positive delta)
          const delta = item.type === "disadvantage" ? -cost : cost;
          const note = item.name;
          const entryKey = `${item.type}:${note}`;

          addXpEntry(spent, existingEntries, entryKey, {
            delta: delta,
            note: note,
            type: item.type,
            itemName: item.name,
            // Random timestamp within 10-second window (these have no inherent order)
            ts: Date.now() - Math.random() * 10000
          });
        }
      }

      // Spells: Memorization costs XP equal to mastery level
      if (item.type === "spell") {
        const memorized = item.system?.memorized ?? false;
        if (memorized) {
          const mastery = parseInt(item.system?.mastery) || 1;
          const note = game.i18n.format("l5r4.character.experience.spellMemorized", {
            name: item.name
          });
          const entryKey = `spell:memorized:${item.name}`;

          addXpEntry(spent, existingEntries, entryKey, {
            delta: mastery,
            note: note,
            type: "spell",
            itemName: item.name,
            mastery: mastery,
            // Random timestamp within 10-second window
            ts: Date.now() - Math.random() * 10000
          });
        }
      }
    }

    // Sort by synthetic timestamp to create chronological history for UI display
    spent.sort((a, b) => (a.ts || 0) - (b.ts || 0));

    return spent;
  } catch (err) {
    // Fail gracefully: return empty history rather than breaking the UI
    console.warn(`${SYS_ID}`, "Failed to build XP history", err);
    return [];
  }
}
