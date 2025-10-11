/**
 * @fileoverview L5R4 Localization Key Mappings
 * 
 * Centralized i18n label keys for UI consistency across the system.
 * These are passive maps providing a single source of truth for localization keys.
 * Do not localize here - pass keys through game.i18n.localize/format in consumers.
 * 
 * **Responsibilities:**
 * - Define ring label keys
 * - Define trait label keys  
 * - Define skill label keys
 * - Define all other UI label mappings
 * 
 * **Usage Pattern:**
 * Import the constant, iterate its keys/values, pass values to game.i18n.localize().
 * All keys follow the pattern: l5r4.{category}.{subcategory}.{identifier}
 * 
 * **Test Coverage:**
 * This file contains only static constant exports with no executable logic.
 * V8 coverage tools cannot track pure declarations (0% coverage is expected).
 * 
 * @see https://foundryvtt.com/api/classes/client.i18n.Localization.html
 */

const freeze = Object.freeze;

/**
 * Ring label keys for L5R4 system.
 * @typedef {{ air: string, earth: string, fire: string, water: string, void: string }} RingLabelMap
 * @type {RingLabelMap}
 */
export const RING_LABELS = freeze({
  air: "l5r4.ui.mechanics.rings.air",
  earth: "l5r4.ui.mechanics.rings.earth",
  fire: "l5r4.ui.mechanics.rings.fire",
  water: "l5r4.ui.mechanics.rings.water",
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * Skill label keys for L5R4 system.
 * Comprehensive mapping of skill identifiers to localization keys.
 * Used by sheets and templates for consistent skill name display.
 * Maintained in alphabetical order for easy reference.
 * @type {Readonly<Record<string, string>>}
 */
export const SKILL_LABELS = freeze({
  acting: "l5r4.character.skills.names.acting",
  animalHandling: "l5r4.character.skills.names.animalHandling",
  artisan: "l5r4.character.skills.names.artisan",
  athletics: "l5r4.character.skills.names.athletics",
  battle: "l5r4.character.skills.names.battle",
  calligraphy: "l5r4.character.skills.names.calligraphy",
  chainWeapons: "l5r4.character.skills.names.chainWeapons",
  commerce: "l5r4.character.skills.names.commerce",
  courtier: "l5r4.character.skills.names.courtier",
  craft: "l5r4.character.skills.names.craft",
  defense: "l5r4.character.skills.names.defense",
  divination: "l5r4.character.skills.names.divination",
  engineering: "l5r4.character.skills.names.engineering",
  etiquette: "l5r4.character.skills.names.etiquette",
  forgery: "l5r4.character.skills.names.forgery",
  games: "l5r4.character.skills.names.games",
  heavyWeapons: "l5r4.character.skills.names.heavyWeapons",
  horsemanship: "l5r4.character.skills.names.horsemanship",
  hunting: "l5r4.character.skills.names.hunting",
  iaijutsu: "l5r4.character.skills.names.iaijutsu",
  investigation: "l5r4.character.skills.names.investigation",
  jiujutsu: "l5r4.character.skills.names.jiujutsu",
  kenjutsu: "l5r4.character.skills.names.kenjutsu",
  knives: "l5r4.character.skills.names.knives",
  kyujutsu: "l5r4.character.skills.names.kyujutsu",
  lore: "l5r4.character.skills.names.lore",
  medicine: "l5r4.character.skills.names.medicine",
  meditation: "l5r4.character.skills.names.meditation",
  ninjutsu: "l5r4.character.skills.names.ninjutsu",
  perform: "l5r4.character.skills.names.perform",
  polearms: "l5r4.character.skills.names.polearms",
  sailing: "l5r4.character.skills.names.sailing",
  sincerity: "l5r4.character.skills.names.sincerity",
  sleightOfHand: "l5r4.character.skills.names.sleightOfHand",
  spears: "l5r4.character.skills.names.spears",
  spellcraft: "l5r4.character.skills.names.spellcraft",
  staves: "l5r4.character.skills.names.staves",
  stealth: "l5r4.character.skills.names.stealth",
  teaCeremony: "l5r4.character.skills.names.teaCeremony",
  temptation: "l5r4.character.skills.names.temptation",
  warFan: "l5r4.character.skills.names.warFan",
  weapons: "l5r4.character.skills.names.weapons"
});

/**
 * Arrow type localization keys for UI select elements.
 * Maps arrow type identifiers to their display labels for consistent
 * presentation across weapon sheets and combat dialogs.
 * @type {Readonly<Record<string, string>>}
 */
export const ARROWS = freeze({
  armor:   "l5r4.equipment.weapons.arrows.armor",
  flesh:   "l5r4.equipment.weapons.arrows.flesh",
  humming: "l5r4.equipment.weapons.arrows.humming",
  rope:    "l5r4.equipment.weapons.arrows.rope",
  willow:  "l5r4.equipment.weapons.arrows.willow"
});

/**
 * Weapon size localization keys for UI select elements.
 * Maps size identifiers to their display labels for weapon categorization
 * and mechanical effects in combat calculations.
 * @type {Readonly<Record<string, string>>}
 */
export const SIZES = freeze({
  small:  "l5r4.equipment.weapons.sizes.small",
  medium: "l5r4.equipment.weapons.sizes.medium",
  large:  "l5r4.equipment.weapons.sizes.large"
});

/**
 * Ring localization keys (legacy format for templates).
 * @deprecated Use RING_LABELS instead for new code. This export maintained for backwards compatibility with existing templates.
 * @type {Readonly<Record<string, string>>}
 */
export const RINGS = freeze({
  fire: "l5r4.ui.mechanics.rings.fire",
  water: "l5r4.ui.mechanics.rings.water",
  air: "l5r4.ui.mechanics.rings.air",
  earth: "l5r4.ui.mechanics.rings.earth",
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * Ring options with None option for technique affinity/deficiency.
 * Includes empty string key ("") mapped to "none" for optional ring selection in forms.
 * Used in technique item sheets where ring affinity/deficiency is optional.
 * @type {Readonly<Record<string, string>>}
 */
export const RINGS_WITH_NONE = freeze({
  "": "l5r4.ui.common.none",
  fire: "l5r4.ui.mechanics.rings.fire",
  water: "l5r4.ui.mechanics.rings.water",
  air: "l5r4.ui.mechanics.rings.air",
  earth: "l5r4.ui.mechanics.rings.earth",
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * Combat stance options for character sheets.
 * Maps stance status IDs to their localization keys for dropdown display.
 * Includes empty string for "no stance" state.
 * @type {Readonly<Record<string, string>>}
 */
export const STANCES = freeze({
  "": "l5r4.ui.common.none",
  attackStance: "l5r4.ui.mechanics.stances.attack",
  fullAttackStance: "l5r4.ui.mechanics.stances.fullAttack",
  defenseStance: "l5r4.ui.mechanics.stances.defense",
  fullDefenseStance: "l5r4.ui.mechanics.stances.fullDefense",
  centerStance: "l5r4.ui.mechanics.stances.center"
});

/**
 * Ring options available for spell casting.
 * Includes standard five rings plus "all" for universal spells that can be cast with any ring.
 * Used in spell item sheets and casting dialogs.
 * @type {Readonly<Record<string, string>>}
 */
export const SPELL_RINGS = freeze({
  fire: "l5r4.ui.mechanics.rings.fire",
  water: "l5r4.ui.mechanics.rings.water",
  air: "l5r4.ui.mechanics.rings.air",
  earth: "l5r4.ui.mechanics.rings.earth",
  void: "l5r4.ui.mechanics.rings.void",
  all: "l5r4.ui.mechanics.rings.all"
});

/**
 * PC trait localization keys.
 * Maps abbreviated trait codes (sta, wil, str, per, ref, awa, agi, int) to their localized labels.
 * @type {Readonly<Record<string, string>>}
 */
export const TRAITS = freeze({
  sta: "l5r4.ui.mechanics.traits.sta",
  wil: "l5r4.ui.mechanics.traits.wil",
  str: "l5r4.ui.mechanics.traits.str",
  per: "l5r4.ui.mechanics.traits.per",
  ref: "l5r4.ui.mechanics.traits.ref",
  awa: "l5r4.ui.mechanics.traits.awa",
  agi: "l5r4.ui.mechanics.traits.agi",
  int: "l5r4.ui.mechanics.traits.int"
});

/**
 * Skill trait options including Void Ring.
 * Extends TRAITS with void option for skills that can use Void as their governing trait.
 * Used in skill item sheets where void is a valid trait choice.
 * @type {Readonly<Record<string, string>>}
 */
export const SKILL_TRAITS = freeze({
  sta: "l5r4.ui.mechanics.traits.sta",
  wil: "l5r4.ui.mechanics.traits.wil",
  str: "l5r4.ui.mechanics.traits.str",
  per: "l5r4.ui.mechanics.traits.per",
  ref: "l5r4.ui.mechanics.traits.ref",
  awa: "l5r4.ui.mechanics.traits.awa",
  agi: "l5r4.ui.mechanics.traits.agi",
  int: "l5r4.ui.mechanics.traits.int",
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * NPC trait localization keys.
 * Separate constant from TRAITS to allow future differentiation if NPC trait display requirements diverge.
 * Currently identical to PC traits for consistency.
 * @type {Readonly<Record<string, string>>}
 */
export const NPC_TRAITS = freeze({
  sta: "l5r4.ui.mechanics.traits.sta",
  wil: "l5r4.ui.mechanics.traits.wil",
  str: "l5r4.ui.mechanics.traits.str",
  per: "l5r4.ui.mechanics.traits.per",
  ref: "l5r4.ui.mechanics.traits.ref",
  awa: "l5r4.ui.mechanics.traits.awa",
  agi: "l5r4.ui.mechanics.traits.agi",
  int: "l5r4.ui.mechanics.traits.int"
});

/**
 * Skill category/family localization keys.
 * Maps skill type identifiers (high, bugei, merch, low) to their localized category names.
 * Used for skill grouping in character sheets and skill filters.
 * @type {Readonly<Record<string, string>>}
 */
export const SKILL_TYPES = freeze({
  high: "l5r4.character.skillTypes.high",
  bugei: "l5r4.character.skillTypes.bugei",
  merch: "l5r4.character.skillTypes.merch",
  low: "l5r4.character.skillTypes.low"
});

/**
 * Action economy type localization keys.
 * Maps action types (simple, complex, free) to their localized labels.
 * Used in item sheets and combat tracking for action cost display.
 * @type {Readonly<Record<string, string>>}
 */
export const ACTION_TYPES = freeze({
  simple: "l5r4.ui.common.simple",
  complex: "l5r4.ui.common.complex",
  free: "l5r4.ui.common.free"
});

/**
 * Kiho category localization keys.
 * Maps kiho types (internal, karmic, martial, mystic) to their localized category names.
 * Used in kiho item sheets for categorization and filtering.
 * @type {Readonly<Record<string, string>>}
 */
export const KIHO_TYPES = freeze({
  internal: "l5r4.magic.kiho.internal",
  karmic: "l5r4.magic.kiho.karmic",
  martial: "l5r4.magic.kiho.martial",
  mystic: "l5r4.magic.kiho.mystic"
});

/**
 * Advantage category localization keys.
 * Maps advantage categories to their localized labels.
 * Covers physical, mental, social, material, spiritual, and ancestor advantages.
 * Used in advantage/disadvantage item sheets for categorization.
 * @type {Readonly<Record<string, string>>}
 */
export const ADVANTAGE_TYPES = freeze({
  physical: "l5r4.character.advantages.physical",
  mental: "l5r4.character.advantages.mental",
  social: "l5r4.character.advantages.social",
  material: "l5r4.character.advantages.material",
  spiritual: "l5r4.character.advantages.spiritual",
  ancestor: "l5r4.character.advantages.ancestor"
});
