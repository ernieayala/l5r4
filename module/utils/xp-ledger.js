/**
 * @module utils/xp-ledger
 * @description A character's XP, itemized: what each Trait rank, Void rank, Skill rank, Emphasis, and item cost, and
 * what Disadvantages gave. Cost rules change prices (roadmap/STAGE-11): the sheet's totals and the XP manager's
 * history both read these entries.
 * game-rules/48_character_creation_expanded.md, p.102-103
 * game-rules/63_advantages_and_disadvantages.md, p.145
 */

import {
  EMPHASIS_XP_COST,
  SKILL_XP_MULTIPLIER,
  TRAIT_XP_MULTIPLIER,
  VOID_XP_MULTIPLIER
} from "../config/game-mechanics.js";
import { getBagEntries } from "./rule-bag.js";
import { getRuleValue } from "./rule-values.js";

/**
 * A Trait as XP prices it; its Family and School bonus raises the price of each rank.
 * game-rules/48_character_creation_expanded.md, p.103
 * @typedef {object} XpTrait
 * @property {string} key
 * @property {number} stored    The stored rank, a rule's bonus not included
 * @property {number} freeBase  Free ranks a legacy Family or School bonus marked as stored (flags.xpFreeTraitBase)
 * @property {number} bonus     Family and School bonus that raises the price of each rank
 * @property {number} discount  Flat change to each step (flags.traitDiscounts)
 */

/**
 * A Skill as XP prices it; the ranks a School gave are free.
 * game-rules/48_character_creation_expanded.md, p.102
 * @typedef {object} XpSkill
 * @property {string} name
 * @property {string} type       high, bugei, merchant, low
 * @property {number} rank
 * @property {number} freeRanks  Ranks a School gave
 * @property {string[]} emphases Trained Emphases
 * @property {number} freeEmphasis
 */

/**
 * @typedef {object} XpItem
 * @property {string} id
 * @property {string} type   advantage, disadvantage, kata, kiho, or spell (memorized)
 * @property {string} name
 * @property {number} cost   XP cost, XP a Disadvantage gives, or a spell's Mastery Level
 */

/**
 * What a character's XP is built from: starting XP is 40, and Disadvantages give at most 10.
 * game-rules/48_character_creation_expanded.md, p.102
 * game-rules/63_advantages_and_disadvantages.md, p.145
 * @typedef {object} XpBuild
 * @property {number} base          Starting XP (40)
 * @property {number} manual        XP the GM awarded
 * @property {number} disadvantageCap  Most XP Disadvantages give (10)
 * @property {XpTrait[]} traits
 * @property {{stored: number, freeBase: number, bonus: number, discount: number}} void  As a Trait (XpTrait)
 * @property {XpSkill[]} skills
 * @property {XpItem[]} items
 */

/**
 * @typedef {object} XpEntry
 * @property {string} type   trait, void, skill, emphasis, advantage, disadvantage, kata, kiho, or spell
 * @property {string} name   The Trait key, Skill name, or item name
 * @property {number} delta  XP spent; negative for XP a Disadvantage gives
 * @property {number} [from] The rank before, for a rank
 * @property {number} [to]   The rank bought
 * @property {string} [emphasis]
 */

/**
 * A price function from Cost rules: each rule matching one of the selectors, or `self` for the item being priced,
 * whose predicate holds, sets a new price from `@cost` in turn (rule order is priority order). A price is never below
 * 0. A rule whose formula fails is skipped and reported.
 * @param {object} spec
 * @param {Record<string, object[]>} spec.costs - The actor's Cost bag (`ruleBag.costs`)
 * @param {Set<string>} spec.options - The actor's roll options
 * @param {object} spec.rollData - The actor's roll data
 * @param {function(string, string): void} [spec.report] - Called with the rule's source and the error
 * @returns {function(string[], number, string|null=): number}  (selectors, base price, item id) => price
 */
export function getCostPricer({ costs, options, rollData, report = () => {} }) {
  const bag = { costs };
  return (selectors, base, itemId = null) => {
    const rules = [
      ...getBagEntries(bag, "costs", { selectors, options }),
      ...getBagEntries(bag, "costs", { selectors: ["self"], options }).filter(
        rule => rule.itemId === itemId
      )
    ];
    let price = base;
    for (const rule of rules) {
      try {
        price = getRuleValue(rule.value, { ...rollData, cost: price });
      } catch (err) {
        report(rule.source, err.message);
      }
    }
    return Math.max(0, price);
  };
}

