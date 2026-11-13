import { TRAIT_KEYS } from "../../config/reference-data.js";
import { booleanField, htmlField, numberField, rankPointsField } from "../fields.js";
import { migrateCommonActorSource } from "../migrate-source.js";

/**
 * Shared data model for the `pc` and `npc` Actor subtypes: the stored inputs both share.
 *
 * Derived values (Rings from Traits, wound thresholds and rank, Armor TN, Initiative pool, Insight points) are
 * computed during preparation and never stored (roadmap/STAGE-02-DATA-MODELS.md decision 4). Defaults equal the
 * 3.2.1 template.json defaults (decision 1). Subclasses run the subtype's preparation in `prepareDerivedData`,
 * which core calls after the "initial" Active Effect phase and before Actor#prepareDerivedData
 * (client/documents/abstract/client-document.mjs:313-320).
 */
export default class ActorData extends foundry.abstract.TypeDataModel {
  /**
   * Initial Void Ring rank for the subtype.
   * @type {number}
   */
  static VOID_RANK = 0;

  /** @override */
  static defineSchema() {
    const { ObjectField, SchemaField } = foundry.data.fields;
    return {
      traits: new SchemaField(Object.fromEntries(TRAIT_KEYS.map(key => [key, numberField(2)]))),
      rings: new SchemaField({
        void: new SchemaField({ rank: numberField(this.VOID_RANK), value: numberField(0) })
      }),
      wounds: new SchemaField({
        // An NPC's custom maximum, read before preparation replaces it with the computed one (decision 4).
        max: numberField(0),
        mod: numberField(0),
        healingStaminaMod: numberField(0)
      }),
      suffered: numberField(0),
      woundsMultiplier: numberField(2),
      woundsMod: numberField(0),
      woundsPenaltyMod: numberField(0),
      initiative: new SchemaField(this._initiativeFields()),
      movement: new SchemaField({
        multiplier: numberField(1),
        modifier: numberField(0),
        showSimple: booleanField(false)
      }),
      shadowTaint: rankPointsField(0),
      notes: htmlField(),
      // Targets for Active Effect changes with free-form keys, e.g. system.bonuses.skill.kenjutsu.roll
      // (module/services/dice/effects/bonus-applicator.js).
      bonuses: new SchemaField({
        skill: new ObjectField(),
        trait: new ObjectField(),
        ring: new ObjectField()
      })
    };
  }

  /**
   * Initiative fields stored for the subtype; the modifiers and the Void choice are shared.
   * @returns {Record<string, foundry.data.fields.DataField>}
   * @protected
   */
  static _initiativeFields() {
    return {
      rollMod: numberField(0),
      keepMod: numberField(0),
      totalMod: numberField(0),
      useVoid: booleanField(false)
    };
  }

  /** @override */
  static migrateData(source) {
    migrateCommonActorSource(source);
    return super.migrateData(source);
  }
}
