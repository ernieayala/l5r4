/**
 * Player Character Context Builder for ActorSheetV2
 *
 * Prepares sorted item collections for PC character sheet rendering.
 * Handles item sorting, mastery ability extraction, and user-scoped sort preference management.
 *
 * This module serves as the data organization layer between Actor documents and
 * ActorSheetV2 templates. All methods are static utilities called from the sheet's
 * `_prepareContext()` method to shape data for Handlebars templates.
 *
 * L5R4 Game Rules Implemented:
 * - **Mastery Abilities**: Extracted at ranks 3, 5, 7
 *
 * Foundry VTT Integration:
 * - Designed for ActorSheetV2 context preparation pattern (Foundry v13+)
 * - Uses Actor.items embedded collection for item lookups
 * - Integrates with user flag-based sort preferences via sorting utilities
 * - Produces plain objects suitable for Handlebars template consumption
 *
 * @module sheets/handlers/pc-context-builder
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 */

import { getSortPref, sortWithPref } from "../../utils/sorting.js";
import { toInt } from "../../utils/type-coercion.js";
import { getActiveStances } from "../../services/stance/core/helpers.js";
import { getMountedStatus } from "../../services/mounted-combat.js";
import { getSectionCollapsedMap } from "../../utils/section-state.js";

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
   * Used by both `_sortGeneric()` and `buildAdvDisList()` to maintain consistent
   * sorting behavior across advantages, disadvantages, and combined lists.
   *
   * @type {Object.<string, Function>}
   * @private
   */
  static _advDisCols = {
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
   * @returns {Object} Sorted item collections by type
   * @returns {Item[]} returns.skills - Sorted skills (formulas pre-calculated)
   * @returns {Item[]} returns.spells - Sorted spells (formulas pre-calculated)
   * @returns {Item[]} returns.advantages - Sorted advantages
   * @returns {Item[]} returns.disadvantages - Sorted disadvantages
   * @returns {Item[]} returns.items - Sorted items/commonItems
   * @returns {Item[]} returns.katas - Sorted katas
   * @returns {Item[]} returns.kihos - Sorted kihos
   * @returns {Item[]} returns.tattoos - Sorted tattoos
   * @returns {Item[]} returns.techniques - Sorted techniques
   * @returns {Item[]} returns.armors - Sorted armors
   * @returns {Item[]} returns.weapons - Sorted weapons (formulas pre-calculated)
   * @returns {Item[]} returns.bows - Sorted bows (formulas pre-calculated)
   */
  static buildSortedItems(actor, allItems) {
    const byType = t => allItems.filter(i => i.type === t);

    const skills = this._sortSkills(actor, byType("skill"));

    const spells = this._sortSpells(actor, byType("spell"));

    const advantages = this._sortGeneric(
      actor,
      byType("advantage"),
      "advantages",
      this._advDisCols
    );

    const disadvantages = this._sortGeneric(
      actor,
      byType("disadvantage"),
      "disadvantages",
      this._advDisCols
    );

    const items = this._sortGeneric(
      actor,
      allItems.filter(i => i.type === "item" || i.type === "commonItem"),
      "items",
      {
        name: it => String(it?.name ?? "")
      }
    );

    const katas = this._sortGeneric(actor, byType("kata"), "katas", {
      name: it => String(it?.name ?? ""),
      ring: it => String(it?.system?.ring ?? ""),
      mastery: it => Number(it?.system?.mastery ?? 0) || 0
    });

    const kihos = this._sortGeneric(actor, byType("kiho"), "kihos", {
      name: it => String(it?.name ?? ""),
      ring: it => String(it?.system?.ring ?? ""),
      mastery: it => Number(it?.system?.mastery ?? 0) || 0,
      type: it => String(it?.system?.type ?? "")
    });

    const tattoos = this._sortGeneric(actor, byType("tattoo"), "tattoos", {
      name: it => String(it?.name ?? "")
    });

    const techniques = this._sortGeneric(actor, byType("technique"), "techniques", {
      name: it => String(it?.name ?? "")
    });

    const armors = this._sortGeneric(actor, byType("armor"), "armors", {
      name: it => String(it?.name ?? ""),
      bonus: it => Number(it?.system?.bonus ?? 0) || 0,
      reduction: it => Number(it?.system?.reduction ?? 0) || 0,
      equipped: it => (it?.system?.equipped ? 1 : 0)
    });

    const weapons = this._sortWeapons(actor, byType("weapon"));
    const bows = this._sortWeapons(actor, byType("bow"));

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
   * Sorts skill items using user-stored preferences. Roll formulas (rollDice, rollKeep,
   * rollFormula) are pre-calculated in Actor.prepareDerivedData() - this method only sorts.
   *
   * Sorting columns:
   * - **name**: Skill name
   * - **rank**: Skill rank (0-10)
   * - **trait**: Localized trait name for display
   * - **roll**: Total rolled dice count (pre-calculated)
   * - **emphasis**: Emphasis text
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} skillItems - Array of skill items (formulas already calculated)
   * @returns {Item[]} Sorted skills
   * @private
   */
  static _sortSkills(actor, skillItems) {
    // Define sortable columns with extractor functions
    const cols = {
      name: it => String(it?.name ?? ""),
      rank: it => Number(it?.system?.rank ?? 0) || 0,
      // Trait column: Localize trait key for display sorting
      // Handles both raw keys ("sta") and i18n keys ("l5r4.mechanics.traits.sta")
      trait: it => {
        const raw = String(it?.system?.trait ?? "").toLowerCase();
        const key =
          raw && /^l5r4\.mechanics\.traits\./.test(raw)
            ? raw
            : raw
              ? `l5r4.ui.mechanics.traits.${raw}`
              : "";
        const loc = key ? game.i18n?.localize?.(key) : "";
        return String(loc && loc !== key ? loc : it?.system?.trait ?? "");
      },
      roll: it => Number(it?.system?.rollDice ?? 0) || 0,
      emphasis: it => {
        const trained = Array.isArray(it?.system?.trainedEmphases) ? it.system.trainedEmphases : [];
        return trained.join(", ");
      }
    };

    const pref = getSortPref(actor.id, "skills", Object.keys(cols), "name");
    return sortWithPref(skillItems, cols, pref, game.i18n?.lang);
  }

  /**
   * Sort spells by user preference.
   *
   * Sorts spell items using user-stored preferences. Casting formulas (castRoll, castKeep,
   * castFormula, castTN) are pre-calculated in Actor.prepareDerivedData() - this method only sorts.
   *
   * Sorting columns:
   * - **name**: Spell name
   * - **ring**: Element (air, earth, fire, water, void)
   * - **mastery**: Mastery Level (1-6)
   * - **range**: Range text
   * - **aoe**: Area of Effect text
   * - **duration**: Duration text
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} spellItems - Array of spell items (formulas already calculated)
   * @returns {Item[]} Sorted spells
   * @private
   */
  static _sortSpells(actor, spellItems) {
    // Define sortable columns with extractor functions
    const cols = {
      name: it => String(it?.name ?? ""),
      ring: it => String(it?.system?.ring ?? ""),
      mastery: it => Number(it?.system?.mastery ?? 0) || 0,
      range: it => String(it?.system?.range ?? ""),
      aoe: it => String(it?.system?.aoe ?? ""),
      duration: it => String(it?.system?.duration ?? "")
    };

    const pref = getSortPref(actor.id, "spells", Object.keys(cols), "name");
    return sortWithPref(spellItems, cols, pref, game.i18n?.lang);
  }

  /**
   * Sort weapons by user preference.
   *
   * Sorts weapon items using user-stored preferences. Attack and damage formulas
   * (attackFormula, attackFormulaWithStance, damageFormula) are pre-calculated in
   * Actor.prepareDerivedData() - this method only sorts.
   *
   * Sorting columns:
   * - **name**: Weapon name
   * - **damage**: Composite value (damageRoll × 10 + damageKeep) for numeric sorting
   * - **size**: Weapon size (S, M, L)
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} weaponItems - Array of weapon items (formulas already calculated)
   * @returns {Item[]} Sorted weapons
   * @private
   */
  static _sortWeapons(actor, weaponItems) {
    const cols = {
      name: it => String(it?.name ?? ""),
      damage: it => toInt(it?.system?.damageRoll) * 10 + toInt(it?.system?.damageKeep),
      size: it => String(it?.system?.size ?? "")
    };

    const pref = getSortPref(actor.id, "weapons", Object.keys(cols), "name");
    return sortWithPref(weaponItems, cols, pref, game.i18n?.lang);
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
   * - Armors
   *
   * @param {Actor} actor - L5R4 Actor document (used for preference scope)
   * @param {Item[]} items - Array of items to sort
   * @param {string} scope - Sort preference scope key (e.g., "advantages")
   * @param {Object.<string, Function>} cols - Column extractor functions for sorting
   * @returns {Item[]} Sorted items
   * @private
   */
  static _sortGeneric(actor, items, scope, cols) {
    const pref = getSortPref(actor.id, scope, Object.keys(cols), "name");
    return sortWithPref(items, cols, pref, game.i18n?.lang);
  }

  /**
   * Extract mastery abilities from skill list for display.
   *
   * L5R4 Mastery Ability Rules:
   * Skills grant Mastery Abilities at ranks 3, 5, and 7. These are special benefits
   * that enhance skill usage (e.g., "You may make ranged attacks while mounted").
   *
   * This method scans all skills and extracts unlocked masteries (where character's
   * rank meets or exceeds the mastery rank). Returns a flat list suitable for
   * display in a "Mastery Abilities" section of the character sheet.
   *
   * Note: Rank 9 masteries are not checked as they are rare and not present in
   * most skill definitions. Rank 10 mastery (free raise) is automatic and not
   * displayed via this list.
   *
   * @param {Item[]} skills - Array of skill items (must have system.rank and system.masteryX properties)
   * @returns {Object[]} Array of unlocked mastery ability objects
   * @returns {string} returns[]._id - Source skill item ID
   * @returns {string} returns[].name - Display name (e.g., "Kenjutsu 5")
   * @returns {string} returns[].mastery - Mastery ability description text
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
   * Uses the shared `_advDisCols` extractors with an additional type discriminator.
   *
   * @param {Actor} actor - L5R4 Actor document (used for preference scope)
   * @param {Item[]} advantages - Array of advantage items
   * @param {Item[]} disadvantages - Array of disadvantage items
   * @returns {Item[]} Combined and sorted list of advantages and disadvantages
   */
  static buildAdvDisList(actor, advantages, disadvantages) {
    const list = [...advantages, ...disadvantages];
    const cols = {
      ...this._advDisCols,
      item: it => String(it.type ?? "")
    };

    const pref = getSortPref(actor.id, "advDis", Object.keys(cols), "name");
    return sortWithPref(list, cols, pref, game.i18n?.lang);
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
   * @returns {Object} Bio items by type
   * @returns {Item|null} returns.clan - Clan item or null
   * @returns {Item|null} returns.family - Family item or null
   * @returns {Item|null} returns.school - School item or null
   */
  static extractBioItems(allItems) {
    const byType = t => allItems.filter(i => i.type === t);
    return {
      clan: byType("clan")[0] ?? null,
      family: byType("family")[0] ?? null,
      school: byType("school")[0] ?? null
    };
  }

  /**
   * Extract stance and mounted status for context.
   *
   * Provides current combat stance and mounted state for template rendering.
   * Used to display stance effects, mounted combat bonuses, and UI state.
   *
   * **Stances:**
   * - Attack: Standard offensive stance
   * - Defense: +10 Armor TN, -10 to all rolls
   * - Full Attack: +2k1 attack/damage, -10 Armor TN
   * - Full Defense: Double Reflexes for Armor TN
   * - Center: +1k1 to next roll
   *
   * **Mounted Status:**
   * - Provides Free Raise on attack rolls per core rules
   * - Affects movement and positioning
   *
   * @param {Actor} actor - L5R4 Actor document
   * @returns {Object} Stance and mounted status
   * @returns {string} returns.currentStance - Current stance identifier (empty if none)
   * @returns {Object} returns.mountedStatus - Mounted combat status from service
   */
  static extractStanceAndMounted(actor) {
    const activeStances = getActiveStances(actor);
    const currentStance = activeStances[0] || "";
    const mountedStatus = getMountedStatus(actor);

    return {
      currentStance,
      mountedStatus
    };
  }

  /**
   * Extract effective traits with wound penalties.
   *
   * Retrieves the effective trait values (base + family bonus - wound penalties)
   * from the actor's derived data. These values are pre-calculated in
   * Actor.prepareDerivedData() and used throughout the sheet for display.
   *
   * **Wound Penalties:**
   * Per core rules (Combat_and_Wounds.md):
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
   * @returns {Object} Effective trait values (sta, wil, str, per, ref, awa, agi, int)
   */
  static extractEffectiveTraits(actor) {
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
   * @returns {Object} Map of section keys to collapsed boolean state
   */
  static extractCollapsedSections(actorId) {
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
