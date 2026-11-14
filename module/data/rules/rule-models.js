/**
 * @module data/rules/rule-models
 * @description One DataModel per rule key (module/config/rule-keys.js; roadmap/AUTOMATION.md §3). The
 * `RULE_MODELS` registry maps a key to its class. Values that take a number take a formula too.
 */

import {
  ADJUSTABLE_TRAITS,
  ARMOR_TN_MODES,
  ATTACK_RANGES,
  RULE_KEYS,
  SAVE_EVENTS,
  SAVE_FAILURES
} from "../../config/rule-keys.js";
import { USE_PERIODS } from "../../utils/effects.js";
import RuleData, { selectorField, typeField, valueField } from "./RuleData.js";

const fields = () => foundry.data.fields;

/**
 * An attack range a rule is limited to, or null for every roll.
 * @returns {foundry.data.fields.StringField}
 */
function rangeField() {
  return new (fields().StringField)({
    required: true,
    nullable: true,
    initial: null,
    choices: ATTACK_RANGES
  });
}

/**
 * +XkY or +N on rolls matching `selector`. With `range`, only attacks of that range. An `optional` modifier is
 * offered unticked, for a bonus the roller places on one roll of their choice (Center Stance, p.84); with
 * `consumes`, rolling with it ticked ends the Active Effect that carries it.
 */
export class RollModifierRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { BooleanField } = fields();
    return {
      ...super.defineSchema(),
      selector: selectorField(),
      roll: valueField(0),
      keep: valueField(0),
      total: valueField(0),
      type: typeField(),
      range: rangeField(),
      optional: new BooleanField({ initial: false }),
      consumes: new BooleanField({ initial: false })
    };
  }
}

/** A change to the TN of rolls matching `selector`. */
export class TNModifierRule extends RuleData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      selector: selectorField(),
      value: valueField(0),
      type: typeField()
    };
  }
}

/**
 * A change to Armor TN: added, a replacement base, or a replacement total (module/utils/effects.js,
 * resolveArmorTn). An added change with `range` counts only against attacks of that range.
 */
export class ArmorTNRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { StringField } = fields();
    return {
      ...super.defineSchema(),
      value: valueField(0),
      type: typeField(),
      mode: new StringField({ required: true, initial: "add", choices: ARMOR_TN_MODES }),
      range: rangeField()
    };
  }
}

/**
 * Reduction added to the actor's. `except` lists damage sources it does not reduce, for a creature with less
 * Reduction against jade (p.318).
 */
export class ReductionRule extends RuleData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), value: valueField(0), except: tagsField() };
  }
}

/**
 * Damage sources (pp.319-320): tags such as "jade", "crystal", "obsidian", "spell", "nemuranai" on the damage of
 * rolls matching `selector`, and Reduction those rolls ignore.
 */
export class DamageSourceRule extends RuleData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      selector: new (fields().StringField)({ required: true, blank: false, initial: "damage" }),
      tags: tagsField(),
      ignoreReduction: valueField(0)
    };
  }
}

/**
 * Invulnerability (p.319): damage from a source not in `harmedBy` is one Wound. With `only`, the rule covers
 * damage from those sources alone (partial Invulnerability); a shorter `harmedBy` is Superior Invulnerability.
 */
export class InvulnerabilityRule extends RuleData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      harmedBy: tagsField(["jade", "crystal", "obsidian", "spell", "nemuranai"]),
      only: tagsField()
    };
  }
}

/** Spirit (p.320): damage from a source not in `harmedBy` is halved. */
export class SpiritRule extends RuleData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), harmedBy: tagsField(["jade", "crystal", "obsidian"]) };
  }
}

/**
 * A list of damage-source tags.
 * @param {string[]} [initial=[]]
 * @returns {foundry.data.fields.ArrayField}
 */
function tagsField(initial = []) {
  const { ArrayField, StringField } = fields();
  return new ArrayField(new StringField({ required: true, blank: false }), { initial });
}

/** Wounds added to each Wound Rank, and a change to every Wound Rank's TN penalty. */
export class WoundsRule extends RuleData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), perRank: valueField(0), penalty: valueField(0) };
  }
}

/** Initiative rolled dice, kept dice, and flat bonus. */
export class InitiativeRule extends RuleData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      roll: valueField(0),
      keep: valueField(0),
      total: valueField(0)
    };
  }
}

/** Free Raises on rolls matching `selector`. */
export class FreeRaiseRule extends RuleData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), selector: selectorField(), value: valueField(1) };
  }
}

/** Dice handling on rolls matching `selector`: the explode threshold, and re-rolling 1s. */
export class DiceRuleRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { BooleanField, NumberField } = fields();
    return {
      ...super.defineSchema(),
      selector: selectorField(),
      // null leaves the threshold alone; dice explode on this face or higher.
      explode: new NumberField({
        required: true,
        nullable: true,
        initial: null,
        integer: true,
        min: 2,
        max: 10
      }),
      rerollOnes: new BooleanField({ initial: false })
    };
  }
}

/** Use `with` instead of `replace` on rolls matching `selector`, as in "trait:agi" for "trait:ref". */
export class SubstituteRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { StringField } = fields();
    return {
      ...super.defineSchema(),
      selector: selectorField(),
      replace: new StringField({ required: true, blank: false }),
      with: new StringField({ required: true, blank: false })
    };
  }
}

