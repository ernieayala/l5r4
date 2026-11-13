import {
  booleanField,
  coinsField,
  numberField,
  rankPointsField,
  spellSlotsField,
  stringField
} from "../fields.js";
import { migratePcSource } from "../migrate-source.js";
import { preparePcData } from "../../documents/actor/preparation/pc-preparation.js";
import {
  calculateInsightRank,
  preparePcExperience
} from "../../documents/actor/calculations/xp-system.js";
import ActorData from "./ActorData.js";

/**
 * Data model for the `pc` Actor subtype.
 *
 * Not stored, computed in preparation: Initiative roll and keep, Insight points, Armor TN reduction and current
 * value (roadmap/STAGE-02-DATA-MODELS.md decision 4). `insight.rank` stays stored for the GM's manual mode.
 */
export default class PcData extends ActorData {
  static VOID_RANK = 2;

  /** @override */
  static defineSchema() {
    const { SchemaField } = foundry.data.fields;
    return {
      ...super.defineSchema(),
      xp: numberField(0),
      clan: stringField(),
      school: stringField(),
      honor: rankPointsField(2),
      glory: rankPointsField(1),
      status: rankPointsField(1),
      insight: new SchemaField({ rank: numberField(1), autoCalculate: booleanField(true) }),
      armorTn: new SchemaField({
        type: stringField(),
        reductionMod: numberField(0),
        mod: numberField(0)
      }),
      wealth: coinsField(),
      spellSlots: spellSlotsField(2)
    };
  }

  /** @override */
  static migrateData(source) {
    migratePcSource(source);
    return super.migrateData(source);
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    const actor = this.parent;
    preparePcData(actor, this, actor._finalizeWoundPenalties.bind(actor), calculateInsightRank);
    preparePcExperience(actor, this);
  }
}
