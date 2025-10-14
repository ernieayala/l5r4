/**
 * Player Character Context Builder for ActorSheetV2
 *
 * Prepares sorted and enriched item collections for PC character sheet rendering.
 * Handles skill roll formula calculation, weapon attack/damage formulas, mastery
 * ability extraction, and user-scoped sort preference management.
 *
 * This module serves as the data transformation layer between Actor documents and
 * ActorSheetV2 templates. All methods are static utilities called from the sheet's
 * `_prepareContext()` method to shape data for Handlebars templates.
 *
 * L5R4 Game Rules Implemented:
 * - **Skill Roll Formula**: (Skill Rank + Trait Value)k(Trait Value) with bonuses
 * - **Mastery Abilities**: Extracted at ranks 3, 5, 7 per core rules
 * - **Full Attack Stance**: +2k1 bonus to attack rolls (Fire Ring stance)
 * - **Weapon Formulas**: Attack (Skill+Trait)k(Trait), Damage (Roll)k(Keep)
 *
 * Foundry VTT Integration:
 * - Designed for ActorSheetV2 context preparation pattern (Foundry v13+)
 * - Uses Actor.items embedded collection for skill/weapon lookups
 * - Reads actor.system for traits, bonuses, stance effects
 * - Integrates with user flag-based sort preferences via sorting utilities
 * - Produces plain objects suitable for Handlebars template consumption
 *
 * @module sheets/handlers/pc-context-builder
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 */

import { getSortPref, sortWithPref } from "../../utils/sorting.js";
import { toInt } from "../../utils/type-coercion.js";
import { resolveWeaponSkillTrait, getEffectiveTrait } from "../../utils/mechanics.js";

