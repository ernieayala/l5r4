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
 * - **Localization Mappings**: Key mappings for rings, traits, and skills
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
 * @version 1.1.0
 * @see {@link https://foundryvtt.com/api/|Foundry VTT v13 API Documentation}
 */

const freeze = Object.freeze;

/**
 * System identifier constant for L5R4 system.
 * @constant {string}
 */
export const SYS_ID = "l5r4";

/**
 * Root path for the L5R4 system directory.
 * @constant {string}
 */
export const ROOT = `systems/${SYS_ID}`;

/**
 * Common path constants for system directories.
 * Used throughout the system for consistent path resolution.
 * @constant {Readonly<{templates: string, assets: string, icons: string}>}
 */
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
 * Build a template path consistently from a relative path.
 * Provides centralized template path resolution for consistent file access
 * across the system. Automatically prepends the system templates directory.
 * 
 * @param {string} relPath - Relative path within the templates directory
 * @returns {string} Full template path ready for Foundry template loading
 * @example
 * // Get path for actor sheet template
 * const actorTemplate = TEMPLATE("actor/pc-sheet.hbs");
 * // Returns: "systems/l5r4/templates/actor/pc-sheet.hbs"
 */
export const TEMPLATE = (relPath) => `${PATHS.templates}/${relPath}`;

/**
 * Chat template paths for messages displayed in the chat log.
 * Provides consistent template resolution for chat cards and roll results.
 * Each template is optimized for specific chat message types.
 * @constant {Readonly<{simpleRoll: string, weaponCard: string, fullDefenseRoll: string}>}
 */
export const CHAT_TEMPLATES = freeze({
  simpleRoll:     TEMPLATE("chat/simple-roll.hbs"),
  weaponCard:     TEMPLATE("chat/weapon-chat.hbs"),
  fullDefenseRoll: TEMPLATE("chat/full-defense-roll.hbs")
});

/**
 * Dialog template paths for modal forms and popups.
 * Provides consistent template resolution for user interaction dialogs.
 * Each template handles specific user input scenarios with proper validation.
 * @constant {Readonly<{rollModifiers: string, unifiedItemCreate: string}>}
 */
export const DIALOG_TEMPLATES = freeze({
  rollModifiers:     TEMPLATE("dialogs/roll-modifiers-dialog.hbs"),
  unifiedItemCreate: TEMPLATE("dialogs/unified-item-create-dialog.hbs")
});

/* ---------------------------------- */
/* Game Rules Constants                */
/* ---------------------------------- */

/**
 * Arrow type localization keys for UI select elements.
 * Maps arrow type identifiers to their display labels for consistent
 * presentation across weapon sheets and combat dialogs.
 * @constant {Readonly<Record<string, string>>}
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
 * Maps size identifiers to their display labels for weapon categorization
 * and mechanical effects in combat calculations.
 * @constant {Readonly<Record<string, string>>}
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
 * Contains all localization keys and constants needed by templates.
 * @type {object}
 */
const _l5r4 = {
  arrows: ARROWS,
  sizes: SIZES,

  rings: freeze({
    fire: "l5r4.ui.mechanics.rings.fire",
    water: "l5r4.ui.mechanics.rings.water",
    air: "l5r4.ui.mechanics.rings.air",
    earth: "l5r4.ui.mechanics.rings.earth",
    void: "l5r4.ui.mechanics.rings.void"
  }),

  /** Ring options with None option for technique affinity/deficiency */
  ringsWithNone: freeze({
    "": "l5r4.ui.common.none",
    fire: "l5r4.ui.mechanics.rings.fire",
    water: "l5r4.ui.mechanics.rings.water",
    air: "l5r4.ui.mechanics.rings.air",
    earth: "l5r4.ui.mechanics.rings.earth",
    void: "l5r4.ui.mechanics.rings.void"
  }),

  /** Ring options available for spell casting */
  spellRings: freeze({
    fire: "l5r4.ui.mechanics.rings.fire",
    water: "l5r4.ui.mechanics.rings.water",
    air: "l5r4.ui.mechanics.rings.air",
    earth: "l5r4.ui.mechanics.rings.earth",
    void: "l5r4.ui.mechanics.rings.void",
    all: "l5r4.ui.mechanics.rings.all"
  }),

  /** PC trait localization keys */
  traits: freeze({
    sta: "l5r4.ui.mechanics.traits.sta",
    wil: "l5r4.ui.mechanics.traits.wil",
    str: "l5r4.ui.mechanics.traits.str",
    per: "l5r4.ui.mechanics.traits.per",
    ref: "l5r4.ui.mechanics.traits.ref",
    awa: "l5r4.ui.mechanics.traits.awa",
    agi: "l5r4.ui.mechanics.traits.agi",
    int: "l5r4.ui.mechanics.traits.int"
  }),

  /** NPC trait localization keys (same as PC for consistency) */
  npcTraits: freeze({
    sta: "l5r4.ui.mechanics.traits.sta",
    wil: "l5r4.ui.mechanics.traits.wil",
    str: "l5r4.ui.mechanics.traits.str",
    per: "l5r4.ui.mechanics.traits.per",
    ref: "l5r4.ui.mechanics.traits.ref",
    awa: "l5r4.ui.mechanics.traits.awa",
    agi: "l5r4.ui.mechanics.traits.agi",
    int: "l5r4.ui.mechanics.traits.int"
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
    { id: "attackStance",      name: "l5r4.ui.mechanics.stances.attack",       img: iconPath("attackstance.png") },
    { id: "fullAttackStance",  name: "l5r4.ui.mechanics.stances.fullAttack",   img: iconPath("fullattackstance.png") },
    { id: "defenseStance",     name: "l5r4.ui.mechanics.stances.defense",      img: iconPath("defensestance.png") },
    { id: "fullDefenseStance", name: "l5r4.ui.mechanics.stances.fullDefense",  img: iconPath("fulldefensestance.png") },
    { id: "centerStance",      name: "l5r4.ui.mechanics.stances.center",       img: iconPath("centerstance.png") },

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
 * Primary configuration export used throughout the L5R4 system.
 * Provides immutable access to all system constants and localization keys.
 * @type {Readonly<typeof _l5r4>}
 * @example
 * // Access ring labels in templates
 * const airLabel = l5r4.rings.air; // "l5r4.ui.mechanics.rings.air"
 * 
 * // Use in Handlebars templates
 * // {{localize @root.config.rings.fire}}
 */
export const l5r4 = freeze(_l5r4);

/**
 * Structured config alias providing named helpers alongside the legacy object.
 * Combines system constants with the legacy config for comprehensive access.
 * Provides both modern structured access and backward compatibility.
 * @type {Readonly<{SYS_ID: string, ROOT: string, PATHS: object, TEMPLATE: function, CHAT_TEMPLATES: object}>}
 * @example
 * // Modern structured access
 * const templatePath = L5R4.TEMPLATE("actor/pc-sheet.hbs");
 * const chatTemplate = L5R4.CHAT_TEMPLATES.simpleRoll;
 * 
 * // Legacy compatibility access
 * const ringLabel = L5R4.rings.fire;
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
 * Maintains compatibility with existing imports that expect the config object
 * as the default export. New code should prefer named imports.
 * @default
 */
export default l5r4;
