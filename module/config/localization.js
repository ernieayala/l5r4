/**
 * Localization Configuration
 * 
 * Provides frozen object mappings of game mechanic identifiers to i18n localization keys.
 * These constants are used throughout the system to reference translatable UI strings for
 * L5R4 game elements including Rings, Traits, Skills, Stances, and other mechanics.
 * 
 * All exports are frozen via Object.freeze() to prevent runtime mutation and ensure
 * configuration stability. Keys correspond to entries in lang/*.json files and are
 * resolved via game.i18n.localize() by Foundry VTT's internationalization system.
 * 
 * Game Mechanics Context:
 * - Rings: The Five Rings (Air, Earth, Fire, Water, Void) are fundamental to L5R4's
 *   Roll & Keep system. Each Ring comprises two Traits and influences skills and spells.
 * - Traits: Eight core attributes (Stamina, Willpower, Strength, Perception, Reflexes,
 *   Awareness, Agility, Intelligence) that define character capabilities.
 * - Skills: Character competencies categorized into High, Bugei, Merchant, and Low subtypes
 *   based on social standing and samurai traditions.
 * - Stances: Combat postures (Attack, Full Attack, Defense, Full Defense, Center) that
 *   determine available actions and tactical modifiers each round.
 * 
 * @module config/localization
 */

const freeze = Object.freeze;

/**
 * Five Rings localization keys.
 * 
 * Maps the Five Rings elemental system to i18n keys. The Five Rings (Air, Earth, Fire,
 * Water, Void) are the fundamental building blocks of L5R4 mechanics. Each Ring (except Void)
 * comprises two Traits - one physical, one mental. Ring ranks equal the lower of the two
 * component Trait ranks and are used for spellcasting and various mechanical effects.
 * 
 * @type {Readonly<{air: string, earth: string, fire: string, water: string, void: string}>}
 */
