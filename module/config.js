/**
 * @fileoverview L5R4 System Configuration Module for Foundry VTT v13+
 * 
 * Provides centralized configuration data and utilities for the L5R4 system,
 * serving as the single source of truth for system constants, icon management,
 * localization mappings, and template definitions used throughout the codebase.
 * 
 * **Core Responsibilities:**
 * - **System Constants**: SYS_ID, path constants, and template definitions
 * - **Icon Management**: Path resolution and aliasing system for asset organization
 * - **Localization Mappings**: Key mappings for rings, traits, skills, and emphases
 * - **Chat Templates**: Template definitions for chat cards and dialogs
 * - **Game Rules Constants**: Arrow modifiers, sizes, status effects, and mechanical data
 * - **Legacy Compatibility**: Config object structure for template backward compatibility
 * 
 * **Design Principles:**
 * - **Pure Data Module**: No side effects on import, safe to use anywhere
 * - **Centralized Configuration**: Single source of truth for system constants
 * - **Future-Proof Structure**: Icon aliasing system enables asset reorganization
 * - **Template Integration**: Seamless integration with Handlebars template system
 * - **Performance Optimized**: Frozen objects prevent accidental mutations
 * 
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/|Foundry VTT v13 API Documentation}
 */

const freeze = Object.freeze;

/**
 * System identifier and common path constants.
 * Used throughout the system for consistent path resolution.
 */
export const SYS_ID = "l5r4";
export const ROOT = `systems/${SYS_ID}`;
export const PATHS = freeze({
  templates: `${ROOT}/templates`,
  assets: `${ROOT}/assets`,
  icons: `${ROOT}/assets/icons`
});

/**
 * Icon path alias system for future-proofing asset organization.
 *
 * Allows reorganizing icons into semantic subfolders (e.g., rings/, skills/, status/)
 * without breaking existing code or stored references that assume a flat directory.
 *
 * Usage: call iconPath() with either a bare filename ("air.png") or an existing
 * system-relative path. The resolver returns a stable path under the current structure.
 *
 * Currently inert - returns original paths when no alias is defined.
 * This maintains backward compatibility while enabling future reorganization.
 */

/**
 * Icon filename aliases mapping bare filenames to subfolder paths.
 * @type {Readonly<Record<string, string>>} filename -> relative subpath under PATHS.icons
 */
export const ICON_FILENAME_ALIASES = freeze({
  // No aliases right now — icons live flat under assets/icons.
});

/**
 * Resolve an icon filename or system path to the current canonical path.
 * - Leaves external/core Foundry icons like "icons/svg/..." unchanged
 * - Accepts bare filenames or full system paths
 * - Returns aliased path if mapping exists, otherwise returns normalized path
 * 
 * @param {string} nameOrPath - Icon filename or path to resolve
 * @returns {string} Canonical icon path
 */
export function iconPath(nameOrPath) {
  const n = nameOrPath ?? "";
  if (!n) { return n; }

  // Do not touch Foundry core icons or external URLs / data URIs
  if (n.startsWith("icons/") || n.startsWith("http") || n.startsWith("data:")) {
    return n;
  }

  const prefix = `${PATHS.icons}/`;
  // Normalize to filename within the icons directory
  const file = n.startsWith(prefix) ? n.slice(prefix.length) : n;
  const mapped = ICON_FILENAME_ALIASES[file];

  // If we have an alias, rewrite to subfolder; else keep original structure
  return mapped ? `${prefix}${mapped}` : (n.startsWith(prefix) ? n : `${prefix}${file}`);
}

/**
 * Centralized i18n label keys for UI and chat consistency.
 * These are passive maps providing a single source of truth for localization keys.
 * Do not localize here - pass keys through game.i18n.localize/format in consumers.
 * 
 * @see https://foundryvtt.com/api/classes/client.i18n.Localization.html
 * @typedef {{ air: string, earth: string, fire: string, water: string, void: string }} RingLabelMap
 */

