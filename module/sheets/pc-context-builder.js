/**
 * @module sheets/pc-context-builder
 * @description Shapes a PC's items for the character sheet's `_prepareContext()`: sorts each item type by the
 * user's stored sort preference, lists the Mastery Abilities a skill's rank unlocks (ranks 3, 5, 7), and reads the
 * bio items, stance, effective Traits, and collapsed sections. It returns plain objects for the Handlebars
 * templates and never changes a document.
 */

import { SORT_KEYS } from "../config/sort-keys.js";
import { applySortPref } from "../utils/sorting.js";
import { toInt } from "../utils/type-coercion.js";
import { getActiveStance } from "../utils/stances.js";
import { getSortPref } from "../services/sort-preferences.js";
import { getSectionCollapsedMap } from "../services/section-state.js";

/**
 * Static utility class for building sorted item contexts for PC sheets.
 *
 * All methods are static and stateless - they accept Actor and Item data as parameters
 * and return sorted data structures suitable for template rendering. This class never
 * mutates Actor or Item documents and NEVER performs calculations (per architecture rules).
 *
 * Design Pattern: Static utility class (no instantiation required)
 *
 * @class
 */
export class PcContextBuilder {
  /**
   * Column extractors for Advantage/Disadvantage sorting.
   *
   * Defines sortable columns for advantages and disadvantages:
   * - **name**: Item name
   * - **type**: Localized type (Physical, Mental, Social, Spiritual, Material)
   * - **cost**: Experience point cost (positive for advantages, negative for disadvantages)
   *
   * Used by both `#getSortedItems()` and `buildAdvDisList()` to maintain consistent
   * sorting behavior across advantages, disadvantages, and combined lists.
   *
   * @type {{[key: string]: Function}}
   */
  static #advDisCols = {
    name: it => String(it?.name ?? ""),
    type: it =>
      String(game.i18n?.localize?.(`l5r4.character.advantages.${it?.system?.type ?? ""}`) ?? ""),
    cost: it => Number(it?.system?.cost ?? 0) || 0
  };

  /**
   * Build sorted item collections for character sheet display.
   *
   * Primary context builder method that processes all Actor items into sorted,
   * categorized collections. Each item type is sorted according to user preferences
   * stored in Foundry user flags.
   *
   * **NO CALCULATIONS PERFORMED:**
   * All roll formulas (skills, spells, weapons) are pre-calculated in
   * Actor.prepareDerivedData() (Documents layer). This method only sorts items.
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} allItems - Array of all items from actor.items (any types)
   * @returns {{[type: string]: Item[]}} Sorted item collections by type: skills, spells, advantages,
   *   disadvantages, items (items and commonItems), katas, kihos, tattoos, techniques, armors, weapons, and bows;
   *   skills, spells, weapons, and bows carry their pre-calculated formulas
   */
  static buildSortedItems(actor, allItems) {
    const getItemsOfType = t => allItems.filter(i => i.type === t);

    const skills = this.#getSortedSkills(actor, getItemsOfType("skill"));

    const spells = this.#getSortedSpells(actor, getItemsOfType("spell"));

    const advantages = this.#getSortedItems(actor, getItemsOfType("advantage"), {
      scope: "advantages",
      cols: this.#advDisCols
    });

    const disadvantages = this.#getSortedItems(actor, getItemsOfType("disadvantage"), {
      scope: "disadvantages",
      cols: this.#advDisCols
    });

    const items = this.#getSortedItems(
      actor,
      allItems.filter(i => i.type === "item" || i.type === "commonItem"),
      {
        scope: "items",
        cols: {
          name: it => String(it?.name ?? "")
        }
      }
    );

    const katas = this.#getSortedItems(actor, getItemsOfType("kata"), {
      scope: "katas",
      cols: {
        name: it => String(it?.name ?? ""),
        ring: it => String(it?.system?.ring ?? ""),
        mastery: it => Number(it?.system?.mastery ?? 0) || 0
      }
    });

    const kihos = this.#getSortedItems(actor, getItemsOfType("kiho"), {
      scope: "kihos",
      cols: {
        name: it => String(it?.name ?? ""),
        ring: it => String(it?.system?.ring ?? ""),
        mastery: it => Number(it?.system?.mastery ?? 0) || 0,
        type: it => String(it?.system?.type ?? "")
      }
    });

    const tattoos = this.#getSortedItems(actor, getItemsOfType("tattoo"), {
      scope: "tattoos",
      cols: {
        name: it => String(it?.name ?? "")
      }
    });

    const techniques = this.#getSortedItems(actor, getItemsOfType("technique"), {
      scope: "techniques",
      cols: {
        name: it => String(it?.name ?? "")
      }
    });

    const armors = this.#getSortedItems(actor, getItemsOfType("armor"), {
      scope: "armors",
      cols: {
        name: it => String(it?.name ?? ""),
        bonus: it => Number(it?.system?.bonus ?? 0) || 0,
        reduction: it => Number(it?.system?.reduction ?? 0) || 0,
        equipped: it => (it?.system?.equipped ? 1 : 0)
      }
    });

    const weapons = this.#getSortedWeapons(actor, getItemsOfType("weapon"));
    const bows = this.#getSortedWeapons(actor, getItemsOfType("bow"));

    return {
      skills,
      spells,
      advantages,
      disadvantages,
      items,
      katas,
      kihos,
      tattoos,
      techniques,
      armors,
      weapons,
      bows
    };
  }

  /**
   * Sort skills by user preference.
   *
   * Sorts skill items using user-stored preferences. Roll formulas (roll, keep,
   * rollFormula) are pre-calculated in Actor.prepareDerivedData() - this method only sorts.
   *
   * Sorting columns:
   * - **name**: Skill name
   * - **rank**: Skill rank (0-10)
   * - **trait**: Localized trait name for display
   * - **roll**: Total rolled dice count (pre-calculated)
   * - **emphasis**: Emphasis text.
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} skillItems - Array of skill items (formulas already calculated)
   * @returns {Item[]} Sorted skills
   */
  static #getSortedSkills(actor, skillItems) {
    // Define sortable columns with extractor functions
    const cols = {
      name: it => String(it?.name ?? ""),
      rank: it => Number(it?.system?.rank ?? 0) || 0,
      // Trait column: Localize trait key for display sorting
      // Handles both raw keys ("sta") and i18n keys ("l5r4.ui.mechanics.traits.sta")
      trait: it => {
        const raw = String(it?.system?.trait ?? "").toLowerCase();
        const key =
          raw && /^l5r4\.mechanics\.traits\./.test(raw)
            ? raw
            : raw
              ? `l5r4.ui.mechanics.traits.${raw}`
              : "";
        const loc = key ? game.i18n?.localize?.(key) : "";
        return String(loc && loc !== key ? loc : (it?.system?.trait ?? ""));
      },
      roll: it => Number(it?.system?.roll ?? 0) || 0,
      emphasis: it => {
        const trained = Array.isArray(it?.system?.trainedEmphases) ? it.system.trainedEmphases : [];
        return trained.join(", ");
      }
    };

    const pref = getSortPref(actor.id, "skills", {
      allowedKeys: SORT_KEYS.skills,
      defaultKey: "name"
    });
    return applySortPref(skillItems, cols, { pref, locale: game.i18n?.lang });
  }

  /**
   * Sort spells by user preference.
   *
   * Sorts spell items using user-stored preferences. Casting formulas (castRoll, castKeep,
   * castFormula, castTn) are pre-calculated in Actor.prepareDerivedData() - this method only sorts.
   *
   * Sorting columns:
   * - **name**: Spell name
   * - **ring**: Element (air, earth, fire, water, void)
   * - **mastery**: Mastery Level (1-6).
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} spellItems - Array of spell items (formulas already calculated)
   * @returns {Item[]} Sorted spells
   */
  static #getSortedSpells(actor, spellItems) {
    // Define sortable columns with extractor functions
    const cols = {
      name: it => String(it?.name ?? ""),
      ring: it => String(it?.system?.ring ?? ""),
      mastery: it => Number(it?.system?.mastery ?? 0) || 0
    };

    const pref = getSortPref(actor.id, "spells", {
      allowedKeys: SORT_KEYS.spells,
      defaultKey: "name"
    });
    return applySortPref(spellItems, cols, { pref, locale: game.i18n?.lang });
  }

  /**
   * Sort weapons by user preference.
   *
   * Sorts weapon items using user-stored preferences. Attack and damage formulas
   * (attackFormula, damageFormula) are pre-calculated in
   * Actor.prepareDerivedData() - this method only sorts.
   *
   * Sorting columns:
   * - **name**: Weapon name
   * - **damage**: Composite value (damageRoll × 10 + damageKeep) for numeric sorting.
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} weaponItems - Array of weapon items (formulas already calculated)
   * @returns {Item[]} Sorted weapons
   */
  static #getSortedWeapons(actor, weaponItems) {
    const cols = {
      name: it => String(it?.name ?? ""),
      damage: it => toInt(it?.system?.damageRoll) * 10 + toInt(it?.system?.damageKeep)
    };

    const pref = getSortPref(actor.id, "weapons", {
      allowedKeys: SORT_KEYS.weapons,
      defaultKey: "name"
    });
    return applySortPref(weaponItems, cols, { pref, locale: game.i18n?.lang });
  }

  /**
   * Generic item sorting with user preference.
   *
   * Sorts any item collection by user-stored preferences from Foundry user flags.
   * Pure sorting based on provided column extractors - no calculations performed.
   *
   * Used for item types that don't need roll formulas:
   * - Advantages/Disadvantages
   * - Items/CommonItems
   * - Katas
   * - Kihos
   * - Tattoos
   * - Techniques
   * - Armors.
   *
   * @param {Actor} actor - L5R4 Actor document (used for preference scope)
   * @param {Item[]} items - Array of items to sort
   * @param {object} sort
   * @param {string} sort.scope - Sort preference scope key (e.g., "advantages")
   * @param {{[key: string]: Function}} sort.cols - Column extractor functions for sorting
   * @returns {Item[]} Sorted items
   */
  static #getSortedItems(actor, items, { scope, cols }) {
    const pref = getSortPref(actor.id, scope, {
      allowedKeys: SORT_KEYS[scope],
      defaultKey: "name"
    });
    return applySortPref(items, cols, { pref, locale: game.i18n?.lang });
  }

  /**
   * Extract mastery abilities from skill list for display.
   *
   * L5R4 Mastery Ability Rules:
   * Skills grant Mastery Abilities at ranks 3, 5, and 7. These are special benefits
   * that enhance skill usage.
   *
   * This method scans all skills and extracts unlocked masteries (where character's
   * rank meets or exceeds the mastery rank). Returns a flat list suitable for
   * display in a "Mastery Abilities" section of the character sheet.
   *
   * Note: Rank 9 masteries are not checked as they are rare and not present in
   * most skill definitions. The Rank 10 Mastery (a Free Raise) is a rule the skill carries
   * (module/data/item/skill-data.js ownedRules) and is not displayed via this list.
   * game-rules/58_skills_overview.md, p.133
   *
   * @param {Item[]} skills - Array of skill items (must have system.rank and system.masteryX properties)
   * @returns {{_id: string, name: string, mastery: string}[]} The unlocked mastery abilities: the source skill
   *   item ID, the display name (e.g., "Kenjutsu 5"), and the mastery ability text
   */
  static buildMasteryList(skills) {
    const masteries = [];

    // Scan all skills for unlocked masteries at ranks 3, 5, 7
    for (const s of skills) {
      const r = toInt(s.system?.rank);
      if (s.system?.mastery3 && r >= 3) {
        masteries.push({ _id: s.id, name: `${s.name} 3`, mastery: s.system.mastery3 });
      }
      if (s.system?.mastery5 && r >= 5) {
        masteries.push({ _id: s.id, name: `${s.name} 5`, mastery: s.system.mastery5 });
      }
      if (s.system?.mastery7 && r >= 7) {
        masteries.push({ _id: s.id, name: `${s.name} 7`, mastery: s.system.mastery7 });
      }
    }

    return masteries;
  }

  /**
   * Build combined and sorted advantage/disadvantage list.
   *
   * Merges advantages and disadvantages into a single sorted list for unified
   * display. Adds an "item" column extractor to distinguish between the two types
   * ("advantage" vs "disadvantage") for filtering or styling in templates.
   *
   * Uses the shared `#advDisCols` extractors with an additional type discriminator.
   *
   * @param {Actor} actor - L5R4 Actor document (used for preference scope)
   * @param {Item[]} advantages - Array of advantage items
   * @param {Item[]} disadvantages - Array of disadvantage items
   * @returns {Item[]} Combined and sorted list of advantages and disadvantages
   */
  static buildAdvDisList(actor, advantages, disadvantages) {
    const list = [...advantages, ...disadvantages];
    const cols = {
      ...this.#advDisCols,
      item: it => String(it.type ?? "")
    };

    const pref = getSortPref(actor.id, "advDis", {
      allowedKeys: Object.keys(cols),
      defaultKey: "name"
    });
    return applySortPref(list, cols, { pref, locale: game.i18n?.lang });
  }

  /**
   * Extract bio items (clan, family, school) from actor items.
   *
   * Bio items define character identity and provide mechanical bonuses:
   * - **Clan**: Determines available families and clan-specific abilities
   * - **Family**: Grants +1 to one trait (e.g., Hida → Stamina +1)
   * - **School**: Defines techniques, starting skills, honor rank, and +1 trait
   *
   * Characters can only have one of each bio item type at a time.
   *
   * @param {Item[]} allItems - Array of all items from actor.items
   * @returns {{clan: Item|null, family: Item|null, school: Item|null}} Bio items by type, null where the
   *   actor has none
   */
  static getBioItems(allItems) {
    const getItemsOfType = t => allItems.filter(i => i.type === t);
    return {
      clan: getItemsOfType("clan")[0] ?? null,
      family: getItemsOfType("family")[0] ?? null,
      school: getItemsOfType("school")[0] ?? null
    };
  }

  /**
   * Extract the current combat stance for context.
   *
   * @param {Actor} actor - L5R4 Actor document
   * @returns {string} Current stance identifier (empty if none)
   */
  static getStance(actor) {
    return getActiveStance(actor.statuses);
  }

  /**
   * Extract effective traits with wound penalties.
   *
   * Retrieves the effective trait values (base + family bonus - wound penalties)
   * from the actor's derived data. These values are pre-calculated in
   * Actor.prepareDerivedData() and used throughout the sheet for display.
   *
   * **Wound Penalties:**
   * Per core rules:
   * - Nicked: +3 TN
   * - Grazed: +5 TN
   * - Hurt: +10 TN
   * - Injured: +15 TN
   * - Crippled: +20 TN
   * - Down: Cannot act (except one Simple Action per round)
   * - Out: Unconscious, dying
   *
   * Wound penalties are pre-calculated in Actor.prepareDerivedData() and
   * stored in system._derived.traitsEff or system.derived.traitsEff.
   *
   * @param {Actor} actor - L5R4 Actor document
   * @returns {object} Effective trait values (sta, wil, str, per, ref, awa, agi, int)
   */
  static getEffectiveTraits(actor) {
    const traitsEff = foundry.utils.duplicate(
      actor.system?._derived?.traitsEff ?? actor.system?.derived?.traitsEff ?? {}
    );

    if (!Object.keys(traitsEff).length) {
      console.warn(
        "L5R4",
        "traitsEff missing in actor.system._derived; check prepareDerivedData()"
      );
    }

    return traitsEff;
  }

  /**
   * Get section collapsed state map for UI persistence.
   *
   * Retrieves per-user, per-actor section collapse states from user flags.
   * Allows each user to maintain their own preferred collapsed/expanded
   * sections for each character sheet.
   *
   * @param {string} actorId - Actor document ID
   * @returns {object} Map of section keys to collapsed boolean state
   */
  static getCollapsedSections(actorId) {
    return getSectionCollapsedMap(actorId, [
      "skills",
      "weapons",
      "armors",
      "spells",
      "techniques",
      "katas",
      "kihos",
      "tattoos",
      "advantages",
      "disadvantages",
      "items",
      "bio"
    ]);
  }
}
