/**
 * @module services/dice/check/collect
 * @description Everything that modifies a check, gathered once per roll so nothing is counted twice: the actor's
 * RollModifier, TNModifier, FreeRaise, DiceRule, Substitute, Note, ApplyCondition, RaiseRule, UnskilledAs, and
 * ActionCost rules (tested against the actor's and the target's roll options), the target's OpponentModifier rules,
 * Active Effect values in `system.bonuses`, armor, the target's range-limited Armor TN changes, and Free Raises on
 * items. Stances and conditions reach a check as rules on their effects (module/config/status-effects.js). Each
 * modifier keeps its label so the dialog lists it with a toggle and the card shows it.
 */

import { ARROW_ARMOR_FACTOR, BOW_IN_MELEE_PENALTY } from "../../../config/game-mechanics.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getBagEntries } from "../../../utils/rule-bag.js";
import { getArmorTnPenalty } from "../../../utils/armor-penalties.js";

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
 * Everything getCheckContext gathers for one check.
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
export function buildCheckSelectors({ kind, skill, trait, ring, skillData }) {
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
 * @param {object} [options]
 * @param {Actor|null} [options.target=null]
 * @param {Item|null} [options.weapon=null]
 * @returns {Set<string>}
 */
export function buildCheckOptions(actor, kind, { target = null, weapon = null } = {}) {
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
export function getCheckContext(actor, { kind, skill, trait, ring, target = null, weapon = null }) {
  const spec = { kind, skill, trait, ring, target, weapon };
  const { entriesOf, selectors } = buildRuleQuery(actor, spec);
  return {
    modifiers: getCheckModifiers(actor, spec, { entriesOf, selectors }),
    tnModifiers: getCheckTnModifiers(actor, spec, entriesOf),
    freeRaises:
      kind === "damage" ? 0 : entriesOf("freeRaises").reduce((sum, entry) => sum + entry.value, 0),
    ...getDiceRuleTerms(entriesOf),
    substitutes: entriesOf("substitutes").map(({ label, replace, with: by }) => ({
      label,
      replace,
      with: by
    })),
    notes: entriesOf("notes").map(entry => entry.text),
    applyConditions: entriesOf("applyConditions").map(({ label, condition, level }) => ({
      label,
      condition,
      level
    })),
    ...getDamageSourceTerms(entriesOf),
    ...getRaiseRuleTerms(entriesOf),
    actions: entriesOf("actionCosts").map(entry => ({
      label: entry.label,
      action: entry.action,
      ...(entry.range ? { range: entry.range } : {})
    }))
  };
}

/**
 * How the check reads the actor's rule bag: its selectors (with the Skill item's type and tags) and roll options, and
 * a reader of the bag entries of one kind that match them and the check's weapon.
 * @param {Actor} actor
 * @param {object} spec - getCheckContext's spec
 * @returns {{entriesOf: function(string): object[], selectors: string[]}}
 */
function buildRuleQuery(actor, spec) {
  const { kind, skill, trait, ring, target, weapon } = spec;
  const skillItem = skill
    ? actor.items.find(i => i.type === "skill" && i.name.toLowerCase().trim() === skill)
    : null;
  const selectors = buildCheckSelectors({ kind, skill, trait, ring, skillData: skillItem?.system });
  const options = buildCheckOptions(actor, kind, { target, weapon });
  const entriesOf = bagKind =>
    getBagEntries(actor.ruleBag, bagKind, { selectors, options, weaponId: weapon?.id ?? null });
  return { entriesOf, selectors };
}

/**
 * The check's modifiers: its RollModifier rules; the target's OpponentModifier rules, tested from its side (its
 * options, with the roller as its target); Active Effect values in `system.bonuses`; and a bow's shot in melee range.
 * @param {Actor} actor
 * @param {object} spec - getCheckContext's spec
 * @param {object} query
 * @param {function(string): object[]} query.entriesOf - The actor's bag entries of a kind for this check
 * @param {string[]} query.selectors - The check's selectors
 * @returns {CheckModifier[]}
 */
function getCheckModifiers(actor, spec, { entriesOf, selectors }) {
  const { kind, target, weapon } = spec;
  const modifiers = entriesOf("rollModifiers").map(entry => buildCheckModifier(entry));
  if (target?.ruleBag) {
    const theirs = buildCheckOptions(target, kind, { target: actor });
    for (const entry of getBagEntries(target.ruleBag, "opponentModifiers", {
      selectors,
      options: theirs
    })) {
      modifiers.push(buildCheckModifier(entry, `${entry.label} (${target.name})`));
    }
  }
  modifiers.push(...getEffectBonusModifiers(actor, spec));
  // A bow shot at a target in melee range is -10; the roller judges the range, so it starts unticked
  // game-rules/74_weapons.md, p.199
  if (kind === "attack" && weapon?.system.isBow) {
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
  return modifiers;
}

/**
 * A rule bag entry as a check modifier: an optional rule starts off.
 * @param {object} entry - A rollModifiers or opponentModifiers bag entry
 * @param {string} [label] - The label to show, the entry's own by default
 * @returns {CheckModifier}
 */
function buildCheckModifier(entry, label = entry.label) {
  return {
    label,
    roll: entry.roll,
    keep: entry.keep,
    total: entry.total,
    ...(entry.type ? { type: entry.type } : {}),
    enabled: !entry.optional,
    ...(entry.range ? { range: entry.range } : {}),
    consumes: entry.consumes ?? null
  };
}

/**
 * The Active Effect changes on `system.bonuses` for the check's Skill, Trait, and Ring (ACTIVE_EFFECTS.md, Skill and
 * Ring bonuses), each that changes the pool.
 * @param {Actor} actor
 * @param {object} spec - getCheckContext's spec
 * @returns {CheckModifier[]}
 */
function getEffectBonusModifiers(actor, spec) {
  const named = [
    ["skill", spec.skill],
    ["trait", spec.trait],
    ["ring", spec.ring]
  ];
  return named.flatMap(([category, name]) => {
    const bonus = name ? actor.system.bonuses[category][name] : null;
    if (!bonus || !(toInt(bonus.roll) || toInt(bonus.keep) || toInt(bonus.total))) {
      return [];
    }
    return [
      {
        label: F("l5r4.ui.check.effectsFor", { key: name }),
        roll: toInt(bonus.roll),
        keep: toInt(bonus.keep),
        total: toInt(bonus.total),
        enabled: true
      }
    ];
  });
}

/**
 * The check's TN changes: its TNModifier rules, the target's range-limited Armor TN changes on an attack, the armor
 * penalty, an attack weapon's own TN change, and its arrow's change to the target's armor.
 * @param {Actor} actor
 * @param {object} spec - getCheckContext's spec
 * @param {function(string): object[]} entriesOf - The actor's bag entries of a kind for this check
 * @returns {Array<{label: string, value: number, type?: string, range?: string, fromTarget?: boolean}>}
 */
function getCheckTnModifiers(actor, spec, entriesOf) {
  const { kind, skill, trait, target, weapon } = spec;
  const tnModifiers = entriesOf("tnModifiers").map(entry => ({
    label: entry.label,
    value: entry.value,
    ...(entry.type ? { type: entry.type } : {})
  }));
  if (kind === "attack" && target) {
    tnModifiers.push(...getTargetRangeTnModifiers(target));
  }
  if (kind !== "damage") {
    const armor = getArmorTnPenalty(actor, skill ?? null, trait ?? null);
    if (armor) {
      tnModifiers.push({ label: T("l5r4.ui.check.armor"), value: armor });
    }
  }
  if (kind === "attack" && weapon) {
    tnModifiers.push(...getWeaponTnModifiers(actor, weapon));
  }
  if (kind === "attack" && weapon && target) {
    tnModifiers.push(...getArrowTnModifiers(weapon, target));
  }
  return tnModifiers;
}

/**
 * A bow's arrow against the armor in the target's Armor TN: an Armor Piercing arrow ignores it and a Flesh Cutter
 * doubles it. Listed with the context's changes so the roll dialog shows it before the roll (#105).
 * game-rules/74_weapons.md, p.199
 * @param {Item} weapon
 * @param {Actor} target
 * @returns {Array<{label: string, value: number, fromTarget: boolean}>}
 */
function getArrowTnModifiers(weapon, target) {
  const arrow = weapon.system.isBow ? weapon.system.arrow : null;
  const factor = ARROW_ARMOR_FACTOR[arrow];
  const armor = toInt(target.system.armorTn?.bonus);
  if (factor === undefined || !armor) {
    return [];
  }
  return [
    {
      label: T(`l5r4.ui.combat.arrowArmor.${arrow}`),
      value: (factor - 1) * armor,
      fromTarget: true
    }
  ];
}

/**
 * The target's Armor TN changes that count only against one attack range (Prone against melee).
 * game-rules/41_conditional_effects.md, p.89
 * @param {Actor} target
 * @returns {Array<{label: string, value: number, range: string, fromTarget: boolean}>}
 */
function getTargetRangeTnModifiers(target) {
  return Object.entries(target.system.armorTn?.vs ?? {})
    .filter(([, value]) => value)
    .map(([range, value]) => ({
      label: F("l5r4.ui.check.rangeFor", {
        target: target.name,
        range: T(`l5r4.ui.check.range.${range}`)
      }),
      value,
      range,
      fromTarget: true
    }));
}

/**
 * A weapon's own TN change mounted or on foot, as the dai-kyu's and the han-kyu's.
 * game-rules/74_weapons.md, p.199
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {Array<{label: string, value: number}>}
 */
function getWeaponTnModifiers(actor, weapon) {
  const mounted = actor.statuses.has("mounted");
  const value = mounted ? weapon.system.tnMounted : weapon.system.tnOnFoot;
  if (!value) {
    return [];
  }
  const where = T(`l5r4.equipment.weapons.${mounted ? "tnMounted" : "tnOnFoot"}`);
  return [{ label: F("l5r4.ui.check.weaponTn", { weapon: weapon.name, where }), value }];
}

/**
 * The check's DiceRule terms: the lowest explode threshold, or null for none, and whether 1s are re-rolled.
 * @param {function(string): object[]} entriesOf - The actor's bag entries of a kind for this check
 * @returns {{explode: number|null, rerollOnes: boolean}}
 */
function getDiceRuleTerms(entriesOf) {
  const diceRules = entriesOf("diceRules");
  const thresholds = diceRules.map(rule => rule.explode).filter(value => value !== null);
  return {
    explode: thresholds.length ? Math.min(...thresholds) : null,
    rerollOnes: diceRules.some(rule => rule.rerollOnes)
  };
}

/**
 * The check's DamageSource terms: its damage-source tags and the Reduction the damage ignores.
 * @param {function(string): object[]} entriesOf - The actor's bag entries of a kind for this check
 * @returns {{damageSources: string[], ignoreReduction: number}}
 */
function getDamageSourceTerms(entriesOf) {
  const sources = entriesOf("damageSources");
  return {
    damageSources: [...new Set(sources.flatMap(entry => entry.tags))],
    ignoreReduction: sources.reduce((sum, entry) => sum + entry.ignoreReduction, 0)
  };
}

/**
 * The check's RaiseRule and UnskilledAs terms: the change to the Raise cap, the Raises that must be declared, the
 * change to each maneuver's cost, and the ranks an Unskilled roll counts as, 0 for none.
 * @param {function(string): object[]} entriesOf - The actor's bag entries of a kind for this check
 * @returns {{raises: {cap: number, minimum: number, maneuverCosts: Record<string, number>}, unskilledAs: number}}
 */
function getRaiseRuleTerms(entriesOf) {
  const raiseRules = entriesOf("raiseRules");
  const maneuverCosts = {};
  for (const rule of raiseRules.filter(r => r.maneuver)) {
    maneuverCosts[rule.maneuver] = (maneuverCosts[rule.maneuver] ?? 0) + rule.cost;
  }
  const unskilledAs = entriesOf("unskilledAs").map(entry => entry.rank);
  return {
    raises: {
      cap: raiseRules.reduce((sum, rule) => sum + rule.cap, 0),
      minimum: Math.max(0, ...raiseRules.map(rule => rule.minimum)),
      maneuverCosts
    },
    unskilledAs: unskilledAs.length ? Math.max(...unskilledAs) : 0
  };
}
