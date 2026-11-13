/**
 * @module documents/actor/rules
 * @description The rule engine's actor side (roadmap/STAGE-07-RULE-ENGINE.md, AUTOMATION.md §1). It collects
 * `system.rules` from the actor's items and applied Active Effects, then runs them at fixed points of preparation:
 *
 * 1. `applyInitialRules`, right after core applies "initial"-phase effects: roll options from statuses and worn
 *    armor; TraitAdjust, so Rings and derived values see it as they see a Trait effect.
 * 2. `applyDerivedRules`, once Traits and Rings are known: Ring and Trait roll options, RollOption rules, the
 *    Initiative, Wounds, and RollModifier outputs, and the modifier bag rolls read by selector.
 * 3. `applyArmorRules`, once Armor TN and Reduction are computed: ArmorTN and Reduction.
 * 4. `addWoundRollOption`, once the Wound Rank is known.
 *
 * Roll options: `status:<id>` for every active status (stances included), `armor:worn`, `ring:<ring>:<value>`,
 * `trait:<trait>:<value>`, `wound:<rank>`, plus RollOption rules.
 */

import { createRule } from "../../data/rules/rule-models.js";
import {
  addRuleRollOptions,
  derivedRuleOutputs,
  traitAdjustments
} from "../../utils/rule-engine.js";
import { toInt } from "../../utils/type-coercion.js";
import { SYS_ID } from "../../config/constants.js";

/** Rule problems already reported, so a bad rule warns once, not on every preparation. */
const reported = new Set();

/**
 * Warn once about a rule that failed validation or whose value did not resolve.
 * @param {Actor} actor
 * @param {string} source
 * @param {string} message
 */
function reportRuleProblem(actor, source, message) {
  const id = `${actor.uuid}|${source}|${message}`;
  if (reported.has(id)) {
    return;
  }
  reported.add(id);
  console.warn(`${SYS_ID} | Rule on "${source}" (${actor.name}) skipped: ${message}`);
}

/**
 * Every valid rule that applies to the actor, sorted by priority. Rules come from items whose rules are active
 * (worn armor, every other item) and from applied effects, which core already filters for disabled and suppressed
 * ones and for item effects that do not transfer.
 * @param {Actor} actor
 * @returns {import("../../utils/rule-engine.js").RuleEntry[]}
 */
export function collectRules(actor) {
  const sources = [];
  for (const item of actor.items) {
    if (item.system.rulesActive) {
      sources.push(...item.system.ownedRules.map(rule => ({ rule, source: item.name })));
    }
  }
  for (const effect of actor.appliedEffects) {
    sources.push(...effect.system.rules.map(rule => ({ rule, source: effect.name })));
  }

  const entries = [];
  for (const { rule, source } of sources) {
    // system.rules is user-authored JSON: a trust boundary, so each entry is validated.
    try {
      entries.push({ rule: createRule(rule), source });
    } catch (err) {
      reportRuleProblem(actor, source, err.message);
    }
  }
  // Array#sort is stable, so equal priorities keep their collection order.
  return entries.sort((a, b) => a.rule.priority - b.rule.priority);
}

/**
 * Collect the rules, seed the status and armor roll options, and apply TraitAdjust. Runs at the end of the
 * "initial" Active Effect phase.
 * @param {Actor} actor
 */
export function applyInitialRules(actor) {
  actor.rules = collectRules(actor);
  actor.rollOptions = new Set([...actor.statuses].map(status => `status:${status}`));
  if (actor.items.some(item => item.type === "armor" && item.system.equipped)) {
    actor.rollOptions.add("armor:worn");
  }

  const { adjustments, errors } = traitAdjustments(
    actor.rules,
    actor.getRollData(),
    actor.rollOptions
  );
  for (const { source, message } of errors) {
    reportRuleProblem(actor, source, message);
  }
  const sys = actor.system;
  for (const [trait, delta] of Object.entries(adjustments)) {
    if (trait === "void") {
      sys.rings.void.rank += delta;
    } else {
      sys.traits[trait] += delta;
    }
  }
}

/**
 * Run the rules that need Traits and Rings: add their roll options and write Initiative, Wounds, and RollModifier
 * outputs onto the prepared data, and fill `actor.ruleBag`. ArmorTN and Reduction wait for `applyArmorRules`.
 * @param {Actor} actor
 * @param {object} sys  The actor's prepared system data, after prepareTraitsAndRings.
 */
export function applyDerivedRules(actor, sys) {
  const options = actor.rollOptions;
  for (const ring of ["air", "earth", "fire", "water"]) {
    options.add(`ring:${ring}:${toInt(sys.rings[ring])}`);
  }
  options.add(`ring:void:${toInt(sys.rings.void.rank)}`);
  for (const [trait, value] of Object.entries(sys._derived.traitsEff)) {
    options.add(`trait:${trait}:${toInt(value)}`);
  }
  addRuleRollOptions(actor.rules, options);

  const out = derivedRuleOutputs(actor.rules, actor.getRollData(), options);
  for (const { source, message } of out.errors) {
    reportRuleProblem(actor, source, message);
  }

  sys.initiative.rollMod += out.initiative.roll;
  sys.initiative.keepMod += out.initiative.keep;
  sys.initiative.totalMod += out.initiative.total;
  sys.woundsMod += out.woundsPerRank;
  sys.woundsPenaltyMod += out.woundPenalty;
  sys.armorTn.ruleMod = out.armorTn;
  sys.armorTn.ruleReduction = out.reduction;

  for (const [category, byName] of Object.entries(out.bonuses)) {
    for (const [name, bonus] of Object.entries(byName)) {
      const current = sys.bonuses[category][name] ?? {};
      sys.bonuses[category][name] = {
        roll: toInt(current.roll) + bonus.roll,
        keep: toInt(current.keep) + bonus.keep,
        total: toInt(current.total) + bonus.total
      };
    }
  }
  actor.ruleBag = out.bag;
}

/**
 * Add ArmorTN and Reduction rule outputs to the computed Armor TN and Reduction. Runs with the stance step, so
 * condition overrides keep it as they keep the stance modifier.
 * @param {object} sys
 */
export function applyArmorRules(sys) {
  sys.armorTn.current += sys.armorTn.ruleMod;
  sys.armorTn.reduction = Math.max(0, sys.armorTn.reduction + sys.armorTn.ruleReduction);
}

/**
 * Add the `wound:<rank>` roll option for the current Wound Rank.
 * @param {Actor} actor
 * @param {object} sys
 * @param {object} current  The current entry of `sys.woundLevels`.
 */
export function addWoundRollOption(actor, sys, current) {
  const rank = Object.keys(sys.woundLevels).find(key => sys.woundLevels[key] === current);
  actor.rollOptions.add(`wound:${rank}`);
}
