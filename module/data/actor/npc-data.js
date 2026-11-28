/**
 * @module data/actor/npc-data
 * @description The data model of the `npc` Actor subtype.
 */

import { NPC_INSIGHT_RANK, WOUND_LEVEL_ORDER } from "../../config/game-mechanics.js";
import { booleanField, numberField, sourceField, spellSlotsField, stringField } from "../fields.js";
import { migrateNpcSource } from "../migrate-source.js";
import ActorData from "./base-data.js";

/**
 * 3.2.1 defaults for an NPC's manual wound levels: threshold, TN penalty, and whether the level is in use.
 * @type {Readonly<Record<string, [number, number, boolean]>>}
 */
const MANUAL_WOUND_DEFAULTS = Object.freeze({
  healthy: [15, 0, true],
  nicked: [20, 3, true],
  grazed: [25, 5, false],
  hurt: [30, 10, false],
  injured: [35, 15, false],
  crippled: [40, 20, false],
  down: [43, 40, false],
  out: [45, 40, true]
});

/**
 * Data model for the `npc` Actor subtype.
 *
 * Initiative roll and keep are stored: a value above 0 in both is the GM's custom pool, and 0 (the default) uses
 * the Initiative formula (module/documents/actor/preparation/npc-preparation.js; #30). Spell slots start at 0,
 * which blocks casting as the absent pool did in 3.2.1 until a rest sets them (roadmap/STAGE-02-DATA-MODELS.md
 * decision 6).
 */
export default class NpcData extends ActorData {
  static VOID_RANK = 0;

  /** @override */
  static defineSchema() {
    const { SchemaField } = foundry.data.fields;
    return {
      ...super.defineSchema(),
      attack1: attackField(2, 2),
      attack2: attackField(2, 2),
      attack3: attackField(0, 0),
      damage1: damageField(2, 2),
      damage2: damageField(2, 2),
      damage3: damageField(0, 0),
      // `bonus` is the part of the entered Armor TN that is armor worn, which Grappled, Stunned, and "ignores armor"
      // effects read; 0, the default, counts the whole Armor TN as the NPC's own (#152)
      armor: new SchemaField({
        armorTn: numberField(10),
        reduction: numberField(0),
        bonus: numberField(0)
      }),
      nrWoundLvls: numberField(3),
      woundMode: stringField("manual"),
      manualWoundLevels: manualWoundLevelsField(),
      fear: new SchemaField({ rank: numberField(0) }),
      spellSlots: spellSlotsField(0),
      // The book and page a creature comes from (roadmap/STAGE-15); blank for one the GM made
      source: sourceField()
    };
  }

  /** @override */
  static migrateData(source) {
    migrateNpcSource(source);
    return super.migrateData(source);
  }

  /**
   * The Insight Rank rules read: NPCs have no Insight and count as Rank 1 (NPC_INSIGHT_RANK).
   * @type {number}
   */
  get insightRank() {
    return NPC_INSIGHT_RANK;
  }

  /** @override */
  static _initiativeFields() {
    return { roll: numberField(0), keep: numberField(0), ...super._initiativeFields() };
  }
}

/**
 * One attack of the stat block: its name, pool, flat modifier, and type.
 * @param {number} roll - Initial rolled dice
 * @param {number} keep - Initial kept dice
 * @returns {foundry.data.fields.SchemaField}
 */
function attackField(roll, keep) {
  return new foundry.data.fields.SchemaField({
    name: stringField(),
    roll: numberField(roll),
    keep: numberField(keep),
    modifier: numberField(0),
    type: stringField()
  });
}

/**
 * One damage pool of the stat block: its pool, flat modifier, and type.
 * @param {number} roll - Initial rolled dice
 * @param {number} keep - Initial kept dice
 * @returns {foundry.data.fields.SchemaField}
 */
function damageField(roll, keep) {
  return new foundry.data.fields.SchemaField({
    roll: numberField(roll),
    keep: numberField(keep),
    modifier: numberField(0),
    type: stringField()
  });
}

/**
 * The GM's manual Wound Ranks, one per rank of WOUND_LEVEL_ORDER, each starting at MANUAL_WOUND_DEFAULTS.
 * @returns {foundry.data.fields.SchemaField}
 */
function manualWoundLevelsField() {
  const { SchemaField } = foundry.data.fields;
  return new SchemaField(
    Object.fromEntries(
      WOUND_LEVEL_ORDER.map(key => {
        const [value, penalty, active] = MANUAL_WOUND_DEFAULTS[key];
        return [
          key,
          new SchemaField({
            value: numberField(value),
            penalty: numberField(penalty),
            active: booleanField(active)
          })
        ];
      })
    )
  );
}
