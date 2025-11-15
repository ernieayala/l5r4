/**
 * @file Localization key mappings for L5R4 game elements
 * @module config/localization
 *
 * Provides immutable mappings from internal identifiers to i18n localization keys.
 * All constants map to keys in lang/*.json files for multi-language support.
 * Used throughout the system for consistent UI text rendering.
 *
 * Architectural Decision: Centralized localization keys prevent hardcoded strings
 * and enable easy translation management through Foundry's localization system.
 *
 * @see {@link https://foundryvtt.com/api/classes/client.Localization.html|Foundry Localization}
 */

const freeze = Object.freeze;

/**
 * Localization keys for the five elemental rings.
 * Used in character sheets, spell displays, and roll dialogs.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} air - Air ring localization key
 * @property {string} earth - Earth ring localization key
 * @property {string} fire - Fire ring localization key
 * @property {string} water - Water ring localization key
 * @property {string} void - Void ring localization key
 *
 * @example
 * // Display localized ring name:
 * // game.i18n.localize(RING_LABELS.fire)
 */
export const RING_LABELS = freeze({
  air: "l5r4.ui.mechanics.rings.air",
  earth: "l5r4.ui.mechanics.rings.earth",
  fire: "l5r4.ui.mechanics.rings.fire",
  water: "l5r4.ui.mechanics.rings.water",
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * Localization keys for all L5R4 skills.
 * Maps skill identifiers to their display names in the current language.
 *
 * @type {Object<string, string>}
 * @constant
 *
 * @example
 * // Display localized skill name:
 * // game.i18n.localize(SKILL_LABELS.kenjutsu)
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
 * Localization keys for arrow types.
 * Corresponds to ARROW_MODS in game-data.js for damage calculations.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} armor - Armor-piercing arrows
 * @property {string} flesh - Flesh-cutter arrows
 * @property {string} humming - Humming bulb arrows
 * @property {string} rope - Rope-cutter arrows
 * @property {string} willow - Willow leaf arrows
 */
export const ARROWS = freeze({
  armor: "l5r4.equipment.weapons.arrows.armor",
  flesh: "l5r4.equipment.weapons.arrows.flesh",
  humming: "l5r4.equipment.weapons.arrows.humming",
  rope: "l5r4.equipment.weapons.arrows.rope",
  willow: "l5r4.equipment.weapons.arrows.willow"
});

/**
 * Localization keys for armor types.
 * Used in equipment sheets and armor configuration dialogs.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} ashigaru - Light armor for common soldiers
 * @property {string} light - Light armor
 * @property {string} heavy - Heavy armor
 * @property {string} riding - Riding armor
 */
export const ARMOR_TYPES = freeze({
  ashigaru: "l5r4.equipment.armor.types.ashigaru",
  light: "l5r4.equipment.armor.types.light",
  heavy: "l5r4.equipment.armor.types.heavy",
  riding: "l5r4.equipment.armor.types.riding"
});

/**
 * Localization keys for weapon sizes.
 * Affects weapon handling and combat mechanics.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} small - Small weapons (knives, tanto)
 * @property {string} medium - Medium weapons (katana, wakizashi)
 * @property {string} large - Large weapons (no-dachi, tetsubo)
 */
export const SIZES = freeze({
  small: "l5r4.equipment.weapons.sizes.small",
  medium: "l5r4.equipment.weapons.sizes.medium",
  large: "l5r4.equipment.weapons.sizes.large"
});

/**
 * Localization keys for rings in standard order.
 * Alias of RING_LABELS with different key ordering.
 *
 * @type {Object<string, string>}
 * @constant
 */
export const RINGS = freeze({
  fire: RING_LABELS.fire,
  water: RING_LABELS.water,
  air: RING_LABELS.air,
  earth: RING_LABELS.earth,
  void: RING_LABELS.void
});

/**
 * Localization keys for rings with "none" option.
 * Used in dropdowns where no ring selection is valid.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} "" - None/empty selection
 */
export const RINGS_WITH_NONE = freeze({
  "": "l5r4.ui.common.none",
  ...RING_LABELS
});

/**
 * Localization keys for combat stances.
 * Used in combat configuration and stance selection dialogs.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} "" - No stance selected
 * @property {string} attackStance - Attack stance (+1k0 attack, -5 TN to be hit)
 * @property {string} fullAttackStance - Full attack stance (+2k1 attack, -10 TN to be hit)
 * @property {string} defenseStance - Defense stance (+10 TN to be hit)
 * @property {string} fullDefenseStance - Full defense stance (+20 TN to be hit)
 * @property {string} centerStance - Center stance (void point recovery)
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
 * Localization keys for spell rings including "all" option.
 * Used in spell filtering and spell sheet displays.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} all - All rings (for universal spells)
 */
export const SPELL_RINGS = freeze({
  ...RING_LABELS,
  all: "l5r4.ui.mechanics.rings.all"
});

/**
 * Localization keys for character traits (ring components).
 * Each ring consists of two traits that determine its value.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} sta - Stamina (Earth)
 * @property {string} wil - Willpower (Earth)
 * @property {string} str - Strength (Water)
 * @property {string} per - Perception (Water)
 * @property {string} ref - Reflexes (Fire)
 * @property {string} awa - Awareness (Fire)
 * @property {string} agi - Agility (Air)
 * @property {string} int - Intelligence (Air)
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
 * Localization keys for skill-related traits including Void.
 * Extends TRAITS with Void ring for skills that can use any trait.
 *
 * @type {Object<string, string>}
 * @constant
 */
export const SKILL_TRAITS = freeze({
  ...TRAITS,
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * Localization keys for NPC traits.
 * Alias of TRAITS for semantic clarity in NPC contexts.
 *
 * @type {Object<string, string>}
 * @constant
 */
export const NPC_TRAITS = TRAITS;

/**
 * Localization keys for skill categories.
 * Determines skill availability and social implications.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} high - High skills (courtly, scholarly)
 * @property {string} bugei - Bugei skills (martial, combat)
 * @property {string} merch - Merchant skills (trade, commerce)
 * @property {string} low - Low skills (dishonorable, peasant)
 */
export const SKILL_TYPES = freeze({
  high: "l5r4.character.skillTypes.high",
  bugei: "l5r4.character.skillTypes.bugei",
  merch: "l5r4.character.skillTypes.merch",
  low: "l5r4.character.skillTypes.low"
});

/**
 * Localization keys for action types in combat.
 * Determines how many actions can be taken per round.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} simple - Simple action (can take multiple)
 * @property {string} complex - Complex action (takes full round)
 * @property {string} free - Free action (unlimited)
 */
export const ACTION_TYPES = freeze({
  simple: "l5r4.ui.common.simple",
  complex: "l5r4.ui.common.complex",
  free: "l5r4.ui.common.free"
});

/**
 * Localization keys for kiho (monk power) types.
 * Categorizes mystical abilities available to monks and Brotherhood members.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} internal - Internal kiho (body enhancement)
 * @property {string} karmic - Karmic kiho (spiritual effects)
 * @property {string} martial - Martial kiho (combat techniques)
 * @property {string} mystic - Mystic kiho (supernatural abilities)
 */
export const KIHO_TYPES = freeze({
  internal: "l5r4.magic.kiho.internal",
  karmic: "l5r4.magic.kiho.karmic",
  martial: "l5r4.magic.kiho.martial",
  mystic: "l5r4.magic.kiho.mystic"
});

/**
 * Localization keys for advantage categories.
 * Used for organizing and filtering character advantages.
 *
 * @type {Object<string, string>}
 * @constant
 * @property {string} physical - Physical advantages (body-related)
 * @property {string} mental - Mental advantages (mind-related)
 * @property {string} social - Social advantages (status, connections)
 * @property {string} material - Material advantages (wealth, equipment)
 * @property {string} spiritual - Spiritual advantages (supernatural)
 * @property {string} ancestor - Ancestor advantages (bloodline blessings)
 */
export const ADVANTAGE_TYPES = freeze({
  physical: "l5r4.character.advantages.physical",
  mental: "l5r4.character.advantages.mental",
  social: "l5r4.character.advantages.social",
  material: "l5r4.character.advantages.material",
  spiritual: "l5r4.character.advantages.spiritual",
  ancestor: "l5r4.character.advantages.ancestor"
});
