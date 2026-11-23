/**
 * @module data/models
 * @description The registry of the system's data models, by Document name and subtype, that `init` registers.
 */

import NpcData from "./actor/npc-data.js";
import PcData from "./actor/pc-data.js";
import EffectData from "./effect/base-data.js";
import AdvantageData from "./item/advantage-data.js";
import ArmorData from "./item/armor-data.js";
import BowData from "./item/bow-data.js";
import ClanData from "./item/clan-data.js";
import CommonItemData from "./item/common-item-data.js";
import DisadvantageData from "./item/disadvantage-data.js";
import FamilyData from "./item/family-data.js";
import KataData from "./item/kata-data.js";
import KihoData from "./item/kiho-data.js";
import SchoolData from "./item/school-data.js";
import SkillData from "./item/skill-data.js";
import SpellData from "./item/spell-data.js";
import TattooData from "./item/tattoo-data.js";
import TechniqueData from "./item/technique-data.js";
import WeaponData from "./item/weapon-data.js";
import RollMessageData from "./chat/roll-message-data.js";
import CheckRequestData from "./chat/check-request-data.js";

/**
 * Data model class per subtype, keyed by Document name. `init` registers them in `CONFIG.<Document>.dataModels`;
 * tests/manifest.test.js checks them against system.json `documentTypes`.
 */
export const DATA_MODELS = Object.freeze({
  Actor: {
    pc: PcData,
    npc: NpcData
  },
  Item: {
    advantage: AdvantageData,
    armor: ArmorData,
    bow: BowData,
    clan: ClanData,
    commonItem: CommonItemData,
    disadvantage: DisadvantageData,
    family: FamilyData,
    school: SchoolData,
    kata: KataData,
    kiho: KihoData,
    skill: SkillData,
    spell: SpellData,
    tattoo: TattooData,
    technique: TechniqueData,
    weapon: WeaponData
  },
  ChatMessage: {
    roll: RollMessageData,
    checkRequest: CheckRequestData
  }
});

/**
 * Data model class per core type (`metadata.coreTypes`), keyed by Document name. `init` registers them in
 * `CONFIG.<Document>.dataModels` like DATA_MODELS, but they are never declared in `documentTypes`, where a core type
 * invalidates the whole field [src: common/packages/sub-types.mjs:45-47].
 */
export const CORE_TYPE_DATA_MODELS = Object.freeze({
  ActiveEffect: {
    base: EffectData
  }
});