/**
 * Itemize a character's XP. A Trait rank costs four times the new rank, its Family and School bonus included;
 * the Void Ring six times the new rank, its bonus included too; a Skill rank the new rank, above the ranks a School
 * gave; an Emphasis 2; an Advantage its cost; a kata, kiho, or memorized spell its Mastery Level (`cost` as gathered).
 * Each step is priced by `price` before it is added.
 * game-rules/48_character_creation_expanded.md, p.103
 * @param {XpBuild} build
 * @param {function(string[], number, string|null=): number} [price] - From getCostPricer; none leaves prices alone
 * @returns {XpEntry[]}
 */
export function getXpEntries(build, price = (_selectors, base) => base) {
  const entries = [];

  for (const trait of build.traits) {
    const bonus = trait.freeBase > 0 ? 0 : trait.bonus;
    for (let r = 2 + trait.freeBase + 1; r <= trait.stored; r++) {
      const base = Math.max(0, TRAIT_XP_MULTIPLIER * (r + bonus) + trait.discount);
      entries.push({
        type: "trait",
        name: trait.key,
        from: r - 1,
        to: r,
        delta: price([`trait:${trait.key}`], base)
      });
    }
  }

  // The Void Ring's Family or School bonus raises each rank's price as a Trait's does (#44)
  // game-rules/48_character_creation_expanded.md, p.103
  const voidBonus = build.void.freeBase > 0 ? 0 : build.void.bonus;
  for (let r = 2 + build.void.freeBase + 1; r <= build.void.stored; r++) {
    const base = Math.max(0, VOID_XP_MULTIPLIER * (r + voidBonus) + build.void.discount);
    entries.push({
      type: "void",
      name: "void",
      from: r - 1,
      to: r,
      delta: price(["ring:void"], base)
    });
  }

  for (const skill of build.skills) {
    const selectors = [`skill:${skill.name.toLowerCase().trim()}`, `skill-type:${skill.type}`];
    for (let r = Math.max(0, skill.freeRanks) + 1; r <= skill.rank; r++) {
      entries.push({
        type: "skill",
        name: skill.name,
        from: r - 1,
        to: r,
        delta: price(selectors, Math.max(0, SKILL_XP_MULTIPLIER * r))
      });
    }
    for (const emphasis of skill.emphases.slice(Math.max(0, skill.freeEmphasis))) {
      entries.push({
        type: "emphasis",
        name: skill.name,
        emphasis,
        delta: price(["emphasis"], EMPHASIS_XP_COST)
      });
    }
  }

  for (const item of build.items) {
    if (item.type === "disadvantage") {
      entries.push({ type: item.type, name: item.name, delta: -Math.max(0, item.cost) });
    } else {
      entries.push({
        type: item.type,
        name: item.name,
        delta: price([`item:${item.type}`], Math.max(0, item.cost), item.id)
      });
    }
  }

  return entries;
}

/**
 * Total a character's XP from its entries: earned (base, awards, and Disadvantages up to the cap), spent, and
 * spent by category. The book's sample character, Shiba Gyukaro, earns 40 + 6 from Doubt and Idealistic and spends all 46.
 * game-rules/48_character_creation_expanded.md, p.103-104
 * game-rules/63_advantages_and_disadvantages.md, p.145
 * @param {XpBuild} build
 * @param {XpEntry[]} entries
 * @returns {{total: number, spent: number, available: number, breakdown: object}}
 */
export function getXpTotals(build, entries) {
  const getTypeSum = type => entries.filter(e => e.type === type).reduce((s, e) => s + e.delta, 0);
  const disadvantages = Math.min(build.disadvantageCap, -getTypeSum("disadvantage"));
  const breakdown = {
    base: build.base,
    manual: build.manual,
    disadvantagesGranted: disadvantages,
    traits: getTypeSum("trait"),
    void: getTypeSum("void"),
    skills: getTypeSum("skill") + getTypeSum("emphasis"),
    advantages: getTypeSum("advantage"),
    kata: getTypeSum("kata"),
    kiho: getTypeSum("kiho"),
    spells: getTypeSum("spell")
  };
  const total = build.base + disadvantages + build.manual;
  const spent =
    breakdown.traits +
    breakdown.void +
    breakdown.skills +
    breakdown.advantages +
    breakdown.kata +
    breakdown.kiho +
    breakdown.spells;
  return { total, spent, available: total - spent, breakdown };
}
