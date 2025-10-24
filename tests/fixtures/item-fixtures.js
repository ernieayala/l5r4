/**
 * @fileoverview Item test fixtures
 * Provides reusable item creation functions for tests
 */

/**
 * Create a basic skill item
 * @param {string} name - Skill name
 * @param {number} rank - Skill rank (0-10)
 * @param {string} trait - Associated trait
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} Item data (not created)
 */
export function createSkillData(name, rank = 0, trait = "agi", overrides = {}) {
  const defaultData = {
    name,
    type: "skill",
    system: {
      rank,
      trait,
      type: "high",
      school: false,
      emphasis: "",
      mastery3: "",
      mastery5: "",
      mastery7: ""
    }
  };

  return foundry.utils.mergeObject(defaultData, overrides);
}

/**
 * Create a weapon item
 * @param {string} name - Weapon name
 * @param {number} damageRoll - Damage rolled dice
 * @param {number} damageKeep - Damage kept dice
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} Item data (not created)
 */
export function createWeaponData(name, damageRoll = 3, damageKeep = 2, overrides = {}) {
  const defaultData = {
    name,
    type: "weapon",
    system: {
      damageRoll,
      damageKeep,
      size: "medium",
      damageFormula: "",
      explodesOn: 10,
      associatedSkill: "",
      fallbackTrait: "agi",
      isBow: false,
      keywords: []
    }
  };

  return foundry.utils.mergeObject(defaultData, overrides);
}

/**
 * Create a katana weapon
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} Katana item data
 */
export function createKatana(overrides = {}) {
  return createWeaponData("Katana", 3, 2, {
    system: {
      associatedSkill: "kenjutsu",
      ...overrides.system
    }
  });
}

/**
 * Create a bow weapon
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} Bow item data
 */
export function createBow(overrides = {}) {
  return createWeaponData("Yumi", 2, 2, {
    system: {
      isBow: true,
      str: 3,
      range: 250,
      associatedSkill: "kyujutsu",
      ...overrides.system
    }
  });
}

/**
 * Create an armor item
 * @param {string} name - Armor name
 * @param {number} bonus - TN bonus
 * @param {number} reduction - Damage reduction
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} Armor item data
 */
export function createArmorData(name, bonus = 3, reduction = 2, overrides = {}) {
  const defaultData = {
    name,
    type: "armor",
    system: {
      bonus,
      reduction,
      equipped: false,
      armorType: "light",
      keywords: []
    }
  };

  return foundry.utils.mergeObject(defaultData, overrides);
}

/**
 * Create a spell item
 * @param {string} name - Spell name
 * @param {string} ring - Spell ring (earth, air, fire, water, void)
 * @param {number} mastery - Mastery level (1-10)
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} Spell item data
 */
export function createSpellData(name, ring = "fire", mastery = 1, overrides = {}) {
  const defaultData = {
    name,
    type: "spell",
    system: {
      ring,
      mastery,
      keywords: [],
      range: "",
      aoe: "",
      duration: "",
      raises: ""
    }
  };

  return foundry.utils.mergeObject(defaultData, overrides);
}

/**
 * Create a school item
 * @param {string} name - School name
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} School item data
 */
export function createSchoolData(name, overrides = {}) {
  const defaultData = {
    name,
    type: "school",
    system: {
      description: "",
      specialRules: ""
    }
  };

  return foundry.utils.mergeObject(defaultData, overrides);
}

/**
 * Create a family item
 * @param {string} name - Family name
 * @param {Object} overrides - Optional property overrides
 * @returns {Object} Family item data
 */
export function createFamilyData(name, overrides = {}) {
  const defaultData = {
    name,
    type: "family",
    system: {
      description: "",
      specialRules: ""
    }
  };

  return foundry.utils.mergeObject(defaultData, overrides);
}

/**
 * Common skill sets for quick testing
 */
export const COMMON_SKILLS = {
  bushi: [
    createSkillData("Kenjutsu", 5, "agi"),
    createSkillData("Iaijutsu", 3, "ref"),
    createSkillData("Kyujutsu", 2, "ref"),
    createSkillData("Defense", 3, "ref")
  ],

  courtier: [
    createSkillData("Etiquette", 5, "awa"),
    createSkillData("Sincerity", 4, "awa"),
    createSkillData("Courtier", 3, "awa"),
    createSkillData("Lore: Heraldry", 2, "int")
  ],

  shugenja: [
    createSkillData("Spellcraft", 4, "int"),
    createSkillData("Calligraphy", 3, "int"),
    createSkillData("Meditation", 3, "voidRing"),
    createSkillData("Lore: Theology", 2, "int")
  ]
};