export const RING_LABELS = freeze({
  air: "l5r4.ui.mechanics.rings.air",
  earth: "l5r4.ui.mechanics.rings.earth",
  fire: "l5r4.ui.mechanics.rings.fire",
  water: "l5r4.ui.mechanics.rings.water",
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * Skill name localization keys.
 * 
 * Maps all L5R4 skill identifiers to i18n keys. Skills represent learned competencies
 * and are categorized into four subtypes based on social standing in Rokugani society:
 * High Skills (courtly arts), Bugei Skills (martial arts), Merchant Skills (trade crafts),
 * and Low Skills (dishonorable practices). Skills are rolled as (Skill + Trait)k(Trait)
 * using the Roll & Keep system.
 * 
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
 * Arrow type localization keys.
 * 
 * Maps specialized arrow types to i18n keys. L5R4 includes various arrow types with
 * different tactical effects: armor-piercing (armor), flesh-cutter (flesh), humming-bulb
 * (humming), rope-cutter (rope), and willow-leaf (willow). Each type modifies damage or
 * provides special utility in ranged combat.
 * 
 * @type {Readonly<{armor: string, flesh: string, humming: string, rope: string, willow: string}>}
 */
export const ARROWS = freeze({
  armor:   "l5r4.equipment.weapons.arrows.armor",
  flesh:   "l5r4.equipment.weapons.arrows.flesh",
  humming: "l5r4.equipment.weapons.arrows.humming",
  rope:    "l5r4.equipment.weapons.arrows.rope",
  willow:  "l5r4.equipment.weapons.arrows.willow"
});

/**
 * Weapon size localization keys.
 * 
 * Maps weapon size categories to i18n keys. Weapons are classified as small (knives, tanto),
 * medium (katana, wakizashi), or large (no-dachi, tetsubo). Size affects reach, damage,
 * and usability in different combat situations.
 * 
 * @type {Readonly<{small: string, medium: string, large: string}>}
 */
export const SIZES = freeze({
  small:  "l5r4.equipment.weapons.sizes.small",
  medium: "l5r4.equipment.weapons.sizes.medium",
  large:  "l5r4.equipment.weapons.sizes.large"
});

/**
 * Five Rings localization keys (alternative export).
 * 
 * Provides an alternative export of RING_LABELS with different property ordering.
 * Maintained for backwards compatibility with existing code. Prefer RING_LABELS for
 * new implementations.
 * 
 * @type {Readonly<{fire: string, water: string, air: string, earth: string, void: string}>}
 */
export const RINGS = freeze({
  fire: RING_LABELS.fire,
  water: RING_LABELS.water,
  air: RING_LABELS.air,
  earth: RING_LABELS.earth,
  void: RING_LABELS.void
});

/**
 * Five Rings with empty option for UI dropdowns.
 * 
 * Extends RING_LABELS with an empty string key mapped to "none" for use in form
 * dropdowns and selectors where no Ring selection should be available as an option.
 * Commonly used in item sheets for effects that may or may not have Ring associations.
 * 
 * @type {Readonly<Record<string, string>>}
 */
export const RINGS_WITH_NONE = freeze({
  "": "l5r4.ui.common.none",
  ...RING_LABELS
});

/**
 * Combat stance localization keys.
 * 
 * Maps combat stances to i18n keys. Stances determine available actions and tactical
 * modifiers each round. Each stance aligns with a Ring philosophy:
 * - Attack (Water): Fluid, versatile, no action restrictions
 * - Full Attack (Fire): Aggressive, +2k1 attack / -10 Armor TN, movement bonus
 * - Defense (Air): Reactive, adds Air Ring + Defense Skill to Armor TN
 * - Full Defense (Earth): Unmoving, adds Defense/Reflexes roll to Armor TN, Complex Action
 * - Center (Void): Meditative, +1k1 to next round's action, +10 Initiative
 * 
 * Includes empty string option for "no stance" in UI selections.
 * 
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
 * Spell Ring localization keys.
 * 
 * Extends RING_LABELS with an "all" key for universal spells that can be cast using
 * any Ring. Most spells are associated with a specific Ring for casting, but universal
 * spells offer flexibility. Used in spell item sheets and spell slot management.
 * 
 * @type {Readonly<Record<string, string>>}
 */
export const SPELL_RINGS = freeze({
  ...RING_LABELS,
  all: "l5r4.ui.mechanics.rings.all"
});

/**
 * Character Trait localization keys.
 * 
 * Maps the eight core character Traits (abbreviated) to i18n keys. Traits represent
 * raw mental and physical capabilities and are organized by their Ring associations:
 * - Earth: Stamina (sta), Willpower (wil)
 * - Water: Strength (str), Perception (per)
 * - Fire: Agility (agi), Intelligence (int)
 * - Air: Reflexes (ref), Awareness (awa)
 * 
 * Traits determine kept dice in the Roll & Keep system and are used for raw ability
 * checks. Ring rank equals the lower of its two component Traits.
 * 
 * @type {Readonly<{sta: string, wil: string, str: string, per: string, ref: string, awa: string, agi: string, int: string}>}
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
 * Skill Trait options with Void Ring.
 * 
 * Extends TRAITS with the Void Ring for use in skill roll dialogs. While most skills
 * use one of the eight standard Traits, some mechanics allow Void to substitute as
 * the governing attribute. Used in skill roll UI to provide complete trait selection.
 * 
 * @type {Readonly<Record<string, string>>}
 */
export const SKILL_TRAITS = freeze({
  ...TRAITS,
  void: "l5r4.ui.mechanics.rings.void"
});

/**
 * NPC Trait localization keys.
 * 
 * Direct reference to TRAITS for NPC character sheets. NPCs use the same eight Traits
 * as player characters. This alias exists for semantic clarity in NPC-specific code
 * and maintains consistency with naming conventions.
 * 
 * @type {Readonly<{sta: string, wil: string, str: string, per: string, ref: string, awa: string, agi: string, int: string}>}
 */
export const NPC_TRAITS = TRAITS;

/**
 * Skill type category localization keys.
 * 
 * Maps skill subtype categories to i18n keys. L5R4 classifies skills into four social
 * categories based on Rokugani traditions:
 * - High: Courtly and scholarly arts (Calligraphy, Etiquette, Tea Ceremony)
 * - Bugei: Martial skills practiced by bushi (Kenjutsu, Kyujutsu, Defense)
 * - Merchant (merch): Trade and commerce skills (Commerce, Sailing, Engineering)
 * - Low: Dishonorable practices that may cause Honor loss (Stealth, Forgery, Temptation)
 * 
 * @type {Readonly<{high: string, bugei: string, merch: string, low: string}>}
 */
export const SKILL_TYPES = freeze({
  high: "l5r4.character.skillTypes.high",
  bugei: "l5r4.character.skillTypes.bugei",
  merch: "l5r4.character.skillTypes.merch",
  low: "l5r4.character.skillTypes.low"
});

/**
 * Action type localization keys.
 * 
 * Maps action timing categories to i18n keys. L5R4 combat uses three action types:
 * - Simple: Quick tasks, characters may take two per turn (moving, drawing weapon)
 * - Complex: Elaborate tasks requiring full attention, one per turn (casting spell, Full Defense)
 * - Free: Minor activities that don't disrupt other actions (speaking, dropping item)
 * 
 * Action economy follows the pattern: (One Complex + Free) OR (Two Simple + Free) per turn.
 * 
 * @type {Readonly<{simple: string, complex: string, free: string}>}
 */
export const ACTION_TYPES = freeze({
  simple: "l5r4.ui.common.simple",
  complex: "l5r4.ui.common.complex",
  free: "l5r4.ui.common.free"
});

/**
 * Kiho type localization keys.
 * 
 * Maps mystical technique categories to i18n keys. Kiho are special abilities learned
 * by monks and Brotherhood members, classified into four types:
 * - Internal: Body-enhancing techniques (improved stamina, poison resistance)
 * - Karmic: Spiritual awareness and fortune manipulation
 * - Martial: Combat-focused mystical techniques
 * - Mystic: Supernatural abilities and spirit interaction
 * 
 * @type {Readonly<{internal: string, karmic: string, martial: string, mystic: string}>}
 */
export const KIHO_TYPES = freeze({
  internal: "l5r4.magic.kiho.internal",
  karmic: "l5r4.magic.kiho.karmic",
  martial: "l5r4.magic.kiho.martial",
  mystic: "l5r4.magic.kiho.mystic"
});

/**
 * Advantage and Disadvantage type localization keys.
 * 
 * Maps advantage/disadvantage subtypes to i18n keys. These categories determine when
 * advantages can be purchased and whether they can be lost:
 * - Physical: Inherent bodily traits (Large, Quick, Missing Limb)
 * - Mental: Psychological makeup (Blackmail, Driven, Soft-Hearted)
 * - Social: Interpersonal capabilities (Allies, Nemesis, Social Position)
 * - Material: Physical possessions (Wealthy, Sacred Weapon)
 * - Spiritual: Supernatural connections (Fortune's Blessing, Cursed by Realm)
 * - Ancestor: Familial spiritual bonds (specific ancestor blessings)
 * 
 * Physical and Mental types typically cannot be purchased after character creation unless
 * GM approves extenuating circumstances.
 * 
 * @type {Readonly<{physical: string, mental: string, social: string, material: string, spiritual: string, ancestor: string}>}
 */
export const ADVANTAGE_TYPES = freeze({
  physical: "l5r4.character.advantages.physical",
  mental: "l5r4.character.advantages.mental",
  social: "l5r4.character.advantages.social",
  material: "l5r4.character.advantages.material",
  spiritual: "l5r4.character.advantages.spiritual",
  ancestor: "l5r4.character.advantages.ancestor"
});
