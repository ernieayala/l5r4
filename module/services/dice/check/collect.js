/**
 * @module services/dice/check/collect
 * @description Everything that modifies a check, gathered once per roll so nothing is counted twice: the actor's
 * RollModifier, TNModifier, FreeRaise, DiceRule, Substitute, Note, ApplyCondition, RaiseRule, UnskilledAs, and
 * ActionCost rules (tested against the actor's and the target's roll options), the target's OpponentModifier rules,
 * Active Effect values in `system.bonuses`, armor, the target's range-limited Armor TN changes, and Free Raises on
 * items. Stances and conditions reach a check as rules on their effects (module/config/status-effects.js). Each
 * modifier keeps its label so the dialog lists it with a toggle and the card shows it.
 */

import { BOW_IN_MELEE_PENALTY } from "../../../config/game-mechanics.js";
import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { bagEntries } from "../../../utils/rule-engine.js";
import { getArmorTNPenalty } from "../../../utils/armor-penalties.js";

/**
 * @typedef {object} CheckModifier
 * @property {string} label
 * @property {number} roll
 * @property {number} keep
 * @property {number} total
 * @property {boolean} enabled          On unless the roller turns it off; an optional rule starts off
 * @property {"melee"|"ranged"} [range] Applies only to attacks of that range
 * @property {string|null} [consumes]   UUID of the effect that ends when the modifier is used
 */

/**
 * Everything collectCheck gathers for one check.
 * game-rules/99_creatures.md, p.319-320
 * @typedef {object} CheckContext
 * @property {CheckModifier[]} modifiers
 * @property {Array<{label: string, value: number, range?: string, fromTarget?: boolean}>} tnModifiers  A change
 *   with `fromTarget` is part of the target's Armor TN against this attack (Prone against melee)
 * @property {number} freeRaises
 * @property {number|null} explode      Lowest explode threshold a DiceRule sets, or null for none
 * @property {boolean} rerollOnes       A DiceRule re-rolls 1s
 * @property {Array<{label: string, replace: string, with: string}>} substitutes
 * @property {string[]} notes
 * @property {Array<{label: string, condition: string, level: number|null}>} applyConditions  Offered on success
 * @property {string[]} damageSources    Damage-source tags from DamageSource rules
 * @property {number} ignoreReduction    Reduction the damage ignores
 * @property {{cap: number, minimum: number, maneuverCosts: Record<string, number>}} raises  RaiseRule rules: the
 *   change to the Raise cap, the Raises that must be declared, and the change to each maneuver's cost
 * @property {number} unskilledAs        Ranks an Unskilled roll counts as (UnskilledAs), 0 for none
 * @property {Array<{label: string, action: string, range?: string}>} actions  ActionCost rules, shown on the card;
 *   one with a range only on an attack of that range
 */

/**
 * The selectors a check reads rules for: "any" (every roll), its kind, and what it rolls. A Skill's item adds its type
 * (`skill-type:<type>`) and tags (`skill-tag:social`, `skill-tag:school`; roadmap/STAGE-11 decision 9).
 * @param {object} spec
 * @param {string} spec.kind - skill, trait, ring, spell, maho, attack, damage, or roll
 * @param {string} [spec.skill] - Skill name in lower case
 * @param {string} [spec.trait] - Trait key
 * @param {string} [spec.ring] - Ring key
 * @param {{type: string, social: boolean, school: boolean}} [spec.skillData] - The Skill item's data
 * @returns {string[]}
 */
export function checkSelectors({ kind, skill, trait, ring, skillData }) {
  const selectors = ["any", kind];
  if (kind === "maho") {
    selectors.push("spell");
  }
  if (skill) {
    selectors.push(`skill:${skill}`);
  }
  if (skillData) {
    selectors.push(`skill-type:${skillData.type}`);
    if (skillData.social) {
      selectors.push("skill-tag:social");
    }
    if (skillData.school) {
      selectors.push("skill-tag:school");
    }
  }
  if (trait) {
    selectors.push(`trait:${trait}`);
  }
  if (ring) {
    selectors.push(`ring:${ring}`);
  }
  return selectors;
}

