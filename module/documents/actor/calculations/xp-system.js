/**
 * @module xp-system
 * @description A PC's XP and Insight Rank. The XP arithmetic is module/utils/xp-ledger.js: this module gathers what
 * it prices from the actor (stored ranks, Skills, items, the 3.2.1 XP flags) and its Cost rules (roadmap/STAGE-11),
 * and keeps the legacy free-rank flag current when a Trait is raised.
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import {
  getCreationFreeBonus,
  getCreationFreeBonusSources
} from "../../../utils/xp-calculations.js";
import { costPricer, xpEntries, xpTotals } from "../../../utils/xp-ledger.js";

/**
 * Calculates Insight Rank from total Insight points.
 *
 * @param {number} insight - Total Insight points
 * @returns {number} Insight Rank (1-10+)
 *
 * @description
 * L5R4 Insight Rank thresholds:
 * - Rank 1: 0-149 Insight
 * - Rank 2: 150-174 Insight
 * - Rank 3: 175-199 Insight
 * - Rank 4: 200-224 Insight
 * - Rank 5: 225-249 Insight
 * - Rank 6+: Every 25 Insight above 225
 *
 * Insight Rank determines:
 * - School Rank (techniques available)
 * - Character power level
 * - Mastery abilities
 *
 * @example
 * calculateInsightRank(180); // Returns 3
 * calculateInsightRank(250); // Returns 6
 */
export function calculateInsightRank(insight) {
  // Thresholds for Ranks 2-5
  const t = [150, 175, 200, 225];
  let rank = 1;

  // Check standard thresholds
  for (let i = 0; i < t.length; i++) {
    if (insight >= t[i]) {
      rank = i + 2;
    }
  }

  // Rank 6+: Every 25 Insight above 225
  if (insight >= 225) {
    rank += Math.floor((insight - 225) / 25);
  }

  return rank;
}

/**
 * Price a PC's XP (pp.102-103, 145) and store `sys._xp`: total, spent, available, the breakdown by category, and
 * the itemized entries.
 *
 * @param {Actor} actor - The PC actor
 * @param {Object} sys - Actor's system data
 */
export function preparePcExperience(actor, sys) {
  const build = xpBuild(actor);
  const price = costPricer({
    costs: actor.ruleBag.costs,
    options: actor.rollOptions,
    rollData: actor.getRollData(),
    report: (source, message) =>
      console.warn(`${SYS_ID} | Cost rule on "${source}" (${actor.name}) skipped: ${message}`)
  });
  const entries = xpEntries(build, price);
  // The entries stay on the prepared data for the XP manager's history (module/services/xp/xp-calculator.js)
  sys._xp = { ...xpTotals(build, entries), entries };
}

/**
 * The XP-relevant parts of a PC (module/utils/xp-ledger.js, XpBuild): stored ranks, the flags 3.2.1 kept (starting
 * XP, awards, the Disadvantage cap, Trait discounts, legacy free ranks), Skills, and priced items.
 * @param {Actor} actor
 * @returns {import("../../../utils/xp-ledger.js").XpBuild}
 */
function xpBuild(actor) {
  const flags = actor.flags?.[SYS_ID] ?? {};
  const xpManual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
  const traitDiscounts = flags.traitDiscounts ?? {};
  const freeTraitBase = flags.xpFreeTraitBase ?? {};
  const stored = actor._source.system;

  const items = [];
  for (const item of actor.items) {
    if (["advantage", "disadvantage", "kata", "kiho"].includes(item.type)) {
      items.push({ id: item.id, type: item.type, name: item.name, cost: toInt(item.system.cost) });
    } else if (item.type === "spell" && item.system.memorized === true) {
      // A memorized spell costs its Mastery Level
      items.push({ id: item.id, type: "spell", name: item.name, cost: toInt(item.system.mastery) });
    }
  }

  return {
    base: Number.isFinite(+flags.xpBase) ? Number(flags.xpBase) : 40,
    manual: xpManual.reduce((sum, e) => sum + toInt(e?.delta), 0),
    disadvantageCap: Number.isFinite(+flags.disadvantageCap) ? Number(flags.disadvantageCap) : 10,
    traits: Object.keys(stored.traits).map(key => ({
      key,
      stored: toInt(stored.traits[key]),
      freeBase: toInt(freeTraitBase[key] ?? 0),
      bonus: toInt(getCreationFreeBonus(actor, key)),
      discount: toInt(traitDiscounts[key] ?? 0)
    })),
    void: {
      stored: toInt(stored.rings.void.rank),
      freeBase: toInt(freeTraitBase.void ?? 0),
      discount: toInt(traitDiscounts.void ?? 0)
    },
    skills: actor.items
      .filter(item => item.type === "skill")
      .map(item => ({
        name: item.name,
        type: item.system.type,
        rank: toInt(item.system.rank),
        freeRanks: toInt(item.system.freeRanks),
        emphases: item.system.trainedEmphases.filter(Boolean),
        freeEmphasis: toInt(item.system.freeEmphasis)
      })),
    items
  };
}

/**
 * Tracks XP expenditure and applies free bonuses during actor updates.
 *
 * @param {Actor} actor - The PC actor being updated
 * @param {Object} changed - Object containing changed properties
 *
 * @description
 * Monitors trait increases to apply free bonuses:
 * - When a trait reaches rank 3 for the first time
 * - If character has unused free bonus from creation
 * - Automatically applies free bonus to save XP
 *
 * Free Bonus System:
 * - Characters get free +1 to certain traits at creation
 * - A legacy Family/School bonus (`system.trait`/`bonus`) is not applied to the Trait, so the player stores
 *   it as a rank: the first raise to rank 3 is that free rank
 * - A TraitAdjust rule bonus adds on top of the stored rank and never marks a free rank
 * - Tracked in xpFreeTraitBase flag
 * - Retroactive version flag prevents double-application
 *
 * Only runs for PC actors during updates.
 */
export function trackXpExpenditure(actor, changed) {
  try {
    if (actor.type !== "pc") {
      return;
    }

    const oldSys = actor._source?.system ?? actor.system;
    const freeTraitBase = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

    // Check for trait increases
    if (changed?.system?.traits) {
      for (const [k, v] of Object.entries(changed.system.traits)) {
        const newBase = toInt(v);
        const oldBase = toInt(oldSys?.traits?.[k]);
        if (!Number.isFinite(newBase) || newBase <= oldBase) {
          continue;
        }

        const freeBase = toInt(freeTraitBase?.[k] ?? 0);
        // Only the legacy fields are a stored rank. A TraitAdjust rule adds on top of the stored rank, so
        // every stored rank is bought and costs 4 × the Trait's new rank with the bonus (Core Rulebook p.103).
        const legacyBonus = toInt(getCreationFreeBonusSources(actor, k).legacy);

        // Apply free bonus when reaching rank 3 (if available)
        for (let r = oldBase + 1; r <= newBase; r++) {
          if (freeBase === 0 && legacyBonus > 0 && r === 3) {
            // Mark free bonus as used
            foundry.utils.setProperty(
              changed,
              `flags.${SYS_ID}.xpFreeTraitBase.${k}`,
              (freeTraitBase?.[k] ?? 0) + 1
            );
            break;
          }
        }
      }
    }

    // Reset retroactive version to recalculate XP
    if (changed?.system?.traits || changed?.system?.rings?.void) {
      foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpRetroactiveVersion`, 0);
    }
  } catch (err) {
    logError("Free bonus tracking failed", err);
  }
}