/** @type {RingLabelMap} */
export const RING_LABELS = freeze({
  air: "l5r4.mechanics.rings.air",
  earth: "l5r4.mechanics.rings.earth",
  fire: "l5r4.mechanics.rings.fire",
  water: "l5r4.mechanics.rings.water",
  void: "l5r4.mechanics.rings.void"
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
  craft: "l5r4.character.skills.names.craft",
  courtier: "l5r4.character.skills.names.courtier",
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
 * Emphasis label keys for skill specializations.
 * Maps emphasis identifiers to localization keys for consistent presentation
 * across sheets and chat. Maintained in alphabetical order.
 * @type {Readonly<Record<string, string>>}
 */
export const EMPHASIS_LABELS = freeze({
  ambush: "l5r4.world.emphases.ambush",
  anatomy: "l5r4.world.emphases.anatomy",
  antidotes: "l5r4.world.emphases.antidotes",
  architecture: "l5r4.world.emphases.architecture",
  armorsmithing: "l5r4.world.emphases.armorsmithing",
  artwork: "l5r4.world.emphases.artwork",
  assessment: "l5r4.world.emphases.assessment",
  astrology: "l5r4.world.emphases.astrology",
  biwa: "l5r4.world.emphases.biwa",
  blacksmithing: "l5r4.world.emphases.blacksmithing",
  bonsai: "l5r4.world.emphases.bonsai",
  bowyer: "l5r4.world.emphases.bowyer",
  brewing: "l5r4.world.emphases.brewing",
  bureaucracy: "l5r4.world.emphases.bureaucracy",
  bushido: "l5r4.world.emphases.bushido",
  carpentry: "l5r4.world.emphases.carpentry",
  cartography: "l5r4.world.emphases.cartography",
  cipher: "l5r4.world.emphases.cipher",
  clan: "l5r4.world.emphases.clan",
  climbing: "l5r4.world.emphases.climbing",
  conceal: "l5r4.world.emphases.conceal",
  construction: "l5r4.world.emphases.construction",
  conversation: "l5r4.world.emphases.conversation",
  cooking: "l5r4.world.emphases.cooking",
  courtesy: "l5r4.world.emphases.courtesy",
  dance: "l5r4.world.emphases.dance",
  daiTsuchi: "l5r4.world.emphases.daiTsuchi",
  deceit: "l5r4.world.emphases.deceit",
  disease: "l5r4.world.emphases.disease",
  documents: "l5r4.world.emphases.documents",
  dogs: "l5r4.world.emphases.dogs",
  elements: "l5r4.world.emphases.elements",
  escape: "l5r4.world.emphases.escape",
  falcons: "l5r4.world.emphases.falcons",
  farming: "l5r4.world.emphases.farming",
  fasting: "l5r4.world.emphases.fasting",
  fishing: "l5r4.world.emphases.fishing",
  flute: "l5r4.world.emphases.flute",
  fortunesAndWinds: "l5r4.world.emphases.fortunesAndWinds",
  gaijinCulture: "l5r4.world.emphases.gaijinCulture",
  gaijinRidingHorse: "l5r4.world.emphases.gaijinRidingHorse",
  gardening: "l5r4.world.emphases.gardening",
  ghosts: "l5r4.world.emphases.ghosts",
  go: "l5r4.world.emphases.go",
  grappling: "l5r4.world.emphases.grappling",
  greatClan: "l5r4.world.emphases.greatClan",
  herbalism: "l5r4.world.emphases.herbalism",
  heraldry: "l5r4.world.emphases.heraldry",
  highRokugani: "l5r4.world.emphases.highRokugani",
  history: "l5r4.world.emphases.history",
  honesty: "l5r4.world.emphases.honesty",
  horses: "l5r4.world.emphases.horses",
  ikebana: "l5r4.world.emphases.ikebana",
  improvisedWeapons: "l5r4.world.emphases.improvisedWeapons",
  importune: "l5r4.world.emphases.importune",
  interrogation: "l5r4.world.emphases.interrogation",
  katana: "l5r4.world.emphases.katana",
  kawaru: "l5r4.world.emphases.kawaru",
  kemari: "l5r4.world.emphases.kemari",
  knotWork: "l5r4.world.emphases.knotWork",
  kusarigama: "l5r4.world.emphases.kusarigama",
  kyoketsuShogi: "l5r4.world.emphases.kyoketsuShogi",
  letters: "l5r4.world.emphases.letters",
  manipulation: "l5r4.world.emphases.manipulation",
  manrikigusari: "l5r4.world.emphases.manrikigusari",
  martialArts: "l5r4.world.emphases.martialArts",
  masonry: "l5r4.world.emphases.masonry",
  masakari: "l5r4.world.emphases.masakari",
  mining: "l5r4.world.emphases.mining",
  navigation: "l5r4.world.emphases.navigation",
  nature: "l5r4.world.emphases.nature",
  ninjaTo: "l5r4.world.emphases.ninjaTo",
  noDachi: "l5r4.world.emphases.noDachi",
  nonHumans: "l5r4.world.emphases.nonHumans",
  nonhumanCulture: "l5r4.world.emphases.nonhumanCulture",
  omens: "l5r4.world.emphases.omens",
  ono: "l5r4.world.emphases.ono",
  oratory: "l5r4.world.emphases.oratory",
  painting: "l5r4.world.emphases.painting",
  parangu: "l5r4.world.emphases.parangu",
  personalSeals: "l5r4.world.emphases.personalSeals",
  pickPocket: "l5r4.world.emphases.pickPocket",
  poetry: "l5r4.world.emphases.poetry",
  poison: "l5r4.world.emphases.poison",
  pottery: "l5r4.world.emphases.pottery",
  prestidigitation: "l5r4.world.emphases.prestidigitation",
  puppeteer: "l5r4.world.emphases.puppeteer",
  rhetoric: "l5r4.world.emphases.rhetoric",
  rokuganiPony: "l5r4.world.emphases.rokuganiPony",
  running: "l5r4.world.emphases.running",
  sadane: "l5r4.world.emphases.sadane",
  samisen: "l5r4.world.emphases.samisen",
  scimitar: "l5r4.world.emphases.scimitar",
  search: "l5r4.world.emphases.search",
  shadowing: "l5r4.world.emphases.shadowing",
  shadowlands: "l5r4.world.emphases.shadowlands",
  shipbuilding: "l5r4.world.emphases.shipbuilding",
  shogi: "l5r4.world.emphases.shogi",
  shugenja: "l5r4.world.emphases.shugenja",
  siege: "l5r4.world.emphases.siege",
  song: "l5r4.world.emphases.song",
  spiritRealms: "l5r4.world.emphases.spiritRealms",
  spellCasting: "l5r4.world.emphases.spellCasting",
  spellResearch: "l5r4.world.emphases.spellResearch",
  storytelling: "l5r4.world.emphases.storytelling",
  survival: "l5r4.world.emphases.survival",
  swimming: "l5r4.world.emphases.swimming",
  tailoring: "l5r4.world.emphases.tailoring",
  tattooing: "l5r4.world.emphases.tattooing",
  tetsubo: "l5r4.world.emphases.tetsubo",
  theology: "l5r4.world.emphases.theology",
  throwing: "l5r4.world.emphases.throwing",
  tracking: "l5r4.world.emphases.tracking",
  trailblazing: "l5r4.world.emphases.trailblazing",
  utakuSteed: "l5r4.world.emphases.utakuSteed",
  voidRecovery: "l5r4.world.emphases.voidRecovery",
  wakizashi: "l5r4.world.emphases.wakizashi",
  war: "l5r4.world.emphases.war",
  weaponsmithing: "l5r4.world.emphases.weaponsmithing",
  weaving: "l5r4.world.emphases.weaving"
});

/**
 * Build a template path consistently from a relative path.
 * @param {string} relPath - Relative path within the templates directory
 * @returns {string} Full template path
 */
export const TEMPLATE = (relPath) => `${PATHS.templates}/${relPath}`;

/**
 * Centralized chat template paths used by dialogs and chat cards.
 * Provides consistent template resolution for chat functionality.
 */
export const CHAT_TEMPLATES = freeze({
  simpleRoll:     TEMPLATE("chat/simple-roll.hbs"),
  rollModifiers:  TEMPLATE("chat/roll-modifiers-dialog.hbs"),
  weaponCard:     TEMPLATE("chat/weapon-chat.hbs"),
  fullDefenseRoll: TEMPLATE("chat/full-defense-roll.hbs"),

  // item creation dialogs
  createSpell:    TEMPLATE("chat/create-spell-dialog.hbs"),
  createAdv:      TEMPLATE("chat/create-advantage-dialog.hbs"),
  createEquip:    TEMPLATE("chat/create-equipment-dialog.hbs")
});

/* ---------------------------------- */
/* Game Rules Constants                */
/* ---------------------------------- */

/**
 * Arrow type localization keys for UI select elements.
 * Maps arrow type identifiers to their display labels.
 */
const ARROWS = freeze({
  armor:   "l5r4.equipment.weapons.arrows.armor",
  flesh:   "l5r4.equipment.weapons.arrows.flesh",
  humming: "l5r4.equipment.weapons.arrows.humming",
  rope:    "l5r4.equipment.weapons.arrows.rope",
  willow:  "l5r4.equipment.weapons.arrows.willow"
});

/**
 * Weapon size localization keys for UI select elements.
 * Maps size identifiers to their display labels.
 */
const SIZES = freeze({
  small:  "l5r4.equipment.weapons.sizes.small",
  medium: "l5r4.equipment.weapons.sizes.medium",
  large:  "l5r4.equipment.weapons.sizes.large"
});

/**
 * Arrow damage modifiers (roll, keep dice) keyed by arrow type.
 * Used for calculating damage bonuses based on arrow selection.
 * @type {Readonly<Record<string, {r: number, k: number}>>}
 */
export const ARROW_MODS = freeze({
  armor:   { r: 1, k: 1 },
  flesh:   { r: 2, k: 3 },
  humming: { r: 0, k: 1 },
  rope:    { r: 1, k: 1 },
  willow:  { r: 2, k: 2 }
});

/**
 * Legacy-shaped config object for backward compatibility.
 * Used throughout the system and templates. Maintains the structure
 * expected by existing code while providing centralized configuration.
 */
const _l5r4 = {
  arrows: ARROWS,
  sizes: SIZES,

  rings: freeze({
    fire: "l5r4.mechanics.rings.fire",
    water: "l5r4.mechanics.rings.water",
    air: "l5r4.mechanics.rings.air",
    earth: "l5r4.mechanics.rings.earth",
    void: "l5r4.mechanics.rings.void"
  }),

  /** Ring options with None option for technique affinity/deficiency */
  ringsWithNone: freeze({
    "": "l5r4.ui.common.none",
    fire: "l5r4.mechanics.rings.fire",
    water: "l5r4.mechanics.rings.water",
    air: "l5r4.mechanics.rings.air",
    earth: "l5r4.mechanics.rings.earth",
    void: "l5r4.mechanics.rings.void"
  }),

  /** Ring options available for spell casting */
  spellRings: freeze({
    fire: "l5r4.mechanics.rings.fire",
    water: "l5r4.mechanics.rings.water",
    air: "l5r4.mechanics.rings.air",
    earth: "l5r4.mechanics.rings.earth",
    void: "l5r4.mechanics.rings.void",
    all: "l5r4.mechanics.rings.all"
  }),

  /** PC trait localization keys */
  traits: freeze({
    sta: "l5r4.mechanics.traits.sta",
    wil: "l5r4.mechanics.traits.wil",
    str: "l5r4.mechanics.traits.str",
    per: "l5r4.mechanics.traits.per",
    ref: "l5r4.mechanics.traits.ref",
    awa: "l5r4.mechanics.traits.awa",
    agi: "l5r4.mechanics.traits.agi",
    int: "l5r4.mechanics.traits.int"
  }),

  /** NPC trait localization keys (same as PC for consistency) */
  npcTraits: freeze({
    sta: "l5r4.mechanics.traits.sta",
    wil: "l5r4.mechanics.traits.wil",
    str: "l5r4.mechanics.traits.str",
    per: "l5r4.mechanics.traits.per",
    ref: "l5r4.mechanics.traits.ref",
    awa: "l5r4.mechanics.traits.awa",
    agi: "l5r4.mechanics.traits.agi",
    int: "l5r4.mechanics.traits.int"
  }),

  /** Skill category/family localization keys */
  skillTypes: freeze({
    high: "l5r4.character.skillTypes.high",
    bugei: "l5r4.character.skillTypes.bugei",
    merch: "l5r4.character.skillTypes.merch",
    low: "l5r4.character.skillTypes.low"
  }),

  /** Action economy type localization keys */
  actionTypes: freeze({
    simple: "l5r4.ui.common.simple",
    complex: "l5r4.ui.common.complex",
    free: "l5r4.ui.common.free"
  }),

  /** Kiho category localization keys */
  kihoTypes: freeze({
    internal: "l5r4.magic.kiho.internal",
    karmic: "l5r4.magic.kiho.karmic",
    martial: "l5r4.magic.kiho.martial",
    mystic: "l5r4.magic.kiho.mystic"
  }),

  /** Advantage category localization keys */
  advantageTypes: freeze({
    physical: "l5r4.character.advantages.physical",
    mental: "l5r4.character.advantages.mental",
    social: "l5r4.character.advantages.social",
    material: "l5r4.character.advantages.material",
    spiritual: "l5r4.character.advantages.spiritual",
    ancestor: "l5r4.character.advantages.ancestor"
  }),

  /** Number of wound levels by NPC rank (1-8) */
  npcNumberWoundLvls: freeze({ 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8 }),

  /** Registered status effects for the system */
  statusEffects: freeze([
    // Stances
    { id: "attackStance",      name: "EFFECT.attackStance",      img: iconPath("attackstance.png") },
    { id: "fullAttackStance",  name: "EFFECT.fullAttackStance",  img: iconPath("fullattackstance.png") },
    { id: "defenseStance",     name: "EFFECT.defenseStance",     img: iconPath("defensestance.png") },
    { id: "fullDefenseStance", name: "EFFECT.fullDefenseStance", img: iconPath("fulldefensestance.png") },
    { id: "centerStance",      name: "EFFECT.centerStance",      img: iconPath("centerstance.png") },

    // Generic conditions
    { id: "blinded",   name: "EFFECT.blinded",   img: "icons/svg/blind.svg" },
    { id: "dazed",     name: "EFFECT.dazed",     img: "icons/svg/stoned.svg" },
    { id: "dead",      name: "EFFECT.dead",      img: "icons/svg/skull.svg" },
    { id: "entangled", name: "EFFECT.entangled", img: "icons/svg/net.svg" },
    { id: "fasting",   name: "EFFECT.fasting",   img: "icons/svg/silenced.svg" },
    { id: "fatigued",  name: "EFFECT.fatigued",  img: "icons/svg/sleep.svg" },
    { id: "grappled",  name: "EFFECT.grappled",  img: iconPath("grapple.png") },
    { id: "mounted",   name: "EFFECT.mounted",   img: iconPath("mounted.png") },
    { id: "prone",     name: "EFFECT.prone",     img: "icons/svg/falling.svg" },
    { id: "stunned",   name: "EFFECT.stunned",   img: "icons/svg/daze.svg" }
  ])
};

/**
 * Frozen legacy config object for system-wide use.
 * @type {Readonly<typeof _l5r4>}
 */
export const l5r4 = freeze(_l5r4);

/**
 * Structured config alias providing named helpers alongside the legacy object.
 * Combines system constants with the legacy config for comprehensive access.
 * @type {Readonly<{SYS_ID: string, ROOT: string, PATHS: object, TEMPLATE: function, CHAT_TEMPLATES: object}>}
 */
export const L5R4 = freeze({
  SYS_ID,
  ROOT,
  PATHS,
  TEMPLATE,
  CHAT_TEMPLATES,
  ...l5r4
});

/**
 * Default export of the legacy config object for backward compatibility.
 */
export default l5r4;