/**
 * The roll options a check's predicates test: the actor's, `check:<kind>`; with a weapon `weapon:size:<size>`
 * (Prone forbids large weapons), `weapon:skill:<skill>`, `weapon:name:<name>`, and `weapon:keyword:<keyword>` for
 * each of its comma-separated keywords, in lower case, so a Weapon Skill's Mastery Abilities reach the damage of its
 * own weapons and a Technique its Samurai weapons; and with a target, `target` plus the target's options prefixed
 * `target:`.
 * game-rules/41_conditional_effects.md, p.89
 * game-rules/50_crab_schools.md, p.106
 * game-rules/60_bugei_skills.md, p.140-143
 * @param {Actor} actor
 * @param {string} kind
 * @param {Actor|null} target
 * @param {Item|null} [weapon=null]
 * @returns {Set<string>}
 */
export function checkOptions(actor, kind, target, weapon = null) {
  const options = new Set(actor.rollOptions);
  options.add(`check:${kind}`);
  if (weapon) {
    options.add(`weapon:size:${weapon.system.size}`);
    options.add(`weapon:name:${weapon.name.toLowerCase().trim()}`);
    for (const keyword of String(weapon.system.keywords ?? "").split(",")) {
      if (keyword.trim()) {
        options.add(`weapon:keyword:${keyword.toLowerCase().trim()}`);
      }
    }
    if (weapon.system.associatedSkill) {
      options.add(`weapon:skill:${weapon.system.associatedSkill.toLowerCase().trim()}`);
    }
  }
  if (target) {
    options.add("target");
    for (const option of target.rollOptions) {
      options.add(`target:${option}`);
    }
  }
  return options;
}

/**
 * Gather the modifiers, TN changes, Free Raises, dice rules, substitutions, and notes for a check.
 *
 * @param {Actor} actor
 * @param {object} spec
 * @param {string} spec.kind
 * @param {string} [spec.skill]
 * @param {string} [spec.trait]
 * @param {string} [spec.ring]
 * @param {Actor|null} [spec.target]
 * @param {Item|null} [spec.weapon] - The weapon of an attack or damage roll: its own rules apply
 * @returns {CheckContext}
 */
