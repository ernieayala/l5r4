/**
 * @module services/xp/calculator
 * @description The XP manager's purchase history: one record per entry of the character's XP ledger
 * (module/utils/xp-ledger.js), which preparation leaves in `system._xp.entries`. The history therefore lists exactly
 * what the sheet's XP total charges, Cost rules included (roadmap/STAGE-11). Timestamps are synthetic: the history is
 * rebuilt from the character as it is, not logged as purchases happen.
 */

import { SYS_ID } from "../../config/constants.js";

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
 * 4. Merge and sort by timestamp.
 *
 * @param {Array<object>} existingSpent - Current xpSpent array from actor flags
 * @param {Array<object>} retroactiveSpent - Newly calculated XP entries from buildXpHistory
 * @returns {Array<object>} Merged array with manual entries preserved and auto entries updated
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
 * Build a PC's XP purchase history from its prepared XP ledger, in ledger order.
 *
 * @param {Actor} actor - A prepared PC
 * @returns {Promise<Array<object>>} History records: id, delta (XP spent; negative for a Disadvantage), note, type,
 *   ts, and per type traitLabel, skillName, emphasis, itemName, fromValue, toValue. Empty on an error, so the XP
 *   manager still opens.
 */
export async function buildXpHistory(actor) {
  try {
    const now = Date.now();
    const entries = actor.system._xp.entries;
    const spent = [];
    // The ledger lists purchases in a fixed order; synthetic timestamps keep that order in the history
    entries.forEach((entry, i) => {
      const record = historyRecord(entry);
      if (record) {
        spent.push({
          id: foundry.utils.randomID(),
          ...record,
          ts: now - (entries.length - i) * 1000
        });
      }
    });
    return spent;
  } catch (err) {
    // Fail gracefully: return empty history rather than breaking the UI
    console.warn(`${SYS_ID}`, "Failed to build XP history", err);
    return [];
  }
}

/**
 * One history record for a ledger entry (module/utils/xp-ledger.js), in the shape xp-formatter.js reads. An item
 * that cost nothing is left out.
 * @param {import("../../utils/xp-ledger.js").XpEntry} entry
 * @returns {object|null}
 */
function historyRecord(entry) {
  const { type, name, delta, from, to } = entry;
  switch (type) {
    case "trait": {
      const traitLabel = game.i18n.localize(`l5r4.ui.mechanics.traits.${name}`);
      return {
        delta,
        type,
        traitLabel,
        fromValue: from,
        toValue: to,
        note: game.i18n.localize("l5r4.character.experience.traitChange", {
          label: traitLabel,
          from,
          to
        })
      };
    }
    case "void":
      return {
        delta,
        type,
        fromValue: from,
        toValue: to,
        note: game.i18n.localize("l5r4.character.experience.voidChange", { from, to })
      };
    case "skill":
      return { delta, type, skillName: name, fromValue: from, toValue: to, note: `${name} ${to}` };
    case "emphasis":
      return {
        delta,
        type: "skill",
        skillName: name,
        emphasis: entry.emphasis,
        fromValue: 0,
        toValue: 1,
        note: `${name} - Emphasis: ${entry.emphasis}`
      };
    case "spell":
      return {
        delta,
        type,
        itemName: name,
        note: game.i18n.localize("l5r4.character.experience.spellMemorized", { name })
      };
    default:
      return delta === 0 ? null : { delta, type, itemName: name, note: name };
  }
}
