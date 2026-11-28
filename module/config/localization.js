/**
 * @module config/localization
 * @description Immutable mappings from internal identifiers to i18n localization keys in lang/*.json. Keeping the
 * keys in one place keeps literal strings out of the code and leaves translation to Foundry's localization system.
 */

/**
 * Localization keys for the five elemental rings, shown as `game.i18n.localize(RING_LABELS.fire)`.
 * Used in character sheets, spell displays, and roll dialogs.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} air - Air ring localization key
 * @property {string} earth - Earth ring localization key
 * @property {string} fire - Fire ring localization key
 * @property {string} water - Water ring localization key
 * @property {string} void - Void ring localization key
 */
export const RING_LABELS = Object.freeze({
  air: "l5r4.ui.mechanics.rings.air",
  earth: "l5r4.ui.mechanics.rings.earth",
  fire: "l5r4.ui.mechanics.rings.fire",
  water: "l5r4.ui.mechanics.rings.water",
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * Localization keys for arrow types.
 * Corresponds to ARROW_MODS in game-mechanics.js for damage calculations.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} armor - Armor-piercing arrows
 * @property {string} flesh - Flesh-cutter arrows
 * @property {string} humming - Humming bulb arrows
 * @property {string} rope - Rope-cutter arrows
 * @property {string} willow - Willow leaf arrows
 */
export const ARROWS = Object.freeze({
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
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} ashigaru - Light armor for common soldiers
 * @property {string} light - Light armor
 * @property {string} heavy - Heavy armor
 * @property {string} riding - Riding armor
 */
export const ARMOR_TYPES = Object.freeze({
  ashigaru: "l5r4.equipment.armor.types.ashigaru",
  light: "l5r4.equipment.armor.types.light",
  heavy: "l5r4.equipment.armor.types.heavy",
  riding: "l5r4.equipment.armor.types.riding"
});

/**
 * Localization keys for weapon sizes.
 * Affects weapon handling and combat mechanics.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} small - Small weapons (knives, tanto)
 * @property {string} medium - Medium weapons (katana, wakizashi)
 * @property {string} large - Large weapons (no-dachi, tetsubo)
 */
export const SIZES = Object.freeze({
  small: "l5r4.equipment.weapons.sizes.small",
  medium: "l5r4.equipment.weapons.sizes.medium",
  large: "l5r4.equipment.weapons.sizes.large"
});

/**
 * Localization keys for rings in standard order.
 * Alias of RING_LABELS with different key ordering.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 */
export const RINGS = Object.freeze({
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
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} "" - None/empty selection
 */
export const RINGS_WITH_NONE = Object.freeze({
  "": "l5r4.ui.common.none",
  ...RING_LABELS
});

/**
 * Localization keys for combat stances.
 * Used in combat configuration and stance selection dialogs.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} "" - No stance selected
 * @property {string} attackStance - Attack stance (+1k0 attack, -5 TN to be hit)
 * @property {string} fullAttackStance - Full attack stance (+2k1 attack, -10 TN to be hit)
 * @property {string} defenseStance - Defense stance (+10 TN to be hit)
 * @property {string} fullDefenseStance - Full defense stance (+20 TN to be hit)
 * @property {string} centerStance - Center stance (void point recovery)
 */
export const STANCES = Object.freeze({
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
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} all - All rings (for universal spells)
 */
export const SPELL_RINGS = Object.freeze({
  ...RING_LABELS,
  all: "l5r4.ui.common.all"
});

/**
 * Localization keys for character traits (ring components).
 * Each ring consists of two traits that determine its value.
 *
 * @type {Readonly<Record<string, string>>}
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
export const TRAITS = Object.freeze({
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
 * @type {Readonly<Record<string, string>>}
 * @constant
 */
export const SKILL_TRAITS = Object.freeze({
  ...TRAITS,
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * Localization keys for NPC traits.
 * Alias of TRAITS for semantic clarity in NPC contexts.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 */
export const NPC_TRAITS = TRAITS;

/**
 * Localization keys for skill categories.
 * Determines skill availability and social implications.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} high - High skills (courtly, scholarly)
 * @property {string} bugei - Bugei skills (martial, combat)
 * @property {string} merch - Merchant skills (trade, commerce)
 * @property {string} low - Low skills (dishonorable, peasant)
 */
export const SKILL_TYPES = Object.freeze({
  high: "l5r4.character.skillTypes.high",
  bugei: "l5r4.character.skillTypes.bugei",
  merch: "l5r4.character.skillTypes.merch",
  low: "l5r4.character.skillTypes.low"
});

/**
 * Localization keys for action types in combat.
 * Determines how many actions can be taken per round.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} simple - Simple action (can take multiple)
 * @property {string} complex - Complex action (takes full round)
 * @property {string} free - Free action (unlimited)
 */
export const ACTION_TYPES = Object.freeze({
  simple: "l5r4.ui.common.simple",
  complex: "l5r4.ui.common.complex",
  free: "l5r4.ui.common.free"
});

/**
 * Localization keys for kiho (monk power) types.
 * Categorizes mystical abilities available to monks and Brotherhood members.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} internal - Internal kiho (body enhancement)
 * @property {string} karmic - Karmic kiho (spiritual effects)
 * @property {string} martial - Martial kiho (combat techniques)
 * @property {string} mystic - Mystic kiho (supernatural abilities)
 */
export const KIHO_TYPES = Object.freeze({
  internal: "l5r4.magic.kiho.internal",
  karmic: "l5r4.magic.kiho.karmic",
  martial: "l5r4.magic.kiho.martial",
  mystic: "l5r4.magic.kiho.mystic"
});

/**
 * Localization keys for how a School lets its student learn kiho (#159), in the order the most open comes first:
 * a School's blank value reads it from the School's data instead (module/utils/kiho.js).
 * game-rules/87_kiho.md, p.266
 * @type {Readonly<Record<string, string>>}
 * @constant
 */
export const KIHO_ACCESS_TYPES = Object.freeze({
  brotherhood: "l5r4.magic.kiho.access.brotherhood",
  monk: "l5r4.magic.kiho.access.monk",
  shugenja: "l5r4.magic.kiho.access.shugenja",
  ninja: "l5r4.magic.kiho.access.ninja",
  none: "l5r4.magic.kiho.access.none"
});

/**
 * Localization keys for advantage categories.
 * Used for organizing and filtering character advantages.
 *
 * @type {Readonly<Record<string, string>>}
 * @constant
 * @property {string} physical - Physical advantages (body-related)
 * @property {string} mental - Mental advantages (mind-related)
 * @property {string} social - Social advantages (status, connections)
 * @property {string} material - Material advantages (wealth, equipment)
 * @property {string} spiritual - Spiritual advantages (supernatural)
 * @property {string} ancestor - Ancestor advantages (bloodline blessings)
 */
export const ADVANTAGE_TYPES = Object.freeze({
  physical: "l5r4.character.advantages.physical",
  mental: "l5r4.character.advantages.mental",
  social: "l5r4.character.advantages.social",
  material: "l5r4.character.advantages.material",
  spiritual: "l5r4.character.advantages.spiritual",
  ancestor: "l5r4.character.advantages.ancestor"
});
