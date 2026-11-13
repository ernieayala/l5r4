/**
 * @module effects
 * @description Pure arithmetic for timed effects, conditions, and use counters (roadmap/STAGE-09): the TN of a
 * repeated save, the period a use counter counts in, and the Armor TN once ArmorTN rules apply.
 */

/**
 * The TN of a save after a failure: it moves by `step` and stops at `min`. Dazed starts at TN 20 and drops by 5
 * after each failed save, stopping at 5 (Core Rulebook p.89; STAGE-09 decision 5).
 *
 * @param {number} tn    The TN of the failed save
 * @param {number} step  Change after a failure (negative lowers the TN)
 * @param {number} min   Lowest TN
 * @returns {number}
 *
 * @example
 * nextSaveTn(20, -5, 5); // 15
 * nextSaveTn(5, -5, 5);  // 5
 */
export function nextSaveTn(tn, step, min) {
  return Math.max(min, tn + step);
}

/** Periods a use counter can count in. */
export const USE_PERIODS = Object.freeze(["turn", "round", "skirmish", "day"]);

/**
 * The key of the period a use falls in. Uses stored with another key belong to a past period and count as none,
 * so counters reset without any event. Turn, round, and skirmish counters need a combat; outside one they have no
 * key and count nothing.
 *
 * @param {string} per  One of USE_PERIODS
 * @param {object} now
 * @param {string|null} [now.combatId]  The started combat the actor is in
 * @param {number} [now.round]
 * @param {number|null} [now.turn]
 * @param {number} [now.worldTime]      Seconds
 * @param {number} [now.secondsPerDay]
 * @returns {string|null}
 *
 * @example
 * periodKey("round", { combatId: "abc", round: 2 }); // "abc:2"
 * periodKey("round", {});                            // null
 */
export function periodKey(
  per,
  { combatId = null, round = 0, turn = null, worldTime = 0, secondsPerDay = 86400 }
) {
  if (per === "day") {
    return `day:${Math.floor(worldTime / secondsPerDay)}`;
  }
  if (!combatId) {
    return null;
  }
  switch (per) {
    case "turn":
      return `${combatId}:${round}:${turn}`;
    case "round":
      return `${combatId}:${round}`;
    case "skirmish":
      return combatId;
  }
  throw new Error(`Unknown use period "${per}"`);
}

/**
 * Uses already spent in the current period.
 *
 * @param {{key?: string, count?: number}|undefined} stored  The stored counter
 * @param {string|null} key  The current period's key
 * @returns {number}
 */
export function usesSpent(stored, key) {
  return key !== null && stored?.key === key ? Number(stored.count) || 0 : 0;
}

/**
 * @typedef {object} ArmorRule
 * @property {"add"|"base"|"total"} mode
 * @property {number} value
 * @property {string} [type="untyped"]
 * @property {"melee"|"ranged"|null} [range]  An "add" that counts only against attacks of that range
 */

/**
 * The Armor TN once ArmorTN rules apply (Core Rulebook pp.82, 84, 89; STAGE-09 decision 3).
 *
 * - "add" rules add to the Armor TN; one with a `range` counts only against attacks of that range and is returned
 *   in `vs` for the attacker's roll instead.
 * - "base" rules replace the base when lower (Blinded: Reflexes + 5). Armor, other modifiers, and "add" rules
 *   still apply.
 * - "total" rules set the whole Armor TN to their value plus the armor bonus; nothing else applies (Stunned,
 *   Grappled). The lowest wins.
 *
 * The Armor TN never drops below 5.
 *
 * @param {object} spec
 * @param {number} spec.base    Reflexes × 5 + 5, or an NPC's Armor TN
 * @param {number} spec.armor   Armor bonus
 * @param {number} spec.other   Manual modifiers
 * @param {ArmorRule[]} spec.rules
 * @param {function(object[]): {total: number}} spec.stack  Stacking for "add" rules (modifier-stacking.js)
 * @returns {{current: number, vs: {melee: number, ranged: number}, base: number}}
 *
 * @example
 * // Reflexes 3 Blinded in light armor (+5): base 8 instead of 20
 * resolveArmorTn({ base: 20, armor: 5, other: 0, rules: [{ mode: "base", value: 8 }], stack });
 * // { current: 13, vs: { melee: 0, ranged: 0 }, base: 8 }
 */
export function resolveArmorTn({ base, armor, other, rules, stack }) {
  const lowest = mode => {
    const values = rules.filter(r => r.mode === mode).map(r => r.value);
    return values.length ? Math.min(...values) : null;
  };
  const adds = rules.filter(r => r.mode === "add");
  const general = stack(
    adds.filter(r => !r.range).map(r => ({ total: r.value, type: r.type }))
  ).total;
  const vs = {
    melee: adds.filter(r => r.range === "melee").reduce((sum, r) => sum + r.value, 0),
    ranged: adds.filter(r => r.range === "ranged").reduce((sum, r) => sum + r.value, 0)
  };
  const total = lowest("total");
  if (total !== null) {
    return { current: Math.max(5, total + armor), vs: { melee: 0, ranged: 0 }, base: total };
  }
  const replaced = lowest("base");
  const effectiveBase = replaced === null ? base : Math.min(base, replaced);
  return { current: Math.max(5, effectiveBase + armor + other + general), vs, base: effectiveBase };
}