/** A Trait or the Void Ring raised or lowered, with everything derived from it. */
export class TraitAdjustRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { StringField } = fields();
    return {
      ...super.defineSchema(),
      trait: new StringField({ required: true, blank: false, choices: ADJUSTABLE_TRAITS }),
      value: valueField(0)
    };
  }
}

/** Text shown with rolls matching `selector`. */
export class NoteRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { StringField } = fields();
    return {
      ...super.defineSchema(),
      selector: selectorField(),
      text: new StringField({ required: true, blank: false })
    };
  }
}

/**
 * A roll option other rules' predicates test. With `toggleable`, the player turns it on and off through `value`
 * (positional rules stay manual this way: roadmap/STAGE-07-RULE-ENGINE.md decision 2).
 */
export class RollOptionRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { BooleanField, StringField } = fields();
    return {
      ...super.defineSchema(),
      option: new StringField({ required: true, blank: false }),
      toggleable: new BooleanField({ initial: false }),
      value: new BooleanField({ initial: false })
    };
  }
}

/** Ranks added to the Water Ring for movement only, as Blinded's -2 (p.89). */
export class MovementRule extends RuleData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), water: valueField(0) };
  }
}

/**
 * A condition this item or effect lets its owner put on the target of a successful roll matching `selector`, such as
 * Dazed on a hit. The roll's card offers it; nothing applies until someone clicks (AUTOMATION.md §4).
 */
export class ApplyConditionRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { NumberField, StringField } = fields();
    return {
      ...super.defineSchema(),
      selector: selectorField(),
      condition: new StringField({ required: true, blank: false }),
      // The condition's level, as a Fear Rank; null for a condition without one
      level: new NumberField({
        required: true,
        nullable: true,
        initial: null,
        integer: true,
        min: 1
      })
    };
  }
}

/** The owner cannot gain the status `condition`. */
export class ConditionImmunityRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { StringField } = fields();
    return {
      ...super.defineSchema(),
      condition: new StringField({ required: true, blank: false })
    };
  }
}

/**
 * A roll that ends the Active Effect carrying it: rolled on `event` by the affected actor's owner against `tn`
 * (Dazed and Stunned in the Reactions stage, p.89). After a failure the TN moves by `step`, never past `min`;
 * `onFailure` says what else a failure does.
 */
export class PeriodicSaveRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { NumberField, StringField } = fields();
    return {
      ...super.defineSchema(),
      event: new StringField({ required: true, initial: "roundEnd", choices: SAVE_EVENTS }),
      // "ring:earth" or "trait:wil"
      roll: new StringField({
        required: true,
        blank: false,
        validate: value => /^(ring:(air|earth|fire|water|void)|trait:[a-z]{3})$/.test(value),
        validationError: 'must be "ring:<ring>" or "trait:<trait>"'
      }),
      tn: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 20 }),
      step: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      min: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 5 }),
      onFailure: new StringField({ required: true, initial: "retry", choices: SAVE_FAILURES })
    };
  }
}

/**
 * Uses of a limited resource per period: adds `max` uses of `slug` each `per`. The slug "void" raises the
 * once-per-Round Void Point limit (p.78; STAGE-09 decision 6).
 */
export class ResourceRule extends RuleData {
  /** @override */
  static defineSchema() {
    const { StringField } = fields();
    return {
      ...super.defineSchema(),
      slug: new StringField({ required: true, blank: false }),
      max: valueField(1),
      per: new StringField({ required: true, initial: "round", choices: USE_PERIODS })
    };
  }
}

/**
 * Rule key to DataModel class.
 * @type {Readonly<Record<string, typeof RuleData>>}
 */
export const RULE_MODELS = Object.freeze({
  RollModifier: RollModifierRule,
  TNModifier: TNModifierRule,
  ArmorTN: ArmorTNRule,
  Reduction: ReductionRule,
  Wounds: WoundsRule,
  Initiative: InitiativeRule,
  FreeRaise: FreeRaiseRule,
  DiceRule: DiceRuleRule,
  Substitute: SubstituteRule,
  TraitAdjust: TraitAdjustRule,
  Note: NoteRule,
  RollOption: RollOptionRule,
  Movement: MovementRule,
  ApplyCondition: ApplyConditionRule,
  ConditionImmunity: ConditionImmunityRule,
  PeriodicSave: PeriodicSaveRule,
  Resource: ResourceRule,
  DamageSource: DamageSourceRule,
  Invulnerability: InvulnerabilityRule,
  Spirit: SpiritRule
});

if (RULE_KEYS.some(key => !RULE_MODELS[key])) {
  throw new Error("Every key in config/rule-keys.js needs a model in data/rules/rule-models.js");
}

/**
 * Validate one stored rule.
 * @param {object} source  An entry of `system.rules`.
 * @returns {RuleData}
 * @throws {Error} When the key is unknown or a field fails validation.
 */
export function createRule(source) {
  const Model = RULE_MODELS[source?.key];
  if (!Model) {
    throw new Error(`Unknown rule key "${source?.key}"`);
  }
  return new Model(source, { strict: true });
}
