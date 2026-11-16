/**
 * @module documents/actor/rules
 * @description The rule engine's actor side (roadmap/STAGE-07-RULE-ENGINE.md, AUTOMATION.md §1). It collects
 * `system.rules` from the actor's items and applied Active Effects, then runs them at fixed points of preparation:
 *
 * 1. `applyInitialRules`, right after core applies "initial"-phase effects: roll options from statuses and worn
 *    armor; TraitAdjust, so Rings and derived values see it as they see a Trait effect.
 * 2. `applyDerivedRules`, once Traits and Rings are known: Ring and Trait roll options, RollOption rules, the
 *    Initiative and Wounds outputs, and the modifier bag the roll pipeline reads by selector.
 * 3. `applyArmorRules`, once the Armor TN's base and armor are known: ArmorTN and Reduction.
 * 4. `prepareWoundRollOption`, once the Wound Rank is known.
 *
 * Roll options: `status:<id>` for every active status (stances included), `armor:worn`, `ring:<ring>:<value>`,
 * `trait:<trait>:<value>`, `wound:<rank>`, `skill:<skill>:<rank>`, `clan:<name>`, `family:<name>`, `school:<name>`,
 * `item:<type>:<name>` for owned Advantages, Disadvantages, Techniques, kata, kiho, tattoos, and spells,
 * `honor-rank:<n>`, `glory-rank:<n>`, `status-rank:<n>`, `taint-rank:<n>`, `insight:<n>`, `school-rank:<n>`, plus
 * RollOption rules.
 */

import { SYS_ID } from "../../config/constants.js";
import {
  applyRollOptionRules,
  getDerivedRuleOutputs,
  getSelectorBonus,
  getTraitAdjustments
} from "../../utils/rule-engine.js";
import { getArmorTn } from "../../utils/effects.js";
import { applyChoices, hasOpenChoice } from "../../utils/choices.js";
import { getHighestRing, getTaintEffects, getMaxVoidPoints } from "../../utils/taint.js";
import { getHighestSchoolRank } from "../../utils/mechanics.js";
import { getStackedModifiers } from "../../utils/modifier-stacking.js";
import { toInt } from "../../utils/type-coercion.js";
import { createRule } from "../../data/rules/rule-models.js";

/** Rule problems already reported, so a bad rule warns once, not on every preparation. */
const reported = new Set();

/** Item types an `item:<type>:<name>` roll option names, for prerequisites such as owning an Advantage. */
const optionItemTypes = new Set([
  "advantage",
  "disadvantage",
  "technique",
  "kata",
  "kiho",
  "tattoo",
  "spell"
]);

/**
 * Every valid rule that applies to the actor, sorted by priority. Rules come from items whose rules are active
 * (worn armor, every other item) and from applied effects, which core already filters for disabled and suppressed
 * ones and for item effects that do not transfer.
 * @param {Actor} actor
 * @returns {import("../../utils/rule-engine.js").RuleEntry[]}
 */
export function rulesOf(actor) {
  const sources = [];
  for (const item of actor.items) {
    if (item.system.rulesActive) {
      // A weapon's roll rules apply to rolls made with it (module/utils/rule-engine.js, getBagEntries)
      const extra = item.type === "weapon" ? { weaponId: item.id } : {};
      sources.push(
        ...applyChoices(item.system.ownedRules)
          // A rule naming a choice not yet made waits for it (an item granted or imported skips the question)
          .filter(rule => rule?.key === "ChoiceSet" || !hasOpenChoice(JSON.stringify(rule)))
          .map(rule => ({
            rule,
            source: item.name,
            itemId: item.id,
            ...extra
          }))
      );
    }
  }
  for (const effect of actor.appliedEffects) {
    const extra = { effectUuid: effect.uuid };
    if (effect.system.level !== null) {
      extra.level = effect.system.level;
    }
    sources.push(...effect.system.rules.map(rule => ({ rule, source: effect.name, ...extra })));
  }
  // Taint Level 3 and 4 penalize social Skill rolls (STAGE-11 decision 5)
  // game-rules/89_shadowlands_taint.md, p.278
  const { socialPenalty } = getTaintEffects(toInt(actor.system.shadowTaint.rank));
  if (socialPenalty) {
    const source = game.i18n.localize("l5r4.ui.taint.label");
    sources.push({
      rule: { key: "RollModifier", selector: "skill-tag:social", roll: -socialPenalty },
      source
    });
  }

  const entries = [];
  for (const { rule, ...from } of sources) {
    // system.rules is user-authored JSON: a trust boundary, so each entry is validated.
    try {
      entries.push({ rule: createRule(rule), ...from });
    } catch (err) {
      onRuleProblem(actor, from.source, err.message);
    }
  }
  // Array#sort is stable, so equal priorities keep their collection order.
  return entries.sort((a, b) => a.rule.priority - b.rule.priority);
}

/**
 * Collect the rules, seed the status, armor, owned-item, and rank roll options, and apply TraitAdjust. Runs at the
 * end of the "initial" Active Effect phase.
 * @param {Actor} actor
 */
