/**
 * @module data/actor/npc-data
 * @description The data model of the `npc` Actor subtype.
 */

import { NPC_INSIGHT_RANK, WOUND_LEVEL_ORDER } from "../../config/game-mechanics.js";
import { booleanField, numberField, sourceField, spellSlotsField, stringField } from "../fields.js";
import { migrateNpcSource } from "../migrate-source.js";
import { prepareNpcData } from "../../documents/actor/preparation/npc-preparation.js";
import { prepareFear } from "../../documents/actor/calculations/fear-system.js";
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
    const attack = (roll, keep) =>
      new SchemaField({
        name: stringField(),
        roll: numberField(roll),
        keep: numberField(keep),
        modifier: numberField(0),
        type: stringField()
      });
    const damage = (roll, keep) =>
      new SchemaField({
        roll: numberField(roll),
        keep: numberField(keep),
        modifier: numberField(0),
        type: stringField()
      });
    return {
      ...super.defineSchema(),
      attack1: attack(2, 2),
      attack2: attack(2, 2),
      attack3: attack(0, 0),
      damage1: damage(2, 2),
      damage2: damage(2, 2),
      damage3: damage(0, 0),
      armor: new SchemaField({ armorTn: numberField(10), reduction: numberField(0) }),
      nrWoundLvls: numberField(3),
      woundMode: stringField("manual"),
      manualWoundLevels: new SchemaField(
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
      ),
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

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    const actor = this.parent;
    prepareNpcData(actor, this, actor._finalizeWoundPenalties.bind(actor));
    prepareFear(this);
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
