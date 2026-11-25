/**
 * @module documents/actor/calculations/xp-system
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
import { getKihoLimits } from "../../../utils/kiho.js";
import { getCostPricer, getXpEntries, getXpTotals } from "../../../utils/xp-ledger.js";

/**
 * The Insight Rank of a total of Insight points: Rank 1 below 150, Rank 2 from 150, then one Rank more for every 25
 * points.
 * @param {number} insight - Total Insight points
 * @returns {number} Insight Rank (1-10+)
 */
export function getInsightRank(insight) {
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
 * Price a PC's XP and store `sys._xp`: total, spent, available, the breakdown by category, and the itemized
 * entries.
 * game-rules/48_character_creation_expanded.md, p.102-103
 * game-rules/63_advantages_and_disadvantages.md, p.145
 * @param {Actor} actor - The PC actor
 * @param {object} sys - Actor's system data
 */
export function preparePcExperience(actor, sys) {
  const build = xpBuildOf(actor);
  const price = getCostPricer({
    costs: actor.ruleBag.costs,
    options: actor.rollOptions,
    rollData: actor.getRollData(),
    report: (source, message) =>
      console.warn(`${SYS_ID} | Cost rule on "${source}" (${actor.name}) skipped: ${message}`)
  });
  const entries = getXpEntries(build, price);
  // The entries stay on the prepared data for the XP manager's history (module/services/xp/calculator.js)
  sys._xp = { ...getXpTotals(build, entries), entries, kiho: kihoLimitsOf(actor) };
}

/**
 * Mark the free ranks a legacy Family or School bonus gives when an update raises a Trait or the Void Ring, and
 * reset the retroactive XP version so the XP history is rebuilt. A legacy bonus (`system.trait`/`bonus`) is not
 * applied to the Trait, so the player stores it as ranks: the raises to ranks 3 up to 2 + the bonus are free, and
 * `xpFreeTraitBase` counts them. A TraitAdjust rule bonus adds on top of the stored rank and never marks a free
 * rank. Only a PC is tracked.
 * game-rules/48_character_creation_expanded.md, p.102-103
 * @param {Actor} actor - The PC actor being updated
 * @param {object} changed - Object containing changed properties
 */
export function updateXpFlags(actor, changed) {
  try {
    if (actor.type !== "pc") {
      return;
    }

    const raised = raisedTraitsOf(actor, changed);
    const freeTraitBase = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};
    for (const raise of raised) {
      updateFreeTraitBase(actor, changed, { ...raise, freeTraitBase });
    }

    // Reset retroactive version to recalculate XP
    if (changed?.system?.traits || changed?.system?.rings?.void) {
      foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpRetroactiveVersion`, 0);
    }
  } catch (err) {
    logError("Free bonus tracking failed", err);
  }
}

/**
 * The XP-relevant parts of a PC (module/utils/xp-ledger.js, XpBuild): stored ranks, the flags 3.2.1 kept (starting
 * XP, awards, the Disadvantage cap, Trait discounts, legacy free ranks), Skills, and priced items.
 * @param {Actor} actor
 * @returns {import("../../../utils/xp-ledger.js").XpBuild}
 */
function xpBuildOf(actor) {
  const flags = actor.flags?.[SYS_ID] ?? {};
  const xpManual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
  const items = xpItemsOf(actor);

  return {
    base: Number.isFinite(+flags.xpBase) ? Number(flags.xpBase) : 40,
    manual: xpManual.reduce((sum, e) => sum + toInt(e?.delta), 0),
    disadvantageCap: Number.isFinite(+flags.disadvantageCap) ? Number(flags.disadvantageCap) : 10,
    ...xpRanksOf(actor, flags),
    skills: xpSkillsOf(actor),
    items
  };
}

/**
 * The Traits and the Void Ring as XP prices them: each stored rank with its legacy free ranks, its Family and School
 * bonus, and its discount.
 * @param {Actor} actor
 * @param {object} flags - The actor's system flags
 * @returns {{traits: import("../../../utils/xp-ledger.js").XpTrait[], void: object}}
 */
function xpRanksOf(actor, flags) {
  const traitDiscounts = flags.traitDiscounts ?? {};
  const freeTraitBase = flags.xpFreeTraitBase ?? {};
  const stored = actor._source.system;
  return {
    traits: Object.keys(stored.traits).map(key => ({
      key,
      stored: toInt(stored.traits[key]),
      freeBase: toInt(freeTraitBase[key] ?? 0),
      bonus: toInt(getCreationFreeBonus(actor, key)),
      legacy: toInt(getCreationFreeBonusSources(actor, key).legacy),
      discount: toInt(traitDiscounts[key] ?? 0)
    })),
    void: {
      stored: toInt(stored.rings.void.rank),
      freeBase: toInt(freeTraitBase.void ?? 0),
      bonus: toInt(getCreationFreeBonus(actor, "void")),
      legacy: toInt(getCreationFreeBonusSources(actor, "void").legacy),
      discount: toInt(traitDiscounts.void ?? 0)
    }
  };
}

/**
 * The Skills as XP prices them.
 * @param {Actor} actor
 * @returns {import("../../../utils/xp-ledger.js").XpSkill[]}
 */
function xpSkillsOf(actor) {
  return actor.items
    .filter(item => item.type === "skill")
    .map(item => ({
      name: item.name,
      type: item.system.type,
      rank: toInt(item.system.rank),
      freeRanks: toInt(item.system.freeRanks),
      emphases: item.system.trainedEmphases.filter(Boolean),
      freeEmphasis: toInt(item.system.freeEmphasis)
    }));
}

/**
 * The priced items: Advantages and Disadvantages at their cost; a kata, a kiho, and a memorized spell at their
 * Mastery Level (#43), and a kiho the Monk School gives at 0 (Stage 18 decision 19).
 * game-rules/66_magic_and_spell_casting.md, p.164
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 * game-rules/86_kata.md, p.259
 * @param {Actor} actor
 * @returns {import("../../../utils/xp-ledger.js").XpItem[]}
 */
function xpItemsOf(actor) {
  const items = [];
  for (const item of actor.items) {
    if (["advantage", "disadvantage"].includes(item.type)) {
      items.push({ id: item.id, type: item.type, name: item.name, cost: toInt(item.system.cost) });
    } else if (
      ["kata", "kiho"].includes(item.type) ||
      (item.type === "spell" && item.system.memorized === true)
    ) {
      const free = item.type === "kiho" && item.system.schoolKiho;
      items.push({
        id: item.id,
        type: item.type,
        name: item.name,
        cost: free ? 0 : toInt(item.system.mastery)
      });
    }
  }
  return items;
}

/**
 * The character's kiho against what its Monk Schools allow, for the XP manager's warning; null with no Monk School.
 * game-rules/80_brotherhood_of_shinsei.md, p.231
 * @param {Actor} actor
 * @returns {ReturnType<typeof getKihoLimits>}
 */
function kihoLimitsOf(actor) {
  const schools = actor.items
    .filter(item => item.type === "school")
    .map(item => ({ kiho: toInt(item.system.kiho), rank: item.system.schoolRank }));
  const kiho = actor.items
    .filter(item => item.type === "kiho")
    .map(item => ({ schoolKiho: item.system.schoolKiho }));
  return getKihoLimits(schools, kiho);
}

/**
 * The Traits, and the Void Ring, that an update raises or sets: each key with its new and its stored value. A Family
 * or School can raise the Void Ring as well.
 * game-rules/48_character_creation_expanded.md, p.102
 * @param {Actor} actor
 * @param {object} changed - The update's changed data
 * @returns {{key: string, value: *, old: *}[]}
 */
function raisedTraitsOf(actor, changed) {
  const oldSys = actor._source.system;
  const raised = Object.entries(changed?.system?.traits ?? {}).map(([key, value]) => ({
    key,
    value,
    old: oldSys.traits[key]
  }));
  if (changed?.system?.rings?.void?.rank !== undefined) {
    raised.push({
      key: "void",
      value: changed.system.rings.void.rank,
      old: oldSys.rings.void.rank
    });
  }
  return raised;
}

/**
 * Mark in `changed` the legacy free ranks one raised Trait reaches. Only the legacy fields are a stored rank: a
 * TraitAdjust rule adds on top of the stored rank, so every stored rank is bought and costs its multiple of the new
 * rank with the bonus. The ranks from 3 up to 2 + the legacy bonus are free, each marked as it is reached: a Family
 * and a School raising the same Trait give two.
 * game-rules/48_character_creation_expanded.md, p.102-103
 * @param {Actor} actor
 * @param {object} changed - The update's changed data, extended in place
 * @param {object} raise
 * @param {string} raise.key - The Trait key, or "void"
 * @param {*} raise.value - The new value
 * @param {*} raise.old - The stored value
 * @param {Record<string, number>} raise.freeTraitBase - The free ranks already marked, by key
 */
function updateFreeTraitBase(actor, changed, { key, value, old, freeTraitBase }) {
  const newBase = toInt(value);
  const oldBase = toInt(old);
  if (!Number.isFinite(newBase) || newBase <= oldBase) {
    return;
  }
  const legacyBonus = toInt(getCreationFreeBonusSources(actor, key).legacy);
  const freeBase = toInt(freeTraitBase[key] ?? 0);

  let free = freeBase;
  for (let r = oldBase + 1; r <= newBase; r++) {
    if (free < legacyBonus && r === 3 + free) {
      free++;
    }
  }
  if (free !== freeBase) {
    foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpFreeTraitBase.${key}`, free);
  }
}