export function applyInitialRules(actor) {
  actor.rules = rulesOf(actor);
  actor.rollOptions = new Set([...actor.statuses].map(status => `status:${status}`));
  if (actor.items.some(item => item.type === "armor" && item.system.equipped)) {
    actor.rollOptions.add("armor:worn");
  }
  prepareItemRollOptions(actor, actor.rollOptions);
  for (const track of ["honor", "glory", "status"]) {
    if (actor.system[track]) {
      actor.rollOptions.add(`${track}-rank:${toInt(actor.system[track].rank)}`);
    }
  }
  actor.rollOptions.add(`taint-rank:${toInt(actor.system.shadowTaint.rank)}`);

  const { adjustments, errors } = getTraitAdjustments(
    actor.rules,
    actor.getRollData(),
    actor.rollOptions
  );
  for (const { source, message } of errors) {
    onRuleProblem(actor, source, message);
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
 * Run the rules that need Traits and Rings: add their roll options, write the Initiative and Wounds outputs onto the
 * prepared data, and fill `actor.ruleBag`. ArmorTN and Reduction wait for `applyArmorRules`.
 * @param {Actor} actor
 * @param {object} sys - The actor's prepared system data, after prepareTraitsAndRings.
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
  if (sys.insight) {
    options.add(`insight:${toInt(sys.insight.rank)}`);
    if (actor.items.some(item => item.type === "school")) {
      options.add(`school-rank:${getHighestSchoolRank(actor)}`);
    }
  }
  applyRollOptionRules(actor.rules, options);

  const out = getDerivedRuleOutputs(actor.rules, actor.getRollData(), options);
  for (const { source, message } of out.errors) {
    onRuleProblem(actor, source, message);
  }

  sys.initiative.rollMod += out.initiative.roll;
  sys.initiative.keepMod += out.initiative.keep;
  sys.initiative.totalMod += out.initiative.total;
  sys.woundsMod += out.woundsPerRank;
  sys.woundsPenaltyMod += out.woundPenalty;
  sys.armorTn.ruleReduction = out.reduction;
  sys.movementWater = out.movementWater;
  actor.armorRules = out.armor;
  actor.reductionParts = out.reductionParts;
  actor.damageDefenses = out.defenses;
  actor.conditionImmunities = out.immunities;
  actor.periodicSaves = out.saves;
  actor.resources = out.resources;
  actor.ledgerRules = out.ledger;
  actor.ruleBag = out.bag;
  // Penalties on every roll reach the Initiative roll too: Fear is on all die rolls, Dazed on all actions.
  // RollModifier rules on "any" or "initiative" join the pool; optional and range-limited ones do not.
  // game-rules/42_fear.md, p.90
  // game-rules/41_conditional_effects.md, p.89
  const initiativeOptions = new Set([...options, "check:initiative"]);
  const onInitiative = getSelectorBonus(out.bag, ["any", "initiative"], initiativeOptions);
  sys.initiative.rollMod += onInitiative.roll;
  sys.initiative.keepMod += onInitiative.keep;
  sys.initiative.totalMod += onInitiative.total;
  // Taint Level 4 costs a Void Point from the maximum, not from the Void Ring; the Lost have none
  // game-rules/89_shadowlands_taint.md, p.278-279
  sys.rings.void.max = getMaxVoidPoints(
    toInt(sys.rings.void.rank),
    toInt(sys.shadowTaint.rank),
    getHighestRing(sys.rings)
  );
}

/**
 * Compute the Armor TN from its base, armor, and manual modifier with the ArmorTN rules (module/utils/effects.js,
 * getArmorTn), and add Reduction rules. Sets `armorTn.current` and `armorTn.vs`, the range-limited changes an
 * attacker's roll reads, such as Prone's.
 * game-rules/41_conditional_effects.md, p.89
 * @param {Actor} actor
 * @param {object} sys
 * @param {{base: number, armor: number, other: number}} parts
 */
export function applyArmorRules(actor, sys, { base, armor, other }) {
  const { current, vs } = getArmorTn({
    base,
    armor,
    other,
    rules: actor.armorRules,
    stack: getStackedModifiers
  });
  sys.armorTn.current = current;
  sys.armorTn.vs = vs;
  sys.armorTn.reduction = Math.max(0, sys.armorTn.reduction + sys.armorTn.ruleReduction);
}

/**
 * Add the `wound:<rank>` roll option for the current Wound Rank.
 * @param {Actor} actor
 * @param {object} sys
 * @param {object} current - The current entry of `sys.woundLevels`.
 */
export function prepareWoundRollOption(actor, sys, current) {
  const rank = Object.keys(sys.woundLevels).find(key => sys.woundLevels[key] === current);
  actor.rollOptions.add(`wound:${rank}`);
}

/**
 * Warn once about a rule that failed validation or whose value did not resolve.
 * @param {Actor} actor
 * @param {string} source
 * @param {string} message
 */
function onRuleProblem(actor, source, message) {
  const id = `${actor.uuid}|${source}|${message}`;
  if (reported.has(id)) {
    return;
  }
  reported.add(id);
  console.warn(`${SYS_ID} | Rule on "${source}" (${actor.name}) skipped: ${message}`);
}

/**
 * The roll options of what the actor owns: `skill:<skill>:<rank>`, `clan:<name>`, `family:<name>`, `school:<name>`,
 * and `item:<type>:<name>`. Names are in lower case, as roll selectors are.
 * @param {Actor} actor
 * @param {Set<string>} options - Extended in place.
 */
function prepareItemRollOptions(actor, options) {
  for (const item of actor.items) {
    const name = item.name.toLowerCase().trim();
    if (item.type === "skill") {
      options.add(`skill:${name}:${toInt(item.system.rank)}`);
    } else if (["clan", "family", "school"].includes(item.type)) {
      options.add(`${item.type}:${name}`);
    } else if (optionItemTypes.has(item.type)) {
      options.add(`item:${item.type}:${name}`);
    }
  }
}
