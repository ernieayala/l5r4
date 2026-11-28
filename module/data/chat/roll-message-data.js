/**
 * @module data/chat/roll-message-data
 * @description The data model of the `roll` ChatMessage subtype.
 */

import { booleanField, numberField, stringField } from "../fields.js";

/**
 * Data model for the `roll` ChatMessage subtype: everything a check rolled with, so damage, re-rolls, and contests
 * rebuild from the message instead of from the card's HTML (roadmap/STAGE-08-ROLL-PIPELINE.md).
 */
export default class RollMessageData extends foundry.abstract.TypeDataModel {
  /** @override */
  // eslint-disable-next-line max-lines-per-function -- one schema: every field a roll message stores, read as one list (functions.md, Function length)
  static defineSchema() {
    const { ArrayField, NumberField, SchemaField } = foundry.data.fields;
    const modifierField = () =>
      new SchemaField({
        label: stringField(),
        roll: numberField(0),
        keep: numberField(0),
        total: numberField(0),
        enabled: booleanField(true)
      });
    return {
      // The roller, by UUID; a token actor's UUID names its token.
      actorUuid: stringField(),
      // skill, trait, ring, spell, maho, attack, damage, or roll (a plain XkY roll)
      kind: stringField("roll"),
      label: stringField(),
      // The Skill rolled, in lower case; a grapple's control rolls use the Skill that started it
      // game-rules/40_grappling.md, p.89
      skill: stringField(),
      // The pool after modifiers, Void, and the Ten Dice Rule; explode is null for an Unskilled Roll.
      pool: new SchemaField({
        roll: numberField(1),
        keep: numberField(1),
        bonus: numberField(0),
        explode: new NumberField({ required: true, nullable: true, initial: 10 }),
        rerollOnes: booleanField(false),
        unskilled: booleanField(false)
      }),
      modifiers: new ArrayField(modifierField()),
      voidPoint: booleanField(false),
      emphasis: stringField(),
      tn: new SchemaField({
        base: numberField(0),
        raises: numberField(0),
        freeRaises: numberField(0),
        freeRaisesToTN: numberField(0),
        woundPenalty: numberField(0),
        modifiers: new ArrayField(new SchemaField({ label: stringField(), value: numberField(0) })),
        // An attack's target Armor TN: the base and the target's own changes (Prone against melee), 0 otherwise
        armor: numberField(0),
        // null when the roll has no TN
        effective: new NumberField({ required: true, nullable: true, initial: null })
      }),
      target: new SchemaField({ uuid: stringField(), name: stringField() }),
      outcome: new SchemaField({
        total: numberField(0),
        success: new foundry.data.fields.BooleanField({ nullable: true, initial: null }),
        margin: new NumberField({ required: true, nullable: true, initial: null })
      }),
      weaponUuid: stringField(),
      notes: new ArrayField(stringField()),
      // Conditions the roller's ApplyCondition rules let a success put on the target; the card offers each one
      conditions: new ArrayField(
        new SchemaField({
          label: stringField(),
          condition: stringField(),
          level: new NumberField({ required: true, nullable: true, initial: null })
        })
      ),
      // The message this one re-rolled, keeping the better total
      rerollOf: stringField(),
      // The failed roll this Honor Roll re-rolled
      // game-rules/43_honor.md, p.92
      honorRollOf: stringField(),
      // An attack's maneuvers; cost is the Raises they took, increasedDamage the Raises and unspent Free Raises left
      // for +1k0 each (#157)
      // game-rules/38_maneuvers.md, p.86-87
      maneuvers: new SchemaField({
        calledShot: numberField(0),
        location: stringField(),
        disarm: booleanField(false),
        extraAttack: booleanField(false),
        feint: booleanField(false),
        knockdown: booleanField(false),
        fourLegged: booleanField(false),
        grapple: booleanField(false),
        cost: numberField(0),
        increasedDamage: numberField(0)
      }),
      // An attack's damage pool at the time of the attack (weapon DR with Strength or arrow, or a stat block's
      // damage); no label means none
      damage: new SchemaField({
        label: stringField(),
        roll: numberField(0),
        keep: numberField(0),
        bonus: numberField(0),
        explode: new NumberField({ required: true, nullable: true, initial: 10 })
      }),
      // A damage roll's sources (jade, spell, ...) and the Reduction it ignores
      // game-rules/99_creatures.md, p.319-320
      sources: new ArrayField(stringField()),
      ignoreReduction: numberField(0),
      // The attack a damage roll belongs to
      attackOf: stringField(),
      // An attack's range, "melee" or "ranged", which its damage roll keeps; empty for a roll with no range and for an
      // attack posted before the range was stored (#171)
      range: stringField()
    };
  }

  /**
   * An attack posted before maneuvers were stored spent all its declared Raises on Increased Damage. One posted before
   * their cost was stored paid it from declared Raises alone: the declared Raises its Increased Damage left (#157).
   * @override
   */
  static migrateData(source) {
    if (source.kind === "attack" && source.maneuvers === undefined && source.tn) {
      source.maneuvers = { increasedDamage: source.tn.raises ?? 0 };
    }
    if (source.kind === "attack" && source.maneuvers && source.maneuvers.cost === undefined) {
      source.maneuvers.cost = Math.max(
        0,
        (source.tn?.raises ?? 0) - (source.maneuvers.increasedDamage ?? 0)
      );
    }
    return super.migrateData(source);
  }
}
