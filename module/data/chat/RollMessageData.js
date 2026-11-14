import { booleanField, numberField, stringField } from "../fields.js";

/**
 * Data model for the `roll` ChatMessage subtype: everything a check rolled with, so damage, re-rolls, and contests
 * rebuild from the message instead of from the card's HTML (roadmap/STAGE-08-ROLL-PIPELINE.md).
 */
export default class RollMessageData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const { ArrayField, NumberField, SchemaField } = foundry.data.fields;
    const modifier = () =>
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
      // The Skill rolled, in lower case; a grapple's control rolls use the Skill that started it (p.89)
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
      modifiers: new ArrayField(modifier()),
      voidPoint: booleanField(false),
      emphasis: stringField(),
      tn: new SchemaField({
        base: numberField(0),
        raises: numberField(0),
        freeRaises: numberField(0),
        freeRaisesToTN: numberField(0),
        woundPenalty: numberField(0),
        modifiers: new ArrayField(new SchemaField({ label: stringField(), value: numberField(0) })),
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
      // An attack's maneuvers (pp.86-87); increasedDamage is the declared Raises left for +1k0 each
      maneuvers: new SchemaField({
        calledShot: numberField(0),
        location: stringField(),
        disarm: booleanField(false),
        extraAttack: booleanField(false),
        feint: booleanField(false),
        knockdown: booleanField(false),
        fourLegged: booleanField(false),
        grapple: booleanField(false),
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
      // A damage roll's sources (jade, spell, ...) and the Reduction it ignores (pp.319-320)
      sources: new ArrayField(stringField()),
      ignoreReduction: numberField(0),
      // The attack a damage roll belongs to
      attackOf: stringField()
    };
  }

  /**
   * An attack posted before maneuvers were stored spent all its declared Raises on Increased Damage.
   * @override
   */
  static migrateData(source) {
    if (source.kind === "attack" && source.maneuvers === undefined && source.tn) {
      source.maneuvers = { increasedDamage: source.tn.raises ?? 0 };
    }
    return super.migrateData(source);
  }
}
