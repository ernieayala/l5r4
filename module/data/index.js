import NpcData from "./actor/NpcData.js";
import PcData from "./actor/PcData.js";
import AdvantageData from "./item/AdvantageData.js";
import ArmorData from "./item/ArmorData.js";
import BowData from "./item/BowData.js";
import ClanData from "./item/ClanData.js";
import CommonItemData from "./item/CommonItemData.js";
import DisadvantageData from "./item/DisadvantageData.js";
import FamilyData from "./item/FamilyData.js";
import KataData from "./item/KataData.js";
import KihoData from "./item/KihoData.js";
import SchoolData from "./item/SchoolData.js";
import SkillData from "./item/SkillData.js";
import SpellData from "./item/SpellData.js";
import TattooData from "./item/TattooData.js";
import TechniqueData from "./item/TechniqueData.js";
import WeaponData from "./item/WeaponData.js";

/**
 * Data model class per subtype, keyed by Document name. `init` registers them in `CONFIG.<Document>.dataModels`;
 * tests/manifest.test.js checks them against system.json `documentTypes`.
 */
export const DATA_MODELS = {
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
  }
};
