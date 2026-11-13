/**
 * @module data/rules/rule-models
 * @description One DataModel per rule key (module/config/rule-keys.js; roadmap/AUTOMATION.md §3). The
 * `RULE_MODELS` registry maps a key to its class. Values that take a number take a formula too.
 */

import { ADJUSTABLE_TRAITS, RULE_KEYS } from "../../config/rule-keys.js";
import RuleData, { selectorField, typeField, valueField } from "./RuleData.js";

const fields = () => foundry.data.fields;

/** +XkY or +N on rolls matching `selector`. */
export class RollModifierRule extends RuleData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      selector: selectorField(),
      roll: valueField(0),
      keep: valueField(0),
      total: valueField(0),
      type: typeField()
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

/** A change to Armor TN. */
export class ArmorTNRule extends RuleData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), value: valueField(0), type: typeField() };
  }
}

/** Reduction added to the actor's. */
export class ReductionRule extends RuleData {
  /** @override */
  static defineSchema() {
    return { ...super.defineSchema(), value: valueField(0) };
  }
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
  RollOption: RollOptionRule
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