/**
 * Static utility class for building sorted, enriched item contexts for PC sheets.
 *
 * All methods are static and stateless - they accept Actor and Item data as parameters
 * and return transformed data structures suitable for template rendering. This class
 * never mutates Actor or Item documents.
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
   * Build sorted and enriched item collections for character sheet display.
   *
   * Primary context builder method that processes all Actor items into sorted,
   * categorized collections with calculated roll formulas. Each item type is
   * sorted according to user preferences stored in Foundry user flags.
   *
   * Enrichment performed:
   * - **Skills**: Adds rollDice, rollKeep, rollFormula (includes trait + bonuses)
   * - **Weapons**: Adds attackFormula, attackFormulaWithStance, damageFormula
   * - **Bows**: Same weapon enrichment as weapons
   * - **Other types**: Sorted only, no formula enrichment
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} allItems - Array of all items from actor.items (any types)
   * @returns {Object} Sorted item collections by type
   * @returns {Item[]} returns.skills - Skills with roll formulas
   * @returns {Item[]} returns.spells - Sorted spells
   * @returns {Item[]} returns.advantages - Sorted advantages
   * @returns {Item[]} returns.disadvantages - Sorted disadvantages
   * @returns {Item[]} returns.items - Sorted items/commonItems
   * @returns {Item[]} returns.katas - Sorted katas
   * @returns {Item[]} returns.kihos - Sorted kihos
   * @returns {Item[]} returns.tattoos - Sorted tattoos
   * @returns {Item[]} returns.techniques - Sorted techniques
   * @returns {Item[]} returns.armors - Sorted armors
   * @returns {Item[]} returns.weapons - Weapons with attack/damage formulas
   * @returns {Item[]} returns.bows - Bows with attack/damage formulas
   */
  static buildSortedItems(actor, allItems) {
    const byType = t => allItems.filter(i => i.type === t);

    const skills = this._sortSkills(actor, byType("skill"));

    const spells = this._sortGeneric(actor, byType("spell"), "spells", {
      name: it => String(it?.name ?? ""),
      ring: it => String(it?.system?.ring ?? ""),
      mastery: it => Number(it?.system?.mastery ?? 0) || 0,
      range: it => String(it?.system?.range ?? ""),
      aoe: it => String(it?.system?.aoe ?? ""),
      duration: it => String(it?.system?.duration ?? "")
    });

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
   * Sort skills and calculate roll formulas.
   *
   * Enriches each skill with calculated roll formulas following L5R4 Skill Roll rules:
   * **Formula**: (Skill Rank + Trait Value)k(Trait Value)
   *
   * Calculation process:
   * 1. Get effective trait value (includes wound penalties via `getEffectiveTrait()`)
   * 2. Get skill rank from skill.system.rank
   * 3. Apply bonuses from actor.system.bonuses.skill and bonuses.trait
   * 4. Calculate rollDice = trait + rank + roll bonuses
   * 5. Calculate rollKeep = trait + keep bonuses
   * 6. Prevent negative values with Math.max(0, ...)
   *
   * Bonuses structure:
   * - `actor.system.bonuses.skill[skillName.toLowerCase()].roll` - Extra rolled dice
   * - `actor.system.bonuses.skill[skillName.toLowerCase()].keep` - Extra kept dice
   * - `actor.system.bonuses.trait[traitKey].roll` - Extra rolled dice from trait bonuses
   * - `actor.system.bonuses.trait[traitKey].keep` - Extra kept dice from trait bonuses
   *
   * Sorts by user preference, with column extractors for:
   * - **name**: Skill name
   * - **rank**: Skill rank (0-10)
   * - **trait**: Localized trait name for display
   * - **roll**: Total rolled dice count
   * - **emphasis**: Emphasis text
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} skillItems - Array of skill items
   * @returns {Item[]} Sorted skills with rollDice, rollKeep, rollFormula properties added
   * @private
   */
  static _sortSkills(actor, skillItems) {
    // Enrich each skill with calculated roll formulas
    for (const skill of skillItems) {
      const traitKey = String(skill.system?.trait ?? "").toLowerCase();
      const traitEff = getEffectiveTrait(actor, traitKey); // Includes wound penalties
      const rank = toInt(skill.system?.rank);

      // Extract bonuses from actor.system.bonuses (can come from advantages, techniques, etc.)
      const bb = actor.system?.bonuses;
      const kSkill = String(skill.name).toLowerCase?.();
      const bSkill = (bb?.skill && bb.skill[kSkill]) || {};
      const bTrait = (bb?.trait && bb.trait[traitKey]) || {};
      const rollBonus = toInt(bSkill.roll) + toInt(bTrait.roll); // Extra rolled dice
      const keepBonus = toInt(bSkill.keep) + toInt(bTrait.keep); // Extra kept dice

      // L5R4 Skill Roll: (Skill + Trait)k(Trait), with bonuses applied
      skill.system.rollDice = Math.max(0, traitEff + rank + rollBonus);
      skill.system.rollKeep = Math.max(0, traitEff + keepBonus);
      skill.system.rollFormula = `${skill.system.rollDice}k${skill.system.rollKeep}`;
    }

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
      emphasis: it => String(it?.system?.emphasis ?? "")
    };

    const pref = getSortPref(actor.id, "skills", Object.keys(cols), "name");
    return sortWithPref(skillItems, cols, pref, game.i18n?.lang);
  }

  /**
   * Sort weapons and calculate attack/damage formulas.
   *
   * Enriches each weapon with calculated attack and damage roll formulas:
   * - **attackFormula**: Base attack roll (Skill + Trait)k(Trait)
   * - **attackFormulaWithStance**: Attack roll including Full Attack stance bonus
   * - **damageFormula**: Weapon base damage XkY from weapon.system
   * - **damageFormulaWithStance**: Currently same as damageFormula (reserved for future stance effects)
   *
   * L5R4 Full Attack Stance:
   * Characters in Full Attack stance gain +2k1 to attack rolls per core rules.
   * This is detected via `actor.system._stanceEffects.fullAttack` flag set by
   * the stance management system.
   *
   * Sorting columns:
   * - **name**: Weapon name
   * - **damage**: Composite value (damageRoll × 10 + damageKeep) for numeric sorting
   * - **size**: Weapon size (S, M, L)
   *
   * @param {Actor} actor - L5R4 Actor document
   * @param {Item[]} weaponItems - Array of weapon items
   * @returns {Item[]} Sorted weapons with attack/damage formula properties
   * @private
   */
  static _sortWeapons(actor, weaponItems) {
    const cols = {
      name: it => String(it?.name ?? ""),
      damage: it => toInt(it?.system?.damageRoll) * 10 + toInt(it?.system?.damageKeep),
      size: it => String(it?.system?.size ?? "")
    };

    const pref = getSortPref(actor.id, "weapons", Object.keys(cols), "name");

    const withFormulas = weaponItems.map(weapon => {
      // Resolve skill and trait for attack roll (Skill + Trait)k(Trait)
      const weaponSkill = resolveWeaponSkillTrait(actor, weapon);
      weapon.attackFormula = `${weaponSkill.rollBonus}k${weaponSkill.keepBonus}`;

      // Apply Full Attack stance bonus: +2k1 to attack rolls (Fire Ring stance)
      if (actor.system._stanceEffects?.fullAttack) {
        const stanceRollBonus = weaponSkill.rollBonus + 2; // +2 rolled dice
        const stanceKeepBonus = weaponSkill.keepBonus + 1; // +1 kept die
        weapon.attackFormulaWithStance = `${stanceRollBonus}k${stanceKeepBonus}`;
      } else {
        weapon.attackFormulaWithStance = weapon.attackFormula;
      }

      const baseDamageRoll = toInt(weapon.system?.damageRoll) || 0;
      const baseDamageKeep = toInt(weapon.system?.damageKeep) || 0;
      weapon.damageFormula = `${baseDamageRoll}k${baseDamageKeep}`;
      weapon.damageFormulaWithStance = weapon.damageFormula;

      return weapon;
    });

    return sortWithPref(withFormulas, cols, pref, game.i18n?.lang);
  }

  /**
   * Generic item sorting with user preference.
   *
   * Sorts any item collection by user-stored preferences from Foundry user flags.
   * No enrichment or formula calculation - pure sorting based on provided column
   * extractors.
   *
   * Used for item types that don't need roll formulas:
   * - Spells
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
   * @param {string} scope - Sort preference scope key (e.g., "spells", "advantages")
   * @param {Object.<string, Function>} cols - Column extractor functions for sorting
   * @returns {Item[]} Sorted items (same references as input, sorted in place)
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
}