export function collectCheck(actor, { kind, skill, trait, ring, target = null, weapon = null }) {
  const skillItem = skill
    ? actor.items.find(i => i.type === "skill" && i.name.toLowerCase().trim() === skill)
    : null;
  const selectors = checkSelectors({ kind, skill, trait, ring, skillData: skillItem?.system });
  const options = checkOptions(actor, kind, target, weapon);
  const entries = bagKind =>
    bagEntries(actor.ruleBag, bagKind, selectors, options, weapon?.id ?? null);

  const asModifier = (entry, label = entry.label) => ({
    label,
    roll: entry.roll,
    keep: entry.keep,
    total: entry.total,
    ...(entry.type ? { type: entry.type } : {}),
    enabled: !entry.optional,
    ...(entry.range ? { range: entry.range } : {}),
    consumes: entry.consumes ?? null
  });
  const modifiers = entries("rollModifiers").map(entry => asModifier(entry));
  // The target's OpponentModifier rules, tested from its side: its options, with the roller as its target
  if (target?.ruleBag) {
    const theirs = checkOptions(target, kind, actor);
    for (const entry of bagEntries(target.ruleBag, "opponentModifiers", selectors, theirs)) {
      modifiers.push(asModifier(entry, `${entry.label} (${target.name})`));
    }
  }

  // Active Effect changes on system.bonuses (ACTIVE_EFFECTS.md, Skill and Ring bonuses)
  for (const [category, name] of [
    ["skill", skill],
    ["trait", trait],
    ["ring", ring]
  ]) {
    const bonus = name ? actor.system.bonuses[category][name] : null;
    if (bonus && (toInt(bonus.roll) || toInt(bonus.keep) || toInt(bonus.total))) {
      modifiers.push({
        label: `${T("l5r4.ui.check.effects")} (${name})`,
        roll: toInt(bonus.roll),
        keep: toInt(bonus.keep),
        total: toInt(bonus.total),
        enabled: true
      });
    }
  }

  const tnModifiers = entries("tnModifiers").map(entry => ({
    label: entry.label,
    value: entry.value,
    ...(entry.type ? { type: entry.type } : {})
  }));
  // The target's Armor TN changes that count only against one attack range (Prone against melee)
  // game-rules/41_conditional_effects.md, p.89
  if (kind === "attack" && target) {
    for (const [range, value] of Object.entries(target.system.armorTn?.vs ?? {})) {
      if (value) {
        tnModifiers.push({
          label: `${target.name} (${T(`l5r4.ui.check.range.${range}`)})`,
          value,
          range,
          fromTarget: true
        });
      }
    }
  }
  if (kind !== "damage") {
    const armor = getArmorTNPenalty(actor, skill ?? null, trait ?? null);
    if (armor) {
      tnModifiers.push({ label: T("l5r4.ui.check.armor"), value: armor });
    }
  }
  if (kind === "attack" && weapon) {
    // A weapon's own TN change mounted or on foot, as the dai-kyu's and the han-kyu's
    // game-rules/74_weapons.md, p.199
    const mounted = actor.statuses.has("mounted");
    const value = mounted ? weapon.system.tnMounted : weapon.system.tnOnFoot;
    if (value) {
      tnModifiers.push({
        label: `${weapon.name} (${T(`l5r4.equipment.weapons.${mounted ? "tnMounted" : "tnOnFoot"}`)})`,
        value
      });
    }
    // A bow shot at a target in melee range is -10; the roller judges the range, so it starts unticked
    // game-rules/74_weapons.md, p.199
    if (weapon.system.isBow) {
      modifiers.push({
        label: T("l5r4.equipment.weapons.meleeRange"),
        roll: 0,
        keep: 0,
        total: BOW_IN_MELEE_PENALTY,
        enabled: false,
        range: "ranged",
        consumes: null
      });
    }
  }

  const freeRaises =
    kind === "damage" ? 0 : entries("freeRaises").reduce((sum, entry) => sum + entry.value, 0);

  const diceRules = entries("diceRules");
  const thresholds = diceRules.map(rule => rule.explode).filter(value => value !== null);

  const raiseRules = entries("raiseRules");
  const maneuverCosts = {};
  for (const rule of raiseRules.filter(r => r.maneuver)) {
    maneuverCosts[rule.maneuver] = (maneuverCosts[rule.maneuver] ?? 0) + rule.cost;
  }
  const unskilledAs = entries("unskilledAs").map(entry => entry.rank);

  return {
    modifiers,
    tnModifiers,
    freeRaises,
    explode: thresholds.length ? Math.min(...thresholds) : null,
    rerollOnes: diceRules.some(rule => rule.rerollOnes),
    substitutes: entries("substitutes").map(entry => ({
      label: entry.label,
      replace: entry.replace,
      with: entry.with
    })),
    notes: entries("notes").map(entry => entry.text),
    applyConditions: entries("applyConditions").map(entry => ({
      label: entry.label,
      condition: entry.condition,
      level: entry.level
    })),
    damageSources: [...new Set(entries("damageSources").flatMap(entry => entry.tags))],
    ignoreReduction: entries("damageSources").reduce(
      (sum, entry) => sum + entry.ignoreReduction,
      0
    ),
    raises: {
      cap: raiseRules.reduce((sum, rule) => sum + rule.cap, 0),
      minimum: Math.max(0, ...raiseRules.map(rule => rule.minimum)),
      maneuverCosts
    },
    unskilledAs: unskilledAs.length ? Math.max(...unskilledAs) : 0,
    actions: entries("actionCosts").map(entry => ({
      label: entry.label,
      action: entry.action,
      ...(entry.range ? { range: entry.range } : {})
    }))
  };
}
